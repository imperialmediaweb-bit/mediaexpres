import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { Paperclip } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { clientMessages } from "@/db/schema";
import { ReplyForm } from "./ReplyForm";

export const dynamic = "force-dynamic";

function fmt(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminMesajePage() {
  const session = getSession();
  if (!session) redirect("/admin/login?from=/admin/mesaje");

  const rows = await db
    .select()
    .from(clientMessages)
    .orderBy(asc(clientMessages.createdAt));

  // Grupam pe client: un fir per adresa de email.
  const threads = new Map<string, typeof rows>();
  for (const m of rows) {
    const list = threads.get(m.email) || [];
    list.push(m);
    threads.set(m.email, list);
  }
  // Firele cu cereri nerezolvate primele, apoi dupa ultimul mesaj.
  const sorted = [...threads.entries()].sort((a, b) => {
    const pend = (t: typeof rows) => (t.some((m) => m.fromClient && !m.handled) ? 0 : 1);
    const d = pend(a[1]) - pend(b[1]);
    if (d !== 0) return d;
    return (
      new Date(b[1][b[1].length - 1].createdAt).getTime() -
      new Date(a[1][a[1].length - 1].createdAt).getTime()
    );
  });

  const pendingCount = sorted.filter(([, t]) =>
    t.some((m) => m.fromClient && !m.handled),
  ).length;

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-brand-navy">Mesaje de la clienți</h1>
      <p className="mt-2 text-sm text-slate-600">
        Cererile scrise de clienți din contul lor — modificări pe articole, materiale, întrebări.
        {pendingCount > 0 && (
          <strong className="ml-2 text-brand-red">{pendingCount} de rezolvat.</strong>
        )}
      </p>

      {sorted.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          Niciun mesaj încă. Aici apare orice scrie un client din contul lui.
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {sorted.map(([email, msgs]) => {
            const pending = msgs.some((m) => m.fromClient && !m.handled);
            return (
              <div
                key={email}
                className={`overflow-hidden rounded-xl border bg-white ${
                  pending ? "border-brand-red/40" : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
                  {pending && (
                    <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                      DE REZOLVAT
                    </span>
                  )}
                  <span className="font-mono text-sm font-medium text-brand-navy">{email}</span>
                  <span className="ml-auto text-xs text-slate-500">
                    {msgs.length} {msgs.length === 1 ? "mesaj" : "mesaje"}
                  </span>
                </div>

                <div className="space-y-3 bg-slate-50/60 p-4">
                  {msgs.map((m) => {
                    let files: { url: string; name: string }[] = [];
                    try {
                      files = JSON.parse(m.attachments || "[]");
                    } catch {
                      files = [];
                    }
                    return (
                      <div key={m.id} className={`flex ${m.fromClient ? "justify-start" : "justify-end"}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-sm shadow-sm ${
                            m.fromClient
                              ? "rounded-tl-sm border border-slate-200 bg-white text-slate-800"
                              : "rounded-tr-sm bg-brand-navy text-white"
                          }`}
                        >
                          <p className={`mb-1 text-xs ${m.fromClient ? "text-slate-500" : "text-white/70"}`}>
                            {m.fromClient ? "Client" : "Noi"} · {fmt(m.createdAt)}
                          </p>
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          {files.length > 0 && (
                            <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                              {files.map((f) => (
                                <li key={f.url} className="flex items-center gap-1.5 text-xs">
                                  <Paperclip className="h-3 w-3 shrink-0 text-slate-400" />
                                  <a
                                    href={f.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="truncate text-brand-red underline"
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

                <ReplyForm email={email} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
