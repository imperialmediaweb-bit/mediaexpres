import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ChatInbox } from "./ChatInbox";
import { PornesteNotificari } from "./PornesteNotificari";

export const dynamic = "force-dynamic";

/** 24.11.2026 — chat live cu clientii de pe site, ca pe WhatsApp. */
export default function AdminChatPage({ searchParams }: { searchParams: { id?: string } }) {
  if (!getSession()) redirect("/admin/login?from=/admin/chat");
  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-brand-navy">Chat live</h1>
      <p className="mt-2 mb-6 text-sm text-slate-600">
        Clienții care au apăsat „Vorbește cu un om” în chatul de pe site. Ce scrii aici apare pe loc în chatul lor (și pe email, dacă l-au lăsat).
      </p>
      <PornesteNotificari />
      <ChatInbox initialId={searchParams.id || null} />
    </div>
  );
}
