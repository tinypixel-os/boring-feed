// {v} is replaced with the user's answer to build a second-person fact.
const FIELDS = [
  { key: "name", label: "Name", tpl: "Your name is {v}" },
  { key: "age", label: "Age", tpl: "You are {v} years old" },
  { key: "school", label: "School", tpl: "You went to school at {v}" },
  { key: "father", label: "Father's name", tpl: "Your father's name is {v}" },
  { key: "mother", label: "Mother's name", tpl: "Your mother's name is {v}" },
  { key: "marital", label: "Marital status", tpl: "Your relationship status: {v}" },
  { key: "job", label: "Job status", tpl: "Your job status: {v}" },
  { key: "values", label: "Values", tpl: "You value {v}" },
  { key: "hobbies", label: "Hobbies", tpl: "Your hobby is {v}" },
  { key: "fears", label: "Fears", tpl: "You fear {v}" },
];

const $ = (id) => document.getElementById(id);

for (const f of FIELDS) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const label = document.createElement("label");
  label.htmlFor = "f-" + f.key;
  label.textContent = f.label;
  const input = document.createElement("input");
  input.type = "text";
  input.id = "f-" + f.key;
  const hint = document.createElement("span");
  hint.className = "hint";
  hint.textContent = `"${f.tpl.replace("{v}", "…")}"`;
  wrap.append(label, input, hint);
  $("fields").append(wrap);
}

function checkRow(id, text, cls = "row") {
  const label = document.createElement("label");
  label.className = cls;
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.id = id;
  label.append(cb, " " + text);
  return label;
}

for (const s of KFF_SITES) {
  $("sites").append(checkRow("s-" + s.id, s.label));
  if (s.profile) {
    $("sites").append(checkRow("p-" + s.id, "Also replace other people's profiles", "row sub"));
    // Profiles only apply while the site itself is on.
    const sync = () => ($("p-" + s.id).disabled = !$("s-" + s.id).checked);
    $("s-" + s.id).addEventListener("change", sync);
  }
}

// Profile answers and custom lines, in feed order. Shared by Save and the preview.
function buildFacts() {
  const profile = {};
  const facts = [];
  for (const f of FIELDS) {
    const v = $("f-" + f.key).value.trim();
    if (!v) continue;
    profile[f.key] = v;
    facts.push(f.tpl.replace("{v}", v));
  }
  for (const line of $("custom").value.split("\n")) {
    const t = line.trim();
    if (t) facts.push(t);
  }
  return { profile, facts };
}

// ---- Welcome (first install) -----------------------------------------------
if (new URLSearchParams(location.search).has("welcome")) {
  const labels = KFF_SITES.map((s) => s.label);
  $("welcomeSites").textContent = labels.slice(0, -1).join(", ") + " or " + labels.at(-1);
  $("welcome").hidden = false;
}

// ---- Live preview -----------------------------------------------------------
// The real card renderers and feed.css, inside a #kff-feed of our own.
const preview = { site: KFF_SITES[0].id, index: 0 };
const dark = matchMedia("(prefers-color-scheme: dark)");

for (const s of KFF_SITES) {
  const tab = document.createElement("button");
  tab.type = "button";
  tab.className = "tab";
  tab.setAttribute("role", "tab");
  tab.dataset.site = s.id;
  tab.textContent = s.label;
  tab.addEventListener("click", () => {
    preview.site = s.id;
    renderPreview();
  });
  $("tabs").append(tab);
}

function renderPreview() {
  const { facts } = buildFacts();
  preview.index = Math.min(preview.index, Math.max(facts.length - 1, 0));
  const theme = dark.matches ? "dark" : "light";
  for (const tab of $("tabs").children) tab.setAttribute("aria-selected", String(tab.dataset.site === preview.site));
  Object.assign($("stage").dataset, { site: preview.site, theme });
  const feed = $("kff-feed");
  Object.assign(feed.dataset, { site: preview.site, theme });
  feed.replaceChildren(
    facts.length
      ? KFF_CARDS.render(preview.site, { fact: facts[preview.index], i: preview.index })
      : KFF_CARDS.empty()
  );
  $("count").textContent = facts.length ? `Fact ${preview.index + 1} of ${facts.length}` : "No facts yet";
  $("prev").disabled = preview.index === 0;
  $("next").disabled = preview.index >= facts.length - 1;
}

$("prev").addEventListener("click", () => {
  preview.index--;
  renderPreview();
});
$("next").addEventListener("click", () => {
  preview.index++;
  renderPreview();
});
dark.addEventListener("change", renderPreview);

$("kff-feed").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  e.preventDefault();
  // Already on the options page: the empty card's button just starts the form.
  if (btn.hasAttribute("data-open-options")) $("f-" + FIELDS[0].key).focus();
  else KFF_CARDS.press(btn);
});

// ---- Load and save ----------------------------------------------------------
function setStatus(text, cls = "") {
  $("status").textContent = text;
  $("status").className = cls;
}

$("form").addEventListener("input", (e) => {
  setStatus("Unsaved changes");
  // Jump the preview to the fact being edited.
  const key = e.target.id.startsWith("f-") && e.target.id.slice(2);
  if (key && e.target.value.trim()) {
    preview.index = FIELDS.filter((f) => $("f-" + f.key).value.trim()).findIndex((f) => f.key === key);
  }
  renderPreview();
});

chrome.storage.sync.get(
  { profile: {}, custom: "", enabled: true, shuffle: false, disabledSites: {}, disabledProfiles: {} },
  (d) => {
    for (const f of FIELDS) $("f-" + f.key).value = d.profile[f.key] || "";
    $("custom").value = d.custom;
    $("enabled").checked = d.enabled;
    $("shuffle").checked = d.shuffle;
    for (const s of KFF_SITES) {
      $("s-" + s.id).checked = !d.disabledSites[s.id];
      if (s.profile) {
        $("p-" + s.id).checked = !d.disabledProfiles[s.id];
        $("p-" + s.id).disabled = !$("s-" + s.id).checked;
      }
    }
    renderPreview();
  }
);

$("form").addEventListener("submit", (e) => {
  e.preventDefault();
  const { profile, facts } = buildFacts();
  const disabledSites = {};
  const disabledProfiles = {};
  for (const s of KFF_SITES) {
    if (!$("s-" + s.id).checked) disabledSites[s.id] = true;
    if (s.profile && !$("p-" + s.id).checked) disabledProfiles[s.id] = true;
  }

  chrome.storage.sync.set(
    {
      profile,
      custom: $("custom").value,
      facts,
      enabled: $("enabled").checked,
      shuffle: $("shuffle").checked,
      disabledSites,
      disabledProfiles,
    },
    () => {
      // Usually the sync quota: about 8 KB per setting, so a very long
      // custom list won't fit.
      const err = chrome.runtime.lastError;
      if (err) {
        setStatus("Couldn't save: " + err.message + ". Try fewer or shorter custom facts.", "err");
        return;
      }
      setStatus("Saved", "ok");
      setTimeout(() => {
        if ($("status").textContent === "Saved") setStatus("");
      }, 1500);
    }
  );
});
