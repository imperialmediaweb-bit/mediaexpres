import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ComposeForm } from "./ComposeForm";

export const dynamic = "force-dynamic";

export default function TrimiteEmailPage() {
  const session = getSession();
  if (!session) redirect("/admin/login?from=/admin/trimite-email");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-serif text-2xl font-bold text-brand-navy">
        Trimite / programează email
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Scrii mesajul, alegi destinatarii și — dacă vrei — ora la care să plece.
        Resend îl livrează singur la momentul ales (maximum 30 de zile în
        avans). Statusul apare apoi în pagina Emailuri.
      </p>
      <div className="mt-8">
        <ComposeForm />
      </div>
    </div>
  );
}
