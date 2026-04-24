import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Intra in cont",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/cont");

  return (
    <section className="container py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="eyebrow text-brand-red">Cont MediaExpres</p>
        <h1 className="font-serif text-3xl font-bold text-brand-navy mt-2">
          Intra in cont
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Primesti un link magic pe email. Apesi pe link si esti logat — fara
          parole.
        </p>

        <form
          action={async (formData) => {
            "use server";
            const email = String(formData.get("email") || "").trim();
            if (!email) return;
            await signIn("resend", {
              email,
              redirectTo: "/cont",
            });
          }}
          className="mt-8 space-y-4"
        >
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              name="email"
              type="email"
              required
              placeholder="email@firma.ro"
            />
          </div>
          <Button type="submit" variant="accent" size="lg" className="w-full">
            <Mail className="h-4 w-4" /> Trimite link magic
          </Button>
        </form>

        <p className="mt-6 text-xs text-slate-500 text-center">
          Nu ai cont inca? Il cream automat la prima autentificare.{" "}
          <Link href="/pachete" className="text-brand-red underline">
            Vezi pachetele
          </Link>
        </p>
      </div>
    </section>
  );
}
