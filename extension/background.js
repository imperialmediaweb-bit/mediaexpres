// Service worker — face fetch la API-ul MediaExpres (evita CORS din content script)
// si tine contorul zilnic de capturari.

const DEFAULT_SITE = "https://mediaexpress.ro";

async function getConfig() {
  const c = await chrome.storage.local.get(["apiKey", "siteUrl", "dailyCap"]);
  return {
    apiKey: c.apiKey || "",
    siteUrl: (c.siteUrl || DEFAULT_SITE).replace(/\/+$/, ""),
    dailyCap: Number(c.dailyCap) || 25,
  };
}

function todayKey() {
  return "count_" + new Date().toISOString().slice(0, 10);
}

async function getTodayCount() {
  const k = todayKey();
  const r = await chrome.storage.local.get([k]);
  return Number(r[k]) || 0;
}

async function addToTodayCount(n) {
  const k = todayKey();
  const current = await getTodayCount();
  await chrome.storage.local.set({ [k]: current + n });
  return current + n;
}

async function apiPost(path, payload) {
  const cfg = await getConfig();
  if (!cfg.apiKey) {
    return { ok: false, error: "Lipseste cheia API. Deschide popup-ul extensiei si seteaz-o." };
  }
  try {
    const res = await fetch(cfg.siteUrl + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": cfg.apiKey,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || ("HTTP " + res.status) };
    }
    return data;
  } catch (e) {
    return { ok: false, error: "Conexiune esuata: " + String(e) };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg.type === "SAVE_PROSPECTS") {
      const result = await apiPost("/api/extension/prospects", { profiles: msg.profiles });
      if (result.ok && result.imported > 0) {
        const total = await addToTodayCount(result.imported);
        result.todayCount = total;
      } else {
        result.todayCount = await getTodayCount();
      }
      sendResponse(result);
    } else if (msg.type === "GEN_MESSAGE") {
      const result = await apiPost("/api/extension/message", msg.profile);
      sendResponse(result);
    } else if (msg.type === "GET_STATUS") {
      const cfg = await getConfig();
      sendResponse({
        ok: true,
        configured: !!cfg.apiKey,
        siteUrl: cfg.siteUrl,
        dailyCap: cfg.dailyCap,
        todayCount: await getTodayCount(),
      });
    } else {
      sendResponse({ ok: false, error: "Mesaj necunoscut" });
    }
  })();
  return true; // raspuns asincron
});
