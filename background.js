// First install: open the options page so the user can add their facts.
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("options.html?welcome=1") });
  }
});

// Content scripts can't open the options page themselves.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "openOptions") chrome.runtime.openOptionsPage();
});
