// Popup — setari extensie (cheie API, URL site, tinta zilnica).

const $ = (id) => document.getElementById(id);

function showMsg(text, kind) {
  const m = $("msg");
  m.textContent = text;
  m.className = "msg " + (kind || "");
}

async function load() {
  const c = await chrome.storage.local.get(["apiKey", "siteUrl", "dailyCap"]);
  $("apiKey").value = c.apiKey || "";
  $("siteUrl").value = c.siteUrl || "https://mediaexpress.ro";
  $("dailyCap").value = Number(c.dailyCap) || 25;

  const key = "count_" + new Date().toISOString().slice(0, 10);
  const r = await chrome.storage.local.get([key]);
  $("todayCount").textContent = Number(r[key]) || 0;
}

$("save").addEventListener("click", async () => {
  const apiKey = $("apiKey").value.trim();
  let siteUrl = $("siteUrl").value.trim().replace(/\/+$/, "");
  const dailyCap = Math.min(200, Math.max(1, Number($("dailyCap").value) || 25));

  if (!apiKey) {
    showMsg("Cheia API e obligatorie.", "err");
    return;
  }
  if (!/^https?:\/\//.test(siteUrl)) siteUrl = "https://" + siteUrl;

  await chrome.storage.local.set({ apiKey, siteUrl, dailyCap });
  showMsg("Setari salvate.", "ok");
});

load();
