import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { publishers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { ReverificaAutoritate } from "./ReverificaAutoritate";
import { citesteOptiuni, etichetaOptiune, pretOptiuneClient } from "@/lib/optiuni-partener";
import { PartnerActions } from "./PartnerActions";
import { PartnerCommercial } from "./PartnerCommercial";
import { ensureOrderColumns } from "@/lib/ensure-columns";
import { nivelPropus } from "@/lib/niveluri-publicatii";

export const dynamic = "force-dynamic";

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ro-RO");
}

export default async function AdminPartnerDetail({
  params,
}: {
  params: { id: string };
}) {
  const session = getSession();
  if (!session) redirect(`/admin/login?from=/admin/parteneri/${params.id}`);

  await ensureOrderColumns();
  const [p] = await db
    .select()
    .from(publishers)
    .where(eq(publishers.id, params.id))
    .limit(1);
  if (!p) notFound();

  return (
    <div>
      <Link
        href="/admin/parteneri"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-red"
      >
        <ArrowLeft className="h-4 w-4" /> Inapoi la parteneri
      </Link>

      <h1 className="mt-4 font-serif text-3xl font-bold text-brand-navy">
        {p.siteName}
      </h1>
      <p className="mt-1 text-sm">
        <a href={p.siteUrl} target="_blank" rel="noreferrer" className="text-brand-red hover:underline">
          {p.siteUrl}
        </a>
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card title="Detalii site">
            <Row label="Judet" value={p.county} />
            <Row label="Regiune" value={p.region} />
            <Row label="Facebook" value={p.facebookUrl} link />
            <Row label="Trafic lunar" value={p.monthlyTraffic ? `${p.monthlyTraffic.toLocaleString("ro-RO")} vizite/lună` : null} />
            <Row label="Articole / lună acceptă" value={p.articlesPerMonth ? String(p.articlesPerMonth) : null} />
            <Row label="Urmăritori Facebook" value={p.facebookFollowers ? p.facebookFollowers.toLocaleString("ro-RO") : null} />
            <Row
              label="Dovada traficului"
              value={p.analyticsProofUrl || null}
              link
            />
            <Row
              label="Linkuri dofollow"
              value={p.dofollowLinks === true ? "Da" : p.dofollowLinks === false ? "Nu — doar vizibilitate" : null}
            />
            <Row
              label="Declarație asumată"
              value={p.declarationAccepted ? "Da" : "Nu — aplicație veche sau nebifată"}
            />
          </Card>
          <Card title="Contact">
            <Row label="Nume" value={p.contactName} />
            <Row label="Email" value={p.contactEmail} mono />
            <Row label="Telefon" value={p.contactPhone} />
          </Card>
          <Card title="Plată (pentru decontare articole)">
            <Row label="IBAN" value={p.payoutIban} mono />
            <Row label="Companie" value={p.payoutCompany} />
          </Card>
          {p.notes && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-brand-navy">Observații</h3>
              <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{p.notes}</p>
            </div>
          )}
          <div className="rounded-md bg-slate-50 p-4 text-xs text-slate-500">
            Aplicat: {formatDate(p.createdAt)} •{" "}
            {p.decidedAt ? `Decis: ${formatDate(p.decidedAt)}` : "Nedecis"}
            {p.rejectionReason && <p className="mt-2">Motiv respingere: {p.rejectionReason}</p>}
          </div>
        </div>

        <aside>
          <div className="space-y-5">
          <PartnerActions publisherId={p.id} currentStatus={p.status} />
          {p.kind === "influencer" && (
            <div className="rounded-xl border-2 border-brand-red/30 bg-white p-5 text-sm">
              <h2 className="font-serif text-lg font-semibold text-brand-navy">🎥 Influencer</h2>
              <dl className="mt-3 grid grid-cols-2 gap-2">
                <div><dt className="text-slate-500">Platformă</dt><dd className="font-semibold text-brand-navy">{p.platform || "—"}</dd></div>
                <div><dt className="text-slate-500">Urmăritori</dt><dd className="font-semibold text-brand-navy">{p.followers?.toLocaleString("ro-RO") ?? "—"}</dd></div>
                <div><dt className="text-slate-500">Vizualizări medii</dt><dd className="font-semibold text-brand-navy">{p.avgViews?.toLocaleString("ro-RO") ?? "—"}</dd></div>
                <div><dt className="text-slate-500">Cere pe postare</dt><dd className="font-semibold text-brand-navy">{p.pricePerArticle ? `${p.pricePerArticle} lei` : "—"}</dd></div>
              </dl>
              <p className="mt-3 text-xs text-slate-500">
                Verifică statisticile din captură și contul înainte să aprobi. Prețul lui e deja pus; dacă
                negociați altul, schimbă-l din nivel (câmpul de tarif). Autoritatea Moz nu se aplică.
              </p>
            </div>
          )}
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
            <h2 className="font-serif text-lg font-semibold text-brand-navy">Nișă și opțiuni</h2>
            <p className="mt-2 text-slate-700">Nișă: <strong>{p.niche || "—"}</strong></p>
            {citesteOptiuni(p.extraOptions).length ? (
              <ul className="mt-2 space-y-1 text-slate-700">
                {citesteOptiuni(p.extraOptions).map((o) => (
                  <li key={o.key}>
                    {etichetaOptiune(o.key)}: îi plătim <strong>{o.pret} lei</strong> · clientul plătește <strong>{pretOptiuneClient(o.pret)} lei</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-slate-500">Nu oferă opțiuni pe lângă articol.</p>
            )}
          </div>
          {/* 29.09.2026 — autoritatea, citita de noi (lib/autoritate.ts). */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-serif text-lg font-semibold text-brand-navy">Autoritate (verificată de noi)</h2>
            {p.authorityCheckedAt ? (
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div><dt className="text-slate-500">Moz DA</dt><dd className="font-serif text-2xl font-bold text-brand-navy">{p.domainAuthority ?? "—"}</dd></div>
                <div><dt className="text-slate-500">Moz PA</dt><dd className="font-serif text-2xl font-bold text-brand-navy">{p.pageAuthority ?? "—"}</dd></div>
                <div><dt className="text-slate-500">Spam score</dt><dd className={`font-semibold ${(p.spamScore ?? 0) >= 30 ? "text-brand-red" : "text-brand-navy"}`}>{p.spamScore != null ? `${p.spamScore}%` : "—"}</dd></div>
                <div><dt className="text-slate-500">Open PageRank</dt><dd className="font-semibold text-brand-navy">{p.openPageRank != null ? `${p.openPageRank}/10` : "—"}</dd></div>
                <p className="col-span-2 text-xs text-slate-500">Verificat pe {new Date(p.authorityCheckedAt).toLocaleDateString("ro-RO")}</p>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Neverificată încă.</p>
            )}
            <ReverificaAutoritate publisherId={p.id} />
          </div>
          <PartnerCommercial
            publisherId={p.id}
            status={p.status}
            tier={p.tier}
            pricePerArticle={p.pricePerArticle}
            dofollowLinks={p.dofollowLinks}
            nivelSugerat={nivelPropus(p.domainAuthority, p.monthlyTraffic).id}
          />
        </div>
        </aside>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-serif text-lg font-semibold text-brand-navy">{title}</h2>
      <dl className="mt-4 space-y-2 text-sm">{children}</dl>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  link,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  link?: boolean;
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : ""}>
        {value ? (
          link ? (
            <a href={value} target="_blank" rel="noreferrer" className="text-brand-red hover:underline break-all">
              {value}
            </a>
          ) : (
            value
          )
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </dd>
    </div>
  );
}
