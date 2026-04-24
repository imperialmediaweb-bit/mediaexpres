import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "./ziare/LogoutButton";
import {
  LayoutDashboard,
  Users,
  FileText,
  ShoppingBag,
  Repeat,
  Newspaper,
  Handshake,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Admin • MediaExpres",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/clienti", label: "Clienti", icon: Users },
  { href: "/admin/articole", label: "Articole", icon: FileText },
  { href: "/admin/comenzi", label: "Comenzi", icon: ShoppingBag },
  { href: "/admin/abonamente", label: "Abonamente", icon: Repeat },
  { href: "/admin/parteneri", label: "Parteneri", icon: Handshake },
  { href: "/admin/ziare", label: "Ziare", icon: Newspaper },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = getSession();

  // Not logged in: render children directly (login page has its own fullscreen layout).
  if (!session) return <>{children}</>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo />
            <span className="rounded-full bg-brand-red/10 px-3 py-1 text-xs font-semibold text-brand-red">
              Admin Panel
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600 hidden sm:inline">
              Salut, {session.username}
            </span>
            <Link
              href="/"
              className="text-sm text-slate-500 hover:text-brand-red"
            >
              ← Site
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="container py-8 grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside>
          <nav className="sticky top-4 space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white hover:text-brand-red"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
