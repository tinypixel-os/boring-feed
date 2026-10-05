// Site adapters. To support a new site: add an entry here and a host permission
// + content_scripts match in manifest.json.
//   hosts: hostnames (subdomains match too)
//   route: tested against location.pathname; only feed pages should match
//   feed:  ordered selectors for the native feed container (first hit wins)
//   profile (optional): per-person timelines, also replaced unless the user
//     turns profiles off for the site.
//     route's first capture group is the handle; paths whose first segment is
//     in reserved are the site's own pages, not profiles. feed as above.
//     self (optional): selector for a link to the signed-in user's profile;
//     that profile is left alone.
//   pages (optional): more feed pages, as [{ route, feed }], each with its own
//     selectors (for SPAs that keep several pages in the DOM at once)
//   hide (optional): selectors hidden on every page of the site, not just feeds
//   redirects (optional): [pattern, replacement] pairs; a matching pathname is
//     sent to pathname.replace(pattern, replacement)
// All of these apply only while the extension is on for the site.
// Selectors are best guesses against each site's current DOM; adjust the
// fallback lists here when a site changes its markup.
const KFF_SITES = [
  {
    id: "linkedin",
    label: "LinkedIn",
    hosts: ["linkedin.com"],
    route: /^\/feed\/?$/,
    feed: [
      ".scaffold-finite-scroll",
      "[data-finite-scroll-hotkey-context='FEED']",
      "main",
    ],
  },
  {
    id: "twitter",
    label: "Twitter / X",
    hosts: ["x.com", "twitter.com"],
    route: /^\/home\/?$/,
    feed: [
      "[data-testid='primaryColumn'] section[role='region']",
      "[aria-label='Home timeline']",
      "[data-testid='primaryColumn']",
    ],
    profile: {
      // x.com/<handle> and its post tabs (not /status/…, /followers, etc.)
      route: /^\/([A-Za-z0-9_]{1,15})(?:\/(?:with_replies|highlights|articles|media))?\/?$/,
      reserved: [
        "home", "explore", "notifications", "messages", "search", "settings",
        "i", "compose", "login", "logout", "signup", "tos", "privacy", "jobs",
        "premium", "communities", "lists", "bookmarks", "grok", "about",
      ],
      // Sidebar "Profile" link, whose href is /<your handle>.
      self: "a[data-testid='AppTabBar_Profile_Link']",
      // Timeline only, so the profile header stays visible.
      feed: [
        "[data-testid='primaryColumn'] [aria-label^='Timeline: ']",
        "[data-testid='primaryColumn'] section[role='region']",
      ],
    },
  },
  {
    id: "reddit",
    label: "Reddit",
    hosts: ["reddit.com"],
    route: /^\/((best|hot|new|top|rising)\/?)?$|^\/r\/(popular|all)(\/(hot|new|top|rising))?\/?$/,
    feed: ["shreddit-feed", "#siteTable", "main"],
  },
  {
    id: "instagram",
    label: "Instagram",
    hosts: ["instagram.com"],
    route: /^\/$/,
    feed: ["main[role='main']", "main"],
  },
  {
    id: "9gag",
    label: "9GAG",
    hosts: ["9gag.com"],
    route: /^\/(hot|fresh|trending)?\/?$/,
    feed: ["#list-view-2", ".list-stream", ".main-wrap"],
  },
  {
    id: "youtube",
    label: "YouTube",
    hosts: ["youtube.com"],
    // Home, plus subscriptions below.
    route: /^\/$/,
    feed: [
      "ytd-browse[page-subtype='home'] ytd-rich-grid-renderer",
      "ytd-browse[page-subtype='home'] #primary",
    ],
    pages: [
      {
        route: /^\/feed\/subscriptions\/?$/,
        feed: [
          "ytd-browse[page-subtype='subscriptions'] ytd-rich-grid-renderer",
          "ytd-browse[page-subtype='subscriptions'] #primary",
        ],
      },
    ],
    // No Shorts anywhere: shelves, single Shorts in grids and lists, the
    // sidebar entry and the channel tab.
    hide: [
      "ytd-rich-shelf-renderer[is-shorts]",
      "ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])",
      "ytd-reel-shelf-renderer",
      "grid-shelf-view-model:has(ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2)",
      ":is(ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer):has(a[href^='/shorts/'])",
      ":is(ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer):has(a[title='Shorts'])",
      "ytd-mini-guide-entry-renderer[aria-label='Shorts']",
      "yt-tab-shape[tab-title='Shorts']",
    ],
    // A Short opened from a link plays in the normal player instead; the
    // Shorts feed itself goes home.
    redirects: [
      [/^\/shorts\/([\w-]+)\/?$/, "/watch?v=$1"],
      [/^\/shorts\/?$/, "/"],
    ],
  },
];

function kffFindSite(hostname) {
  return KFF_SITES.find((s) =>
    s.hosts.some((h) => hostname === h || hostname.endsWith("." + h))
  );
}

// Which native container to replace on this path, as { key, feed } where key
// identifies the route (so SPA navigation between two replaced pages rebuilds
// the feed), or null if this page should be left alone. selfHandle is the
// signed-in user's lowercased handle, if known; their own profile is skipped.
// profilesOn false leaves every profile alone.
function kffMatchRoute(site, pathname, selfHandle, profilesOn = true) {
  if (site.route.test(pathname)) return { key: "feed", feed: site.feed };
  const page = (site.pages || []).findIndex((p) => p.route.test(pathname));
  if (page >= 0) return { key: "page:" + page, feed: site.pages[page].feed };
  const m = profilesOn && site.profile && pathname.match(site.profile.route);
  const handle = m && m[1].toLowerCase();
  if (handle && handle !== selfHandle && !site.profile.reserved.includes(handle)) {
    return { key: "profile:" + handle, feed: site.profile.feed };
  }
  return null;
}
