import type { Metadata } from "next";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export const metadata: Metadata = {
  title: "Contul meu",
  robots: { index: false, follow: false },
};

export default async function ContLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-5rem)]">
      {session?.user && (
        <div className="border-b border-slate-200 bg-white">
          <div className="container flex h-14 items-center justify-between">
            <nav className="flex gap-6 text-sm font-medium" aria-label="Cont">
              <Link
                href="/cont"
                className="text-brand-navy hover:text-brand-red"
              >
                Dashboard
              </Link>
              <Link
                href="/cont/comenzi"
                className="text-brand-navy hover:text-brand-red"
              >
                Comenzi
              </Link>
              <Link
                href="/cont/abonament"
                className="text-brand-navy hover:text-brand-red"
              >
                Abonament
              </Link>
              <Link
                href="/cont/articole"
                className="text-brand-navy hover:text-brand-red"
              >
                Articole
              </Link>
              <Link
                href="/cont/profil"
                className="text-brand-navy hover:text-brand-red"
              >
                Profil
              </Link>
            </nav>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-slate-500 sm:inline">
                {session.user.email}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button type="submit" variant="outline" size="sm">
                  <LogOut className="h-3.5 w-3.5" /> Iesire
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
