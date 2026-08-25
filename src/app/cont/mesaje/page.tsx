import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { Paperclip } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/db";
import { clientMessages } from "@/db/schema";
import { SITE } from "@/data/site";
import { MessageComposer } from "./MessageComposer";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Mesaje",
  robots: { index: false, follow: false },
};

function fmt(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" });
}

export default async function MesajePage() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) redirect("/cont/login");

  const rows = await db
    .select()
    .from(clientMessages)
    .where(eq(clientMessages.email, email))
    .orderBy(asc(clientMessages.createdAt));

  return (
    <section className="container py-12">
      <div className="max-w-3xl">
        <p className="eyebrow">Cont</p>
        <h1 className="h1 mt-2">Mesaje</h1>
        <p className="lead mt-3 text-slate-600">
          Scrie-ne direct de aici — cereri de modificare pe articole, materiale, întrebări.
          Răspundem în aceeași zi lucrătoare, iar conversația rămâne salvată aici.
        </p>

        {rows.length > 0 && (
          <div className="mt-8 space-y-4">
            {rows.map((m) => {
              let files: { url: string; name: string }[] = [];
              try {
                files = JSON.parse(m.attachments || "[]");
              } catch {
                files = [];
              }
              const mine = m.fromClient;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      mine
                        ? "rounded-tr-sm bg-brand-red text-white"
                        : "rounded-tl-sm border border-slate-200 bg-white text-slate-800"
                    }`}
                  >
                    <p className={`mb-1 text-xs ${mine ? "text-white/70" : "text-slate-500"}`}>
                      {mine ? "Tu" : "MediaExpres"} · {fmt(m.createdAt)}
                    </p>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    {files.length > 0 && (
                      <ul className={`mt-2 space-y-1 border-t pt-2 ${mine ? "border-white/20" : "border-slate-100"}`}>
                        {files.map((f) => (
                          <li key={f.url} className="flex items-center gap-1.5 text-xs">
                            <Paperclip className="h-3 w-3 shrink-0" />
                            <a
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate underline"
                            >
                              {f.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8">
          <MessageComposer />
        </div>

        <p className="mt-6 text-sm text-slate-500">
          Preferi altfel? Ne găsești și pe WhatsApp la <strong>{SITE.phone}</strong> sau
          pe email la{" "}
          <a href={`mailto:${SITE.email}`} className="text-brand-red hover:underline">
            {SITE.email}
          </a>
          .
        </p>
      </div>
    </section>
  );
}
