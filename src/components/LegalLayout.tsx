export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <section className="bg-brand-navy text-white">
        <div className="container py-16 text-center">
          <p className="eyebrow text-brand-gold">Document legal</p>
          <h1 className="h1 mt-3 text-white">{title}</h1>
          <p className="mt-4 text-sm text-white/70">Ultima actualizare: {updated}</p>
        </div>
      </section>
      <section className="section bg-white">
        <div className="container-prose prose prose-slate max-w-3xl">
          <div className="space-y-6 text-slate-700 leading-relaxed">{children}</div>
        </div>
      </section>
    </>
  );
}
