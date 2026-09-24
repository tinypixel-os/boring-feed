(() => {
  const HIDE = "kff-hidden";
  const BATCH = 6;
  const PLACEHOLDER = "Open the Boring Feed options to add facts about yourself.";
  let settings = null;
  let observer = null;
  let order = [];
  let pos = 0;

  const load = () =>
    new Promise((resolve) =>
      chrome.storage.sync.get(
        { enabled: true, disabledSites: {}, shuffle: false, facts: [] },
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
      const facts = settings.facts.length ? settings.facts : [PLACEHOLDER];
      order = settings.shuffle ? shuffled(facts) : facts.slice();
      pos = 0;
    }
    const i = pos++;
    return { fact: order[i], i };
  }

  function detectTheme() {
    const m = getComputedStyle(document.body).backgroundColor.match(/\d+(\.\d+)?/g);
    if (m && m.length >= 3 && !(m.length === 4 && Number(m[3]) === 0)) {
      const [r, g, b] = m.map(Number);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110 ? "dark" : "light";
    }
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  const addBatch = (feed, sentinel) => {
    for (let i = 0; i < BATCH; i++)
      feed.insertBefore(KFF_CARDS.render(feed.dataset.site, nextFact()), sentinel);
  };

  // Buttons only change local state (see the data-* contract in cards.js);
  // nothing is sent anywhere. Events stop here so the host page never sees them.
  function setOn(btn, on) {
    btn.classList.toggle("kff-on", on);
    btn.setAttribute("aria-pressed", String(on));
  }

  function press(btn) {
    const post = btn.closest(".kff-post");
    if (btn.hasAttribute("data-more")) {
      post.querySelector(".kff-clamp")?.classList.remove("kff-clamp");
      btn.remove();
      return;
    }
    if (!btn.hasAttribute("data-toggle")) return;
    const on = !btn.classList.contains("kff-on");
    if (on && btn.dataset.group) {
      post.querySelectorAll(`.kff-on[data-group="${btn.dataset.group}"]`).forEach((b) => setOn(b, false));
    }
    setOn(btn, on);
    for (const c of post.querySelectorAll("[data-count-of]")) {
      let n = Number(c.dataset.base);
      for (const b of post.querySelectorAll(`.kff-on[data-count="${c.dataset.countOf}"]`))
        n += Number(b.dataset.delta);
      c.textContent = KFF_CARDS.FMT[c.dataset.fmt](n);
    }
  }

  function onClick(e) {
    e.stopPropagation();
    const btn = e.target.closest("button");
    if (btn) {
      e.preventDefault();
      press(btn);
    }
  }

  // Instagram: double-tap the image to like it.
  function onDblClick(e) {
    e.stopPropagation();
    const media = e.target.closest("[data-dbl-like]");
    if (!media) return;
    const like = media.closest(".kff-post").querySelector(".kff-ig-like");
    if (like && !like.classList.contains("kff-on")) press(like);
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

  function teardown() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    document.getElementById("kff-feed")?.remove();
    document.querySelectorAll("." + HIDE).forEach((n) => n.classList.remove(HIDE));
  }

  function findRoot(selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.id !== "kff-feed" && el.parentNode) return el;
    }
    return null;
  }

  function apply() {
    if (!settings) return;
    if (gaveUpPath && gaveUpPath !== location.pathname) gaveUpPath = null;
    const site = kffFindSite(location.hostname);
    const match =
      settings.enabled &&
      site &&
      !settings.disabledSites[site.id] &&
      kffMatchRoute(site, location.pathname);
    const existing = document.getElementById("kff-feed");

    if (!match) {
      hideLoader();
      if (existing) teardown();
      return;
    }
    if (
      existing &&
      existing.dataset.site === site.id &&
      existing.dataset.route === match.key &&
      existing.nextElementSibling?.classList.contains(HIDE)
    ) {
      hideLoader();
      return;
    }

    const root = findRoot(match.feed);
    if (!root || !document.body) {
      showLoader();
      return;
    }

    teardown();
    order = [];
    pos = 0;
    const feed = document.createElement("div");
    feed.id = "kff-feed";
    feed.dataset.site = site.id;
    feed.dataset.route = match.key;
    feed.dataset.theme = detectTheme();
    feed.addEventListener("click", onClick);
    feed.addEventListener("dblclick", onDblClick);
    const sentinel = document.createElement("div");
    sentinel.className = "kff-sentinel";
    const spinner = document.createElement("div");
    spinner.className = "kff-spinner";
    sentinel.append(spinner);
    feed.append(sentinel);

    root.parentNode.insertBefore(feed, root);
    root.classList.add(HIDE);
    fillInitial(feed, sentinel);

    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore(feed, sentinel);
      },
      { root: feed }
    );
    observer.observe(sentinel);
    hideLoader();
  }

  async function init() {
    // Optimistically cover the page before settings load; apply() removes it
    // straight away if the extension is disabled here.
    const site = kffFindSite(location.hostname);
    if (site && kffMatchRoute(site, location.pathname)) showLoader();

    settings = await load();
    apply();
    new MutationObserver(apply).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    addEventListener("popstate", apply);
    if (window.navigation) navigation.addEventListener("navigate", () => setTimeout(apply, 0));
    setInterval(apply, 1500); // catches pushState navigations with no DOM churn
    chrome.storage.onChanged.addListener(async () => {
      settings = await load();
      order = [];
      pos = 0;
      teardown();
      apply();
    });
  }

  init();
})();
