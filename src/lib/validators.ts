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

export type OrderInput = z.infer<typeof orderSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type RequestListInput = z.infer<typeof requestListSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
