import { z } from "zod";

const phoneRegex = /^[+0-9\s()-]{8,20}$/;

export const orderSchema = z.object({
  name: z.string().min(2, "Numele e prea scurt").max(100),
  email: z.string().email("Email invalid"),
  phone: z.string().regex(phoneRegex, "Telefon invalid"),
  company: z.string().max(150).optional().or(z.literal("")),
  packageId: z.string().min(1, "Alege un pachet"),
  articleTitle: z.string().min(3, "Titlul e prea scurt").max(200),
  articleBody: z.string().max(20000).optional().or(z.literal("")),
  articleUrl: z.string().url("URL invalid").optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: "Trebuie să accepți procesarea datelor" }),
  }),
  // Honeypot
  website: z.string().max(0).optional().or(z.literal("")),
});

export const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  subject: z.string().min(3).max(200),
  message: z.string().min(10, "Mesajul e prea scurt").max(5000),
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: "Trebuie să accepți procesarea datelor" }),
  }),
  website: z.string().max(0).optional().or(z.literal("")),
});

export const requestListSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(phoneRegex).optional().or(z.literal("")),
  company: z.string().max(150).optional().or(z.literal("")),
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: "Trebuie să accepți procesarea datelor" }),
  }),
  website: z.string().max(0).optional().or(z.literal("")),
});

export const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// Comenzi venite din pagina /oferta/[token]/comanda — colectam datele firmei CUMPARATOARE
// (pentru factura emisa manual de admin). Fara plata in avans; fara proforma.
export const prospectOrderSchema = z.object({
  packageId: z.string().min(1, "Alege un pachet"),
  buyerCompanyName: z.string().min(2, "Numele firmei e prea scurt").max(200),
  buyerCui: z.string().min(2, "CUI invalid").max(20),
  buyerRegCom: z.string().max(50).optional().or(z.literal("")),
  buyerAddress: z.string().min(5, "Adresa e prea scurtă").max(300),
  buyerEmail: z.string().email("Email invalid"),
  buyerPhone: z.string().regex(phoneRegex, "Telefon invalid").optional().or(z.literal("")),
  articleTopic: z.string().min(20, "Tematica e prea scurtă (min 20 caractere)").max(5000),
  articleNotes: z.string().max(2000).optional().or(z.literal("")),
  photoLinks: z.string().max(2000).optional().or(z.literal("")),
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: "Trebuie să accepți procesarea datelor" }),
  }),
  website: z.string().max(0).optional().or(z.literal("")),
});

export type OrderInput = z.infer<typeof orderSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type RequestListInput = z.infer<typeof requestListSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type ProspectOrderInput = z.infer<typeof prospectOrderSchema>;
