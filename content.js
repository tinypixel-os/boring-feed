(() => {
  // Hostnames never change within a page, so a page on no supported site
  // stops here and pays nothing.
  const site = kffFindSite(location.hostname);
  if (!site) return;

  const HIDE = "kff-hidden";
  const BATCH = 6;
  let settings = null;
  let order = [];
  let pos = 0;
  let selfHandle = null;
  let selfRead = false; // selfHandle has been read from this page's DOM
  let feedEl = null;
  let hiddenRoot = null;
  let scrollObserver = null;
  let lastPath = null;

  const load = () =>
    new Promise((resolve) =>
      chrome.storage.sync.get(
        { enabled: true, disabledSites: {}, disabledProfiles: {}, shuffle: false, facts: [] },
        resolve
      )
    );

  function shuffled(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function nextFact() {
    if (pos >= order.length) {
      order = settings.shuffle ? shuffled(settings.facts) : settings.facts.slice();
      pos = 0;
    }
    const i = pos++;
    return { fact: order[i], i };
  }

  // Body background first, then <html> (YouTube paints the root, not body).
  function detectTheme() {
    for (const el of [document.body, document.documentElement]) {
      const m = getComputedStyle(el).backgroundColor.match(/\d+(\.\d+)?/g);
      if (m && m.length >= 3 && !(m.length === 4 && Number(m[3]) === 0)) {
        const [r, g, b] = m.map(Number);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110 ? "dark" : "light";
      }
    }
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  // The site's hide selectors, as one rule each so a selector the browser
  // rejects doesn't take the others down with it.
  function syncHide(on) {
    let style = document.getElementById("kff-hide");
    if (!on || !site.hide) {
      style?.remove();
      return;
    }
    if (style) return;
    style = document.createElement("style");
    style.id = "kff-hide";
    style.textContent = site.hide.map((sel) => `${sel} { display: none !important; }`).join("\n");
    document.documentElement.append(style);
  }

  let redirecting = false;
  function redirect() {
    for (const [pattern, to] of site.redirects || []) {
      if (!redirecting && pattern.test(location.pathname)) {
        redirecting = true;
        location.replace(location.pathname.replace(pattern, to));
        return true;
      }
    }
    return false;
  }

  const profilesOn = () => !settings.disabledProfiles[site.id];

  const addBatch = (feed, sentinel) => {
    for (let i = 0; i < BATCH; i++)
      feed.insertBefore(KFF_CARDS.render(site.id, nextFact()), sentinel);
  };

  // Events stop here so the host page never sees them.
  function onClick(e) {
    e.stopPropagation();
    const btn = e.target.closest("button");
    if (btn) {
      e.preventDefault();
      KFF_CARDS.press(btn);
    }
  }

  // Instagram: double-tap the image to like it.
  function onDblClick(e) {
    e.stopPropagation();
    const media = e.target.closest("[data-dbl-like]");
    if (!media) return;
    const like = media.closest(".kff-post").querySelector(".kff-ig-like");
    if (like && !like.classList.contains("kff-on")) KFF_CARDS.press(like);
    media.classList.remove("kff-burst");
    void media.offsetWidth; // restart the animation
    media.classList.add("kff-burst");
  }

  // First paint: fill the viewport at once so the takeover looks complete.
  function fillInitial(feed, sentinel) {
    let added = 0;
    do {
      addBatch(feed, sentinel);
      added++;
    } while (
      added < 20 &&
      sentinel.getBoundingClientRect().top < feed.getBoundingClientRect().bottom
    );
  }

  // Later batches: show a spinner for a beat, like a real feed fetching more.
  const LOAD_DELAY = 700;
  function loadMore(feed, sentinel) {
    if (sentinel.classList.contains("kff-loading")) return;
    sentinel.classList.add("kff-loading");
    setTimeout(() => {
      if (!sentinel.isConnected) return;
      addBatch(feed, sentinel);
      sentinel.classList.remove("kff-loading");
      // Tall screens: the sentinel may still be in view, and the observer
      // won't fire again unless it leaves and re-enters.
      if (sentinel.getBoundingClientRect().top < feed.getBoundingClientRect().bottom) {
        loadMore(feed, sentinel);
      }
    }, LOAD_DELAY);
  }

  // Full-page cover shown from document_start until our feed has taken over,
  // so the native feed never flashes. A failsafe removes it if we can't inject.
  const LOADER_TIMEOUT = 4000;
  let loaderTimer = null;
  let gaveUpPath = null;

  function showLoader() {
    if (document.getElementById("kff-loader") || gaveUpPath === location.pathname) return;
    const el = document.createElement("div");
    el.id = "kff-loader";
    const spinner = document.createElement("div");
    spinner.className = "kff-spinner";
    el.append(spinner);
    document.documentElement.append(el);
    loaderTimer = setTimeout(() => {
      gaveUpPath = location.pathname;
      hideLoader();
    }, LOADER_TIMEOUT);
  }

  function hideLoader() {
    clearTimeout(loaderTimer);
    document.getElementById("kff-loader")?.remove();
  }

  // Our feed is in the page, right before the native feed it hides.
  const installed = () =>
    feedEl !== null &&
    feedEl.isConnected &&
    feedEl.nextElementSibling === hiddenRoot &&
    hiddenRoot.classList.contains(HIDE);

  function teardown() {
    if (scrollObserver) {
      scrollObserver.disconnect();
      scrollObserver = null;
    }
    feedEl?.remove();
    document.getElementById("kff-feed")?.remove();
    document.querySelectorAll("." + HIDE).forEach((n) => n.classList.remove(HIDE));
    feedEl = hiddenRoot = null;
  }

  function findRoot(selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.id !== "kff-feed" && el.parentNode) return el;
    }
    return null;
  }

  // The signed-in user's handle, read from the site's own profile link and
  // cached locally so it's known before the page renders next time.
  const selfKey = "selfHandle:" + site.id;
  const needSelf = () => !selfRead && site.profile && profilesOn();

  function detectSelf() {
    const href = document.querySelector(site.profile.self)?.getAttribute("href");
    const m = href && href.match(/^\/([^/?#]+)/);
    if (!m) return;
    selfRead = true;
    const handle = m[1].toLowerCase();
    if (handle !== selfHandle) {
      selfHandle = handle;
      chrome.storage.local.set({ [selfKey]: handle });
    }
  }

  // DOM changes only matter on pages we replace: while waiting for the native
  // feed to render, and to rebuild ours if the site re-renders over it. Other
  // pages run with the observer off; navigation events bring it back.
  const domObserver = new MutationObserver(onMutate);
  let watching = false;

  function watch(on) {
    if (on === watching) return;
    watching = on;
    if (on) domObserver.observe(document.documentElement, { childList: true, subtree: true });
    else domObserver.disconnect();
  }

  function onMutate() {
    if (location.pathname === lastPath && installed() && !needSelf()) return;
    schedule();
  }

  // At most one apply() per frame, however many events ask for it. Frames run
  // before paint, so a re-rendered native feed is hidden before it shows.
  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  }

  function build(match, root) {
    teardown();
    order = [];
    pos = 0;
    hiddenRoot = root;
    const feed = feedEl = document.createElement("div");
    feed.id = "kff-feed";
    feed.dataset.site = site.id;
    feed.dataset.route = match.key;
    feed.dataset.theme = detectTheme();
    feed.addEventListener("click", onClick);
    feed.addEventListener("dblclick", onDblClick);
    root.parentNode.insertBefore(feed, root);
    root.classList.add(HIDE);

    // No facts yet: a single card pointing to the options page.
    if (!settings.facts.length) {
      feed.append(KFF_CARDS.empty());
      return;
    }

    const sentinel = document.createElement("div");
    sentinel.className = "kff-sentinel";
    const spinner = document.createElement("div");
    spinner.className = "kff-spinner";
    sentinel.append(spinner);
    feed.append(sentinel);
    fillInitial(feed, sentinel);

    scrollObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore(feed, sentinel);
      },
      { root: feed }
    );
    scrollObserver.observe(sentinel);
  }

  function apply() {
    if (!settings) return;
    lastPath = location.pathname;
    if (gaveUpPath && gaveUpPath !== lastPath) gaveUpPath = null;
    const on = settings.enabled && !settings.disabledSites[site.id];
    if (on && needSelf()) detectSelf();
    syncHide(on);
    if (on && redirect()) return;
    const match = on && kffMatchRoute(site, lastPath, selfHandle, profilesOn());
    watch(!!match);

    if (!match) {
      hideLoader();
      if (feedEl) teardown();
      return;
    }
    if (installed() && feedEl.dataset.route === match.key) {
      hideLoader();
      return;
    }
    const root = findRoot(match.feed);
    if (!root || !document.body) {
      showLoader();
      return;
    }
    build(match, root);
    hideLoader();
  }

  async function init() {
    const [local, loaded] = await Promise.all([chrome.storage.local.get(selfKey), load()]);
    selfHandle = local[selfKey] || null;
    settings = loaded;
    // Cover the page straight away if it's one we replace; apply() keeps the
    // cover until the native feed exists to be swapped out.
    apply();

    addEventListener("popstate", schedule);
    if (window.navigation) {
      // navigate fires before the URL changes; look once it has.
      navigation.addEventListener("navigate", () => setTimeout(schedule, 0));
      navigation.addEventListener("navigatesuccess", schedule);
    }
    // Backstop for pushState navigations that slip past the events above:
    // a string compare, and apply() only when the path actually changed.
    setInterval(() => {
      if (location.pathname !== lastPath) schedule();
    }, 1000);

    chrome.storage.onChanged.addListener(async (_, area) => {
      if (area !== "sync") return;
      settings = await load();
      teardown();
      apply();
    });
  }

  init();
})();
