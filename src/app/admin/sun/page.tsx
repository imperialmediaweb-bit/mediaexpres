import { waLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/**
 * 28.11.2026 (owner) — se deschide din notificarea „Început de comandă" /
 * „Sunați-mă": un singur ecran cu Suna, WhatsApp si Email, ca omul sa fie
 * prins cat inca e pe pagina.
 */
export default function SunPage({ searchParams }: { searchParams: { tel?: string; email?: string; motiv?: string } }) {
  const tel = (searchParams.tel || "").trim();
  const email = (searchParams.email || "").trim();
  const sunaMa = searchParams.motiv === "suna-ma";
  const telCurat = tel.replace(/[^\d+]/g, "");
  const wa = waLink(
    tel,
    "Bună ziua, sunt de la MediaExpres. Am văzut că ați început o comandă pe site. Vă ajut eu de aici, pe WhatsApp: trimiteți-mi articolul (Word sau orice format) și 3 poze, plus numele firmei și CUI-ul, și ne ocupăm de rest.",
  );
  const btn = "block w-full rounded-xl px-5 py-4 text-center text-lg font-bold text-white shadow";
  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="font-serif text-2xl font-bold text-brand-navy">
        {sunaMa ? "Vrea să fie sunat acum" : "A început o comandă"}
      </h1>
      <p className="text-slate-700">
        <strong>{tel || "fără telefon"}</strong>
        {email && <span className="block text-sm">{email}</span>}
      </p>
      {telCurat && (
        <a href={`tel:${telCurat}`} className={`${btn} bg-brand-red`}>📞 Sună</a>
      )}
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className={`${btn} bg-[#25D366]`}>💬 WhatsApp</a>
      )}
      {email && (
        <a href={`mailto:${email}`} className={`${btn} bg-brand-navy`}>✉️ Email</a>
      )}
      <a href="/admin/chat" className="block text-center text-sm font-semibold text-brand-navy underline">Chat live</a>
    </div>
  );
}
