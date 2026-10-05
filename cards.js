// Per-site post templates, styled in feed.css to look like each site's own
// posts. A renderer takes { fact, i } and returns an element with class
// "kff-post". Names, counts, ages and images all derive from i (the fact's
// position in the cycle), so every loop through the facts looks identical.
// Images are inline SVG/CSS: no network requests and nothing for a site's CSP
// to block.
//
// Buttons are wired up in content.js through data attributes:
//   data-toggle        click toggles .kff-on
//   data-group         only one button of the group is on (up/down votes)
//   data-count/-delta  while on, adds delta to the [data-count-of] counter
//   data-fill          fill the icon while on
//   data-more          expands clamped text
//   data-open-options  opens the options page (empty-feed card)
const KFF_CARDS = (() => {
  const SVG_NS = "http://www.w3.org/2000/svg";

  const NAMES = [
    "Known Facts",
    "Yourself",
    "Captain Obvious",
    "Same As Yesterday",
    "The Mirror",
    "Old News",
    "Nothing New",
    "Déjà Vu Daily",
  ];
  const HEADLINES = [
    "Chief Obvious Officer at You, Inc.",
    "Full-time You | Part-time Overthinker",
    "Head of Things You Already Know",
    "Senior Déjà Vu Specialist",
    "Professional Mirror | Available 24/7",
    "Archivist of Old News",
    "Nothing-New Evangelist | Keynote Speaker",
    "Reliable Narrator of Your Life",
  ];
  const DEGREES = ["1st", "2nd", "3rd+"];
  const AGES = [[2, "h"], [5, "h"], [1, "d"], [3, "h"], [12, "m"], [8, "h"], [2, "d"], [45, "m"]];
  const SUBS = [
    "r/KnownFacts",
    "r/NoShitSherlock",
    "r/TodayIAlreadyKnew",
    "r/Yourself",
    "r/ShowerThoughtsYouHad",
    "r/OldNews",
    "r/mildlyfamiliar",
    "r/DejaVu",
  ];
  const IG_CAPTIONS = [
    "Reminder 📌",
    "Still true.",
    "Posting this again because it's still you.",
    "No filter needed.",
    "Throwback to every single day.",
    "You already knew ✨",
    "Same as yesterday.",
    "Mood: predictable.",
  ];
  const GAG_TITLES = [
    "Me every single day",
    "Tell me something I don't know",
    "This is so me",
    "Current mood",
    "When you already knew",
    "Instant classic",
    "Well, obviously",
    "Nobody: / Me:",
  ];
  const GAG_SECTIONS = ["Funny", "Relatable", "Wholesome", "Random"];
  const YT_TITLES = [
    "You Won't Believe This (You Will)",
    "I Tried Being Myself for 24 Hours",
    "Things You Already Know, Explained",
    "The Truth About You (Nothing New)",
    "Reacting to My Own Life Facts",
    "This Changes Nothing",
    "Watch Before It's Still True",
    "Day 1,000 of Being Me",
  ];
  const YT_AGES = ["2 hours ago", "5 hours ago", "1 day ago", "3 days ago", "1 week ago", "2 weeks ago", "1 month ago", "4 months ago"];
  const TAG_COLORS = ["#ff4500", "#0079d3", "#46d160", "#ff66ac", "#7193ff", "#ffb000", "#00a6a5", "#9147ff"];
  const QUOTE_GRADIENTS = [
    ["#833ab4", "#fd1d1d"],
    ["#4158d0", "#c850c0"],
    ["#0093e9", "#3fb8a8"],
    ["#ff6a88", "#ff9a8b"],
    ["#21d4fd", "#b721ff"],
    ["#11998e", "#38ef7d"],
  ];
  // sky top, sky bottom, sun, far hills, near hills, ground
  const SCENES = [
    ["#7ec8ff", "#dff3ff", "#fff3b0", "#6c8ebf", "#46648f", "#7fb069"],
    ["#ff9a76", "#ffe0b5", "#fff4d6", "#b5576b", "#7a3b5c", "#4d3450"],
    ["#5b5fc7", "#f7a8c4", "#ffe8a3", "#3f3d7a", "#2a2856", "#1f1d3d"],
    ["#0f1f3d", "#2b4a7a", "#f4f1de", "#1d2b45", "#101a2e", "#0a1120"],
    ["#b8e0d2", "#eac4d5", "#ffffff", "#95b8d1", "#809bce", "#d6eadf"],
    ["#ffcf8b", "#fff1d6", "#ff7b54", "#d08c60", "#a86a45", "#e8b27a"],
  ];

  // 24x24 stroke icons.
  const ICONS = {
    more: ["M5 12h.01M12 12h.01M19 12h.01"],
    moreV: ["M12 5h.01M12 12h.01M12 19h.01"],
    clock: ["M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z", "M12 6v6l4 2"],
    x: ["M18 6 6 18", "M6 6l12 12"],
    globe: [
      "M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z",
      "M2 12h20",
      "M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z",
    ],
    thumb: [
      "M7 22V11l4-9a3 3 0 0 1 3 3v4h5.7a2 2 0 0 1 2 2.3l-1.4 9a2 2 0 0 1-2 1.7z",
      "M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3",
    ],
    heart: ["M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"],
    star: ["M12 2l3 6.5 7 .9-5.2 4.8 1.4 7L12 17.8l-6.2 3.4 1.4-7L2 9.4l7-.9z"],
    comment: ["M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"],
    repost: ["M17 1l4 4-4 4", "M3 11V9a4 4 0 0 1 4-4h14", "M7 23l-4-4 4-4", "M21 13v2a4 4 0 0 1-4 4H3"],
    send: ["M22 2 11 13", "M22 2l-7 20-4-9-9-4z"],
    chart: ["M18 20V10", "M12 20V4", "M6 20v-6"],
    bookmark: ["M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"],
    share: ["M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8", "M16 6l-4-4-4 4", "M12 2v13"],
    up: ["M12 3.5l7.5 8.5H15v8H9v-8H4.5z"],
    down: ["M12 20.5 4.5 12H9V4h6v8h4.5z"],
    award: ["M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12z", "M8.2 13.9 7 23l5-3 5 3-1.2-9.1"],
  };

  const FMT = {
    full: (n) => n.toLocaleString("en-US"),
    compact: (n) =>
      n < 1000 ? String(n) : (n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, "") + "K",
  };

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs) {
      if (k === "class") el.className = attrs[k];
      else if (k === "text") el.textContent = attrs[k];
      // CSSOM, not a style attribute: page CSPs can block the latter.
      else if (k === "style") Object.assign(el.style, attrs[k]);
      else el.setAttribute(k, attrs[k]);
    }
    for (const c of kids) if (c != null && c !== false) el.append(c);
    return el;
  }

  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function icon(name, cls = "") {
    const svg = svgEl("svg", { viewBox: "0 0 24 24", class: ("kff-ico " + cls).trim(), "aria-hidden": "true" });
    for (const d of ICONS[name]) svg.append(svgEl("path", { d }));
    return svg;
  }

  // Deterministic pseudo-random integer in [lo, hi).
  function num(i, salt, lo, hi) {
    let x = Math.imul(i + 1 + salt * 7919, 2654435761) >>> 0;
    x ^= x >>> 15;
    x = Math.imul(x, 2246822519) >>> 0;
    return lo + (x % (hi - lo));
  }

  const plural = (n, word) => `${FMT.full(n)} ${word}${n === 1 ? "" : "s"}`;
  const pick = (list, i) => list[i % list.length];

  function who(i) {
    const name = pick(NAMES, i);
    const slug = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const [n, unit] = pick(AGES, i);
    return {
      name,
      handle: slug.replace(/[^a-z0-9]+/g, "_"),
      igHandle: slug.replace(/[^a-z0-9]+/g, "."),
      age: `${n}${unit}`,
      longAge: `${n} ${{ m: "min.", h: "hr.", d: n === 1 ? "day" : "days" }[unit]} ago`,
    };
  }

  function counter(name, base, fmt = "compact") {
    const el = h("span", { class: "kff-count", text: FMT[fmt](base) });
    el.dataset.countOf = name;
    el.dataset.base = base;
    el.dataset.fmt = fmt;
    return el;
  }

  function button(cls, label, kids, opt = {}) {
    const b = h("button", { class: "kff-btn " + cls, type: "button", "aria-label": label }, ...kids);
    if (opt.toggle) {
      b.dataset.toggle = "";
      b.setAttribute("aria-pressed", "false");
    }
    if (opt.count) {
      b.dataset.count = opt.count;
      b.dataset.delta = opt.delta ?? 1;
    }
    if (opt.group) b.dataset.group = opt.group;
    if (opt.fill) b.dataset.fill = "";
    return b;
  }
  const toggle = (cls, label, kids, opt) => button(cls, label, kids, { ...opt, toggle: true });

  // Cartoon avatar.
  const BGS = ["#cfe8ff", "#ffe2c9", "#d9f2d9", "#f3d6f5", "#fff1b8", "#d6d9f7", "#ffd6d6", "#d2f0ee"];
  const SKINS = ["#f6d5b8", "#e8b98d", "#c68d5f", "#8d5a3b", "#5e3b26"];
  const HAIRS = ["#2b1d14", "#6b4226", "#b5793a", "#d8b45a", "#8a8a8a", "#3a2b5c"];
  const SHIRTS = ["#3b6ea5", "#c0504d", "#4f8a5b", "#7b5aa6", "#d08a2e", "#37474f"];

  function avatar(i, cls) {
    const skin = SKINS[i % SKINS.length];
    const hair = HAIRS[(i * 5 + 1) % HAIRS.length];
    const style = (i * 3) % 5; // 0 short, 1 long, 2 bald, 3 bun, 4 curly
    const svg = svgEl("svg", { viewBox: "0 0 48 48", class: "kff-avatar-img" });
    svg.append(svgEl("rect", { width: 48, height: 48, fill: BGS[i % BGS.length] }));
    // shoulders
    svg.append(svgEl("path", { d: "M6 48c0-10 8-15 18-15s18 5 18 15z", fill: SHIRTS[(i * 7) % SHIRTS.length] }));
    // neck
    svg.append(svgEl("rect", { x: 20, y: 30, width: 8, height: 7, fill: skin }));
    // hair behind the face
    if (style === 1) svg.append(svgEl("rect", { x: 11, y: 14, width: 26, height: 26, rx: 10, fill: hair }));
    if (style === 3) svg.append(svgEl("circle", { cx: 24, cy: 7, r: 5, fill: hair }));
    if (style === 4) {
      for (const [cx, cy] of [[14, 17], [20, 11], [28, 11], [34, 17], [12, 24], [36, 24]])
        svg.append(svgEl("circle", { cx, cy, r: 6, fill: hair }));
    }
    // face
    svg.append(svgEl("ellipse", { cx: 24, cy: 24, rx: 10.5, ry: 12.5, fill: skin }));
    // hair on top
    if (style !== 2 && style !== 4) svg.append(svgEl("path", { d: "M13 22c-1-9 5-14 11-14s12 5 11 14c-3-5-8-7-11-7s-8 2-11 7z", fill: hair }));
    if (style === 4) svg.append(svgEl("path", { d: "M14 20c2-6 6-8 10-8s8 2 10 8c-4-3-7-4-10-4s-6 1-10 4z", fill: hair }));
    // eyes
    svg.append(svgEl("circle", { cx: 19.5, cy: 25, r: 1.4, fill: "#222" }));
    svg.append(svgEl("circle", { cx: 28.5, cy: 25, r: 1.4, fill: "#222" }));
    // mouth
    const mouth = i % 3 === 0 ? "M20 31q4 3.5 8 0" : i % 3 === 1 ? "M21 31.5h6" : "M20 30.5q4 4.5 8 0";
    svg.append(svgEl("path", { d: mouth, fill: "none", stroke: "#5a2a2a", "stroke-width": 1.4, "stroke-linecap": "round" }));
    return h("span", { class: "kff-avatar " + cls }, svg);
  }

  // Placeholder "photo": a landscape with sky, sun and hills.
  let gradientId = 0;
  function scene(i) {
    const [sky1, sky2, sun, far, near, ground] = pick(SCENES, i);
    const id = "kff-sky-" + gradientId++;
    const svg = svgEl("svg", { viewBox: "0 0 400 300", preserveAspectRatio: "xMidYMid slice", class: "kff-scene", "aria-hidden": "true" });
    const grad = svgEl("linearGradient", { id, x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.append(svgEl("stop", { offset: 0, "stop-color": sky1 }), svgEl("stop", { offset: 1, "stop-color": sky2 }));
    const defs = svgEl("defs", {});
    defs.append(grad);
    svg.append(defs, svgEl("rect", { width: 400, height: 300, fill: `url(#${id})` }));
    svg.append(svgEl("circle", { cx: 70 + ((i * 67) % 260), cy: 70 + ((i * 29) % 50), r: 30, fill: sun }));
    const hills = svgEl("g", i % 2 ? { transform: "translate(400 0) scale(-1 1)" } : {});
    hills.append(
      svgEl("path", { d: "M0 230 90 130l80 80 80-100 150 130v60H0z", fill: far }),
      svgEl("path", { d: "M0 260l120-80 100 70 90-80 90 80v50H0z", fill: near })
    );
    svg.append(hills, svgEl("rect", { y: 268, width: 400, height: 32, fill: ground }));
    return svg;
  }

  // Font size that keeps text laid over an image inside it.
  const fitSize = (text, sizes) =>
    sizes[Math.min(sizes.length - 1, Math.floor(text.length / 60))] + "px";

  // --- LinkedIn -------------------------------------------------------------
  function linkedin({ fact, i }) {
    const w = who(i);
    const likes = num(i, 1, 3, 480);
    const comments = num(i, 2, 0, 60);
    const reposts = num(i, 3, 0, 25);
    const long = fact.length > 200;

    const reactions = [["like", "thumb"], ["love", "heart"], ["celebrate", "star"]].slice(0, 1 + (i % 3));
    const extra = [comments && plural(comments, "comment"), reposts && plural(reposts, "repost")].filter(Boolean);

    return h(
      "article",
      { class: "kff-post kff-li" },
      h(
        "div",
        { class: "kff-li-head" },
        avatar(i, "kff-li-avatar"),
        h(
          "div",
          { class: "kff-li-who" },
          h("div", { class: "kff-li-name" }, h("b", { text: w.name }), h("span", { class: "kff-muted", text: ` • ${pick(DEGREES, i)}` })),
          h("div", { class: "kff-li-headline kff-muted", text: pick(HEADLINES, i) }),
          h("div", { class: "kff-li-time kff-muted" }, `${w.age} • `, icon("globe", "kff-ico-sm"))
        ),
        h(
          "div",
          { class: "kff-li-ctl" },
          button("kff-li-icon", "More options", [icon("more")]),
          button("kff-li-icon", "Hide post", [icon("x")])
        )
      ),
      h(
        "div",
        { class: "kff-li-text" },
        h("div", { class: long ? "kff-clamp" : "", text: fact }),
        long && h("button", { class: "kff-btn kff-more", type: "button", "data-more": "", text: "…more" })
      ),
      i % 3 === 1 && h("div", { class: "kff-li-media" }, scene(i)),
      h(
        "div",
        { class: "kff-li-social kff-muted" },
        h(
          "span",
          { class: "kff-li-reacts" },
          h("span", { class: "kff-li-bubbles" }, ...reactions.map(([k, ic]) => h("span", { class: "kff-li-bubble kff-li-" + k }, icon(ic)))),
          counter("like", likes, "full")
        ),
        h("span", { text: extra.join(" • ") })
      ),
      h(
        "div",
        { class: "kff-li-actions" },
        toggle("kff-li-act", "Like", [icon("thumb"), h("span", { text: "Like" })], { count: "like", fill: true }),
        button("kff-li-act", "Comment", [icon("comment"), h("span", { text: "Comment" })]),
        toggle("kff-li-act", "Repost", [icon("repost"), h("span", { text: "Repost" })]),
        button("kff-li-act", "Send", [icon("send"), h("span", { text: "Send" })])
      )
    );
  }

  // --- X / Twitter ----------------------------------------------------------
  function twitter({ fact, i }) {
    const w = who(i);
    return h(
      "article",
      { class: "kff-post kff-x" },
      avatar(i, "kff-x-avatar"),
      h(
        "div",
        { class: "kff-x-body" },
        h(
          "div",
          { class: "kff-x-head" },
          h("b", { class: "kff-x-name", text: w.name }),
          h("span", { class: "kff-muted kff-x-handle", text: `@${w.handle} · ${w.age}` }),
          button("kff-x-more kff-muted", "More", [icon("more")])
        ),
        h("div", { class: "kff-x-text", text: fact }),
        i % 3 === 1 && h("div", { class: "kff-x-media" }, scene(i)),
        h(
          "div",
          { class: "kff-x-actions" },
          button("kff-x-act kff-x-reply", "Reply", [icon("comment"), counter("reply", num(i, 4, 1, 90))]),
          toggle("kff-x-act kff-x-repost", "Repost", [icon("repost"), counter("repost", num(i, 5, 1, 400))], { count: "repost" }),
          toggle("kff-x-act kff-x-like", "Like", [icon("heart"), counter("like", num(i, 6, 5, 4000))], { count: "like", fill: true }),
          button("kff-x-act kff-x-views", "Views", [icon("chart"), counter("views", num(i, 7, 500, 90000))]),
          h(
            "span",
            { class: "kff-x-tail" },
            toggle("kff-x-act kff-x-save", "Bookmark", [icon("bookmark")], { fill: true }),
            button("kff-x-act kff-x-share", "Share", [icon("share")])
          )
        )
      )
    );
  }

  // --- Reddit ---------------------------------------------------------------
  function reddit({ fact, i }) {
    const w = who(i);
    const sub = pick(SUBS, i * 3);
    return h(
      "article",
      { class: "kff-post kff-rd" },
      h(
        "div",
        { class: "kff-rd-head" },
        h("span", { class: "kff-rd-icon", text: "r/", style: { background: pick(TAG_COLORS, i * 3) } }),
        h("b", { class: "kff-rd-sub", text: sub }),
        h("span", { class: "kff-muted", text: ` • ${w.longAge}` }),
        h("span", { class: "kff-spacer" }),
        button("kff-rd-join", "Join", ["Join"]),
        button("kff-rd-more", "More", [icon("more")])
      ),
      h("h3", { class: "kff-rd-title", text: fact }),
      i % 3 === 1 && h("div", { class: "kff-rd-media" }, scene(i)),
      h(
        "div",
        { class: "kff-rd-actions" },
        h(
          "span",
          { class: "kff-rd-pill kff-rd-vote" },
          toggle("kff-rd-up", "Upvote", [icon("up")], { count: "score", group: "vote", fill: true }),
          counter("score", num(i, 8, 12, 25000)),
          toggle("kff-rd-down", "Downvote", [icon("down")], { count: "score", delta: -1, group: "vote", fill: true })
        ),
        button("kff-rd-pill", "Comments", [icon("comment"), counter("comments", num(i, 9, 3, 2400))]),
        button("kff-rd-pill", "Award", [icon("award")]),
        button("kff-rd-pill", "Share", [icon("share"), h("span", { text: "Share" })])
      )
    );
  }

  // --- Instagram ------------------------------------------------------------
  function instagram({ fact, i }) {
    const w = who(i);
    const [c1, c2] = pick(QUOTE_GRADIENTS, i);
    const media = h(
      "div",
      { class: "kff-ig-media", style: { backgroundImage: `linear-gradient(135deg, ${c1}, ${c2})` } },
      h("p", { class: "kff-ig-quote", text: fact, style: { fontSize: fitSize(fact, [26, 22, 19, 16, 14]) } }),
      h("span", { class: "kff-ig-mark", text: "@" + w.igHandle }),
      icon("heart", "kff-ig-burst")
    );
    media.dataset.dblLike = "";
    return h(
      "article",
      { class: "kff-post kff-ig" },
      h(
        "div",
        { class: "kff-ig-head" },
        h("span", { class: "kff-ig-ring" }, avatar(i, "kff-ig-avatar")),
        h("b", { text: w.igHandle }),
        h("span", { class: "kff-muted", text: ` • ${w.age}` }),
        h("span", { class: "kff-spacer" }),
        button("kff-ig-more", "More options", [icon("more")])
      ),
      media,
      h(
        "div",
        { class: "kff-ig-actions" },
        toggle("kff-ig-act kff-ig-like", "Like", [icon("heart")], { count: "like", fill: true }),
        button("kff-ig-act", "Comment", [icon("comment")]),
        button("kff-ig-act", "Share", [icon("send")]),
        h("span", { class: "kff-spacer" }),
        toggle("kff-ig-act", "Save", [icon("bookmark")], { fill: true })
      ),
      h("div", { class: "kff-ig-likes" }, counter("like", num(i, 10, 40, 25000), "full"), " likes"),
      h(
        "div",
        { class: "kff-ig-caption" },
        h("b", { text: w.igHandle }),
        " " + pick(IG_CAPTIONS, i) + " ",
        h("span", { class: "kff-ig-tags", text: "#knownfacts #stilltrue" })
      ),
      h("div", { class: "kff-ig-line kff-muted", text: `View all ${num(i, 11, 2, 400)} comments` }),
      h("div", { class: "kff-ig-line kff-muted", text: "Add a comment…" })
    );
  }

  // --- 9GAG -----------------------------------------------------------------
  function ninegag({ fact, i }) {
    const w = who(i);
    const section = pick(GAG_SECTIONS, i);
    return h(
      "article",
      { class: "kff-post kff-gag" },
      h(
        "div",
        { class: "kff-gag-head" },
        h("span", { class: "kff-gag-sec", text: section[0], style: { background: pick(TAG_COLORS, i + 1) } }),
        h("b", { text: section }),
        h("span", { class: "kff-muted", text: `· ${w.age}` }),
        h("span", { class: "kff-spacer" }),
        button("kff-gag-more kff-muted", "More", [icon("more")])
      ),
      h("h2", { class: "kff-gag-title", text: pick(GAG_TITLES, i) }),
      h(
        "div",
        { class: "kff-gag-media" },
        scene(i),
        h("p", { class: "kff-gag-meme", text: fact, style: { fontSize: fitSize(fact, [32, 26, 21, 17, 14]) } })
      ),
      h(
        "div",
        { class: "kff-gag-actions" },
        h(
          "span",
          { class: "kff-gag-pill kff-gag-vote" },
          toggle("kff-gag-up", "Upvote", [icon("up")], { count: "score", group: "vote", fill: true }),
          counter("score", num(i, 12, 40, 9000)),
          toggle("kff-gag-down", "Downvote", [icon("down")], { count: "score", delta: -1, group: "vote", fill: true })
        ),
        button("kff-gag-pill", "Comments", [icon("comment"), counter("comments", num(i, 13, 3, 600))]),
        h("span", { class: "kff-spacer" }),
        button("kff-gag-pill", "Share", [icon("share"), h("span", { text: "Share" })])
      )
    );
  }

  // --- YouTube --------------------------------------------------------------
  // A home-grid video: the fact is written across the thumbnail.
  function youtube({ fact, i }) {
    const w = who(i);
    const views = num(i, 14, 300, 900000);
    const mins = num(i, 15, 1, 48);
    const secs = String(num(i, 16, 0, 60)).padStart(2, "0");
    return h(
      "article",
      { class: "kff-post kff-yt" },
      h(
        "div",
        { class: "kff-yt-thumb" },
        scene(i),
        h("p", { class: "kff-yt-caption", text: fact, style: { fontSize: fitSize(fact, [26, 21, 17, 15, 13]) } }),
        h("span", { class: "kff-yt-time", text: `${mins}:${secs}` }),
        toggle("kff-yt-later", "Watch later", [icon("clock")])
      ),
      h(
        "div",
        { class: "kff-yt-meta" },
        avatar(i, "kff-yt-avatar"),
        h(
          "div",
          { class: "kff-yt-info" },
          h("h3", { class: "kff-yt-title", text: pick(YT_TITLES, i) }),
          h("div", { class: "kff-muted", text: w.name }),
          h("div", { class: "kff-muted", text: `${FMT.compact(views)} views • ${pick(YT_AGES, i)}` })
        ),
        button("kff-yt-more", "Action menu", [icon("moreV")])
      )
    );
  }

  // --- No facts yet ---------------------------------------------------------
  // One plain card in place of the feed, the same on every site.
  function empty() {
    return h(
      "article",
      { class: "kff-post kff-empty" },
      h("b", { class: "kff-empty-title", text: "Your boring feed is empty" }),
      h("p", { class: "kff-muted", text: "Add a few facts about yourself and they'll show up here as posts." }),
      h("button", { class: "kff-btn kff-empty-btn", type: "button", "data-open-options": "", text: "Add your facts" })
    );
  }

  // Button behavior for the data-* contract above. Only local state changes;
  // nothing is sent anywhere.
  function setOn(btn, on) {
    btn.classList.toggle("kff-on", on);
    btn.setAttribute("aria-pressed", String(on));
  }

  function press(btn) {
    const post = btn.closest(".kff-post");
    if (btn.hasAttribute("data-open-options")) {
      chrome.runtime.sendMessage({ type: "openOptions" });
      return;
    }
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
      c.textContent = FMT[c.dataset.fmt](n);
    }
  }

  const RENDERERS = { linkedin, twitter, reddit, instagram, "9gag": ninegag, youtube };

  return {
    render: (siteId, item) => (RENDERERS[siteId] || twitter)(item),
    empty,
    press,
  };
})();
