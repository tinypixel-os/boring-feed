const $ = (id) => document.getElementById(id);

chrome.storage.sync.get({ enabled: true, disabledSites: {}, disabledProfiles: {} }, async (d) => {
  $("enabled").checked = d.enabled;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let site = null;
  try {
    site = tab && tab.url ? kffFindSite(new URL(tab.url).hostname) : null;
  } catch (_) {}

  // Profiles only apply while the site itself is on.
  const syncProfile = () => ($("profile").disabled = !$("enabled").checked || !$("site").checked);

  $("enabled").addEventListener("change", () => {
    chrome.storage.sync.set({ enabled: $("enabled").checked });
    syncProfile();
  });

  if (!site) return;
  $("siteRow").hidden = false;
  $("siteName").textContent = site.label;
  $("site").checked = !d.disabledSites[site.id];
  $("site").addEventListener("change", () => {
    const disabledSites = { ...d.disabledSites };
    if ($("site").checked) delete disabledSites[site.id];
    else disabledSites[site.id] = true;
    d.disabledSites = disabledSites;
    chrome.storage.sync.set({ disabledSites });
    syncProfile();
  });

  if (!site.profile) return;
  $("profileRow").hidden = false;
  $("profile").checked = !d.disabledProfiles[site.id];
  syncProfile();
  $("profile").addEventListener("change", () => {
    const disabledProfiles = { ...d.disabledProfiles };
    if ($("profile").checked) delete disabledProfiles[site.id];
    else disabledProfiles[site.id] = true;
    d.disabledProfiles = disabledProfiles;
    chrome.storage.sync.set({ disabledProfiles });
  });
});

$("opts").addEventListener("click", () => chrome.runtime.openOptionsPage());
