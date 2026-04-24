import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ProfileForm } from "@/components/cont/ProfileForm";

export const metadata = {
  title: "Profilul meu",
  robots: { index: false, follow: false },
};

export default async function ProfilPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/cont/login");

  const [row] = await db
    .select({
      name: users.name,
      email: users.email,
      phone: users.phone,
      companyName: users.companyName,
      companyCui: users.companyCui,
      companyRegNo: users.companyRegNo,
      companyAddress: users.companyAddress,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return (
    <section className="container py-12">
      <div className="max-w-3xl">
        <p className="eyebrow">Cont</p>
        <h1 className="h1 mt-2">Profilul meu</h1>
        <p className="lead mt-3 text-slate-600">
          Datele de aici sunt folosite pentru emiterea facturilor fiscale prin
          StartCo si e-Factura (ANAF).
        </p>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-8">
          <ProfileForm
            initial={{
              name: row?.name || null,
              email: row?.email || null,
              phone: row?.phone || null,
              companyName: row?.companyName || null,
              companyCui: row?.companyCui || null,
              companyRegNo: row?.companyRegNo || null,
              companyAddress: row?.companyAddress || null,
            }}
          />
        </div>
      </div>
    </section>
  );
}
