# Boring Feed

Replaces the home feed on LinkedIn, Twitter/X, Reddit, Instagram, 9GAG and YouTube with an endless scroll of facts you already know about yourself. Same scroll habit, zero novelty. On Twitter/X, other people's profile timelines are replaced too (the profile header stays); this can be turned off in the popup or options. On YouTube, the home and subscriptions pages are replaced and Shorts are removed everywhere: shelves, sidebar entry and channel tab are hidden, and Shorts links open in the normal player.

## Screenshots


| Settings | Known feed |
| ------- | -------- |
| <img width="1499" height="796" alt="Screenshot 2026-09-23 at 10 26 51 AM" src="https://github.com/user-attachments/assets/67e42331-94a9-42f4-8af5-1bb90cf89bf2" /> | <img width="1478" height="794" alt="Screenshot 2026-09-23 at 10 27 07 AM" src="https://github.com/user-attachments/assets/9051749c-2c49-4fdf-9161-c82c8b9acdfd" /> |

## Install
1. Open `chrome://extensions` and enable Developer mode.
2. Click **Load unpacked** and select this folder. The options page opens on first install.
3. Fill in your facts (the preview shows how they'll look on each site), then Save.
4. Visit a supported feed page. With no facts saved, the feed shows a single card linking back to the options.

## How it works
The native feed container is hidden (not removed) and a generated feed is inserted in its place. Site-specific selectors and routes live in `sites.js`; each site's post template lives in `cards.js` and is styled in `feed.css` to match that site's own posts. Likes, votes and bookmarks only toggle locally. If a site changes its markup and the feed stops being replaced, update that site's `feed` selector list.

## Add a site
Add an entry to `KFF_SITES` in `sites.js`, a renderer in `cards.js` (sites without one fall back to the X layout), plus a `host_permissions` and `content_scripts.matches` entry in `manifest.json`.
