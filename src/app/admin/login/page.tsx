import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { AdminLoginForm } from "./AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo variant="white" />
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <h1 className="font-serif text-2xl font-bold text-brand-navy text-center">
            Administrare
          </h1>
          <p className="text-sm text-slate-500 text-center mt-1">
            Acces restricționat — doar administratori
          </p>
          <div className="mt-6">
            <Suspense>
              <AdminLoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
