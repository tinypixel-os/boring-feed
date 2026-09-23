# Known Facts Feed

Replaces the home feed on LinkedIn, Twitter/X, Reddit, Instagram and 9GAG with an endless scroll of facts you already know about yourself. Same scroll habit, zero novelty. On Twitter/X, every profile's timeline is replaced too (the profile header stays).

## Install
1. Open `chrome://extensions` and enable Developer mode.
2. Click **Load unpacked** and select this folder.
3. Click the extension's **Options** and fill in your facts, then Save.
4. Visit a supported feed page.

## How it works
The native feed container is hidden (not removed) and a generated feed is inserted in its place. Site-specific selectors and routes live in `sites.js`; each site's post template lives in `cards.js` and is styled in `feed.css` to match that site's own posts. Likes, votes and bookmarks only toggle locally. If a site changes its markup and the feed stops being replaced, update that site's `feed` selector list.

## Add a site
Add an entry to `KFF_SITES` in `sites.js`, a renderer in `cards.js` (sites without one fall back to the X layout), plus a `host_permissions` and `content_scripts.matches` entry in `manifest.json`.
