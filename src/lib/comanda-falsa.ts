/**
 * 23.11.2026 (owner: „refuză pe CUI-ul nostru și banează IP-ul"): un robot
 * (HeadlessChrome, 82.76.139.8) a dat comandă cu CUI-ul Legio și emailul
 * office@exemplu.ro → factura automată 1197 emisă pe propria firmă.
 * Comenzile cu CUI-ul nostru sau cu emailuri de exemplu/test sunt refuzate.
 * Liste schimbabile fără deploy: CUI_REFUZATE, EMAIL_DOMENII_REFUZATE.
 */
const CUI_PROPRII = (process.env.CUI_REFUZATE || "46466484").split(",").map((s) => s.replace(/\D/g, "")).filter(Boolean);
const DOMENII = (process.env.EMAIL_DOMENII_REFUZATE || "exemplu.ro,example.com,example.ro,exemplu.com,test.com,test.ro")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function cuiPropriu(cui: string | null | undefined): boolean {
  const c = String(cui || "").replace(/\D/g, "");
  return !!c && CUI_PROPRII.includes(c);
}

export function emailFals(email: string | null | undefined): boolean {
  const dom = String(email || "").trim().toLowerCase().split("@")[1] || "";
  return DOMENII.includes(dom);
}
