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
  const label = document.createElement("label");
  label.htmlFor = "f-" + f.key;
  label.textContent = f.label;
  const hint = document.createElement("span");
  hint.className = "hint";
  hint.textContent = ` → "${f.tpl}"`;
  label.append(hint);
  const input = document.createElement("input");
  input.type = "text";
  input.id = "f-" + f.key;
  $("fields").append(label, input);
}

for (const s of KFF_SITES) {
  const label = document.createElement("label");
  label.className = "row";
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.id = "s-" + s.id;
  label.append(cb, " " + s.label);
  $("sites").append(label);
}

chrome.storage.sync.get(
  { profile: {}, custom: "", enabled: true, shuffle: false, disabledSites: {} },
  (d) => {
    for (const f of FIELDS) $("f-" + f.key).value = d.profile[f.key] || "";
    $("custom").value = d.custom;
    $("enabled").checked = d.enabled;
    $("shuffle").checked = d.shuffle;
    for (const s of KFF_SITES) $("s-" + s.id).checked = !d.disabledSites[s.id];
  }
);

$("form").addEventListener("submit", (e) => {
  e.preventDefault();
  const profile = {};
  const facts = [];
  for (const f of FIELDS) {
    const v = $("f-" + f.key).value.trim();
    if (!v) continue;
    profile[f.key] = v;
    facts.push(f.tpl.replace("{v}", v));
  }
  const custom = $("custom").value;
  for (const line of custom.split("\n")) {
    const t = line.trim();
    if (t) facts.push(t);
  }
  const disabledSites = {};
  for (const s of KFF_SITES) if (!$("s-" + s.id).checked) disabledSites[s.id] = true;

  chrome.storage.sync.set(
    {
      profile,
      custom,
      facts,
      enabled: $("enabled").checked,
      shuffle: $("shuffle").checked,
      disabledSites,
    },
    () => {
      $("status").textContent = "Saved";
      setTimeout(() => ($("status").textContent = ""), 1500);
    }
  );
});
