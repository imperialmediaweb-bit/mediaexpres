// MediaExpres — content script LinkedIn.
// Capteaza profile (individual sau in masa din cautare) si genereaza mesaje AI.
// Citeste DOM-ul paginii pe care userul o navigheaza manual — nu automatizeaza navigarea.

(function () {
  "use strict";

  // ---- Helpers DOM ----------------------------------------------------------

  function txt(el) {
    return (el && el.textContent ? el.textContent : "").replace(/\s+/g, " ").trim();
  }

  function isProfilePage() {
    return /^\/in\//.test(location.pathname);
  }

  function isPeopleSearchPage() {
    return /^\/search\/results\/people/.test(location.pathname);
  }

  function cleanProfileUrl(url) {
    try {
      const u = new URL(url, location.origin);
      return (u.origin + u.pathname).replace(/\/$/, "");
    } catch {
      return url;
    }
  }

  // ---- Extragere profil individual -----------------------------------------

  function extractCurrentProfile() {
    const main = document.querySelector("main") || document;

    // Nume — primul h1 de pe profil
    const nameEl = main.querySelector("h1");
    const name = txt(nameEl);
    if (!name) return null;

    // Headline / functie — text body-medium langa h1
    let title = "";
    const headlineEl =
      main.querySelector("div.text-body-medium.break-words") ||
      main.querySelector("div.text-body-medium");
    title = txt(headlineEl);

    // Locatie — text-body-small langa headline
    let personLocation = "";
    const locEls = main.querySelectorAll("span.text-body-small.inline");
    for (const el of locEls) {
      const t = txt(el);
      if (t && !/conexiun|connection|followers|urmaritor/i.test(t)) {
        personLocation = t;
        break;
      }
    }

    // Companie — best effort: buton cu aria-label "Companie curenta" / din experienta
    let company = "";
    const curBtn =
      main.querySelector('[aria-label^="Current company"]') ||
      main.querySelector('button[aria-label*="companie" i]');
    if (curBtn) {
      company = txt(curBtn).replace(/^Current company:?/i, "").trim();
    }
    // Fallback: ghicim compania din headline ("Functie la Companie" / "Functie @ Companie")
    if (!company && title) {
      const m = title.match(/(?:\bla\b|@|\bat\b)\s+(.+)$/i);
      if (m) company = m[1].split("|")[0].trim();
    }

    return {
      name,
      title: title || undefined,
      company: company || undefined,
      location: personLocation || undefined,
      linkedinUrl: cleanProfileUrl(window.location.href),
    };
  }

  // ---- Extragere din pagina de cautare persoane ----------------------------

  function extractSearchResults() {
    const out = [];
    const seen = new Set();
    // Fiecare rezultat are un link catre /in/. Pornim de la link si urcam la card.
    const anchors = document.querySelectorAll('a[href*="/in/"]');
    for (const a of anchors) {
      const href = cleanProfileUrl(a.getAttribute("href") || "");
      if (!/\/in\//.test(href) || seen.has(href)) continue;

      // Numele vizibil e intr-un span aria-hidden in interiorul link-ului
      let name = "";
      const nameSpan = a.querySelector('span[aria-hidden="true"]');
      name = txt(nameSpan) || txt(a);
      name = name.replace(/^View\s+.+?’s\s+profile$/i, "").trim();
      if (!name || name.length < 2 || /^linkedin member$/i.test(name)) continue;

      // Cardul rezultatului — urcam pana la <li> sau containerul de entitate
      const card =
        a.closest("li") ||
        a.closest("div.entity-result") ||
        a.closest('[data-chameleon-result-urn]') ||
        a.parentElement;

      let title = "";
      let location = "";
      if (card) {
        const subtitle =
          card.querySelector(".entity-result__primary-subtitle") ||
          card.querySelector('div[class*="primary-subtitle"]');
        const secondary =
          card.querySelector(".entity-result__secondary-subtitle") ||
          card.querySelector('div[class*="secondary-subtitle"]');
        title = txt(subtitle);
        location = txt(secondary);
      }

      let company = "";
      if (title) {
        const m = title.match(/(?:\bla\b|@|\bat\b)\s+(.+)$/i);
        if (m) company = m[1].split("|")[0].trim();
      }

      seen.add(href);
      out.push({
        name,
        title: title || undefined,
        company: company || undefined,
        location: location || undefined,
        linkedinUrl: href,
      });
    }
    return out;
  }

  // ---- Comunicare cu background --------------------------------------------

  function send(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (resp) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(resp || { ok: false, error: "Fara raspuns" });
        }
      });
    });
  }

  // ---- UI: panou flotant ----------------------------------------------------

  let panel;

  function setStatus(html, kind) {
    const s = panel.querySelector(".mx-status");
    s.className = "mx-status mx-" + (kind || "info");
    s.innerHTML = html;
  }

  function buildPanel() {
    panel = document.createElement("div");
    panel.id = "mx-linkedin-panel";
    panel.innerHTML = `
      <div class="mx-head">
        <span class="mx-logo">MediaExpres</span>
        <button class="mx-close" title="Inchide">&times;</button>
      </div>
      <div class="mx-body"></div>
      <div class="mx-status mx-info">Gata.</div>
    `;
    document.body.appendChild(panel);
    panel.querySelector(".mx-close").addEventListener("click", () => panel.remove());
    renderBody();
  }

  function renderBody() {
    const body = panel.querySelector(".mx-body");
    body.innerHTML = "";

    if (isProfilePage()) {
      const p = extractCurrentProfile();
      if (!p) {
        body.innerHTML = `<p class="mx-muted">Profil necitit. Da scroll sus pe pagina.</p>`;
        return;
      }
      body.innerHTML = `
        <p class="mx-name">${escapeHtml(p.name)}</p>
        <p class="mx-muted">${escapeHtml(p.title || "—")}</p>
        <button class="mx-btn mx-primary" data-act="save">Salveaza prospect</button>
        <button class="mx-btn" data-act="msg">Genereaza mesaj AI</button>
        <div class="mx-msg-out" hidden></div>
      `;
      body.querySelector('[data-act="save"]').addEventListener("click", () => saveProfiles([p]));
      body.querySelector('[data-act="msg"]').addEventListener("click", () => genMessage(p));
    } else if (isPeopleSearchPage()) {
      const list = extractSearchResults();
      body.innerHTML = `
        <p class="mx-name">${list.length} profile pe pagina</p>
        <p class="mx-muted">Capturez ce e vizibil acum. Da scroll ca sa incarci tot, apoi salveaza.</p>
        <button class="mx-btn mx-primary" data-act="saveall" ${list.length ? "" : "disabled"}>
          Salveaza toti (${list.length})
        </button>
      `;
      const btn = body.querySelector('[data-act="saveall"]');
      if (btn) btn.addEventListener("click", () => saveProfiles(extractSearchResults()));
    } else {
      body.innerHTML = `<p class="mx-muted">Deschide un profil LinkedIn sau o cautare de persoane.</p>`;
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  // ---- Actiuni --------------------------------------------------------------

  async function saveProfiles(profiles) {
    if (!profiles || profiles.length === 0) {
      setStatus("Niciun profil de salvat.", "err");
      return;
    }
    setStatus("Se trimite " + profiles.length + " profil(e)...", "info");
    const resp = await send({ type: "SAVE_PROSPECTS", profiles });
    if (!resp.ok) {
      setStatus("Eroare: " + escapeHtml(resp.error || ""), "err");
      return;
    }
    setStatus(
      "Salvati " + resp.imported + " · duplicate " + resp.duplicates +
      (resp.todayCount != null ? " · azi: " + resp.todayCount : ""),
      "ok",
    );
  }

  async function genMessage(profile) {
    const out = panel.querySelector(".mx-msg-out");
    setStatus("AI scrie mesajul...", "info");
    const resp = await send({
      type: "GEN_MESSAGE",
      profile: { name: profile.name, title: profile.title, company: profile.company },
    });
    if (!resp.ok) {
      setStatus("Eroare: " + escapeHtml(resp.error || ""), "err");
      return;
    }
    if (out) {
      out.hidden = false;
      out.innerHTML = `
        <textarea class="mx-msg-text" rows="5">${escapeHtml(resp.message)}</textarea>
        <button class="mx-btn mx-primary" data-act="copy">Copiaza mesajul</button>
      `;
      out.querySelector('[data-act="copy"]').addEventListener("click", async () => {
        const text = out.querySelector(".mx-msg-text").value;
        try {
          await navigator.clipboard.writeText(text);
          setStatus("Mesaj copiat. Apasa Message pe LinkedIn si lipeste (Ctrl+V).", "ok");
        } catch {
          setStatus("Selecteaza textul si copiaza manual (Ctrl+C).", "info");
        }
      });
    }
    setStatus("Mesaj gata. Revizuieste-l inainte sa trimiti.", "ok");
  }

  // ---- Init + re-render la navigare SPA ------------------------------------

  function init() {
    if (document.getElementById("mx-linkedin-panel")) return;
    buildPanel();
  }

  // LinkedIn e SPA — reconstruim panoul cand se schimba ruta
  let lastPath = location.pathname;
  setInterval(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      const existing = document.getElementById("mx-linkedin-panel");
      if (existing) renderBody();
    }
  }, 1500);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
