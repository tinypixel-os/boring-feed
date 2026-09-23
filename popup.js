const $ = (id) => document.getElementById(id);

chrome.storage.sync.get({ enabled: true, disabledSites: {} }, async (d) => {
  $("enabled").checked = d.enabled;
  $("enabled").addEventListener("change", () =>
    chrome.storage.sync.set({ enabled: $("enabled").checked })
  );

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let site = null;
  try {
    site = tab && tab.url ? kffFindSite(new URL(tab.url).hostname) : null;
  } catch (_) {}
  if (site) {
    $("siteRow").hidden = false;
    $("siteName").textContent = site.label;
    $("site").checked = !d.disabledSites[site.id];
    $("site").addEventListener("change", () => {
      const disabledSites = { ...d.disabledSites };
      if ($("site").checked) delete disabledSites[site.id];
      else disabledSites[site.id] = true;
      d.disabledSites = disabledSites;
      chrome.storage.sync.set({ disabledSites });
    });
  }
});

$("opts").addEventListener("click", () => chrome.runtime.openOptionsPage());
