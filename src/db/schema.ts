import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  phone: text("phone"),
  companyName: text("company_name"),
  companyCui: text("company_cui"),
  companyRegNo: text("company_reg_no"),
  companyAddress: text("company_address"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// NOTE: `id` column added to match existing DB state (DB was created with id as PK).
// The @auth/drizzle-adapter uses a WHERE on (provider, providerAccountId) so the
// unique constraint below keeps data integrity without needing a composite PK.
export const accounts = pgTable("account", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").$type<AdapterAccountType>().notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (account) => ({
  providerUnique: unique().on(account.provider, account.providerAccountId),
}));

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (vt) => ({
  compositePk: primaryKey({ columns: [vt.identifier, vt.token] }),
}));

export const subscriptions = pgTable("subscription", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  planId: text("plan_id").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull(),
  articlesIncludedPerMonth: integer("articles_included_per_month").notNull(),
  articlesRemaining: integer("articles_remaining").notNull().default(0),
  currentPeriodEnd: timestamp("current_period_end", { mode: "date" }).notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orders = pgTable("order", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  packageId: text("package_id").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("ron"),
  status: text("status").notNull().default("pending"),
  // unique = plasa de siguranta pentru idempotenta webhookului Stripe:
  // doua livrari concurente ale aceluiasi eveniment nu pot insera ambele.
  stripeSessionId: text("stripe_session_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  paidAt: timestamp("paid_at"),
});

export const articles = pgTable("article", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
  subscriptionId: text("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  body: text("body"),
  notes: text("notes"),
  existingUrl: text("existing_url"),
  aiGenerated: boolean("ai_generated").default(false).notNull(),
  status: text("status").notNull().default("draft"),
  publishedUrls: text("published_urls"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  submittedAt: timestamp("submitted_at"),
  publishedAt: timestamp("published_at"),
});

export const uploads = pgTable("upload", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  articleId: text("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  cloudinaryPublicId: text("cloudinary_public_id").notNull(),
  url: text("url").notNull(),
  kind: text("kind").notNull().default("image"),
  width: integer("width"),
  height: integer("height"),
  bytes: integer("bytes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Prospects pentru outreach B2B — firme pe care le contactam noi.
export const prospects = pgTable("prospect", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name"),
  contactTitle: text("contact_title"),
  // email poate fi null: un lead capturat din LinkedIn nu are mereu email.
  email: text("email"),
  phone: text("phone"),
  industry: text("industry"),
  city: text("city"),
  website: text("website"),
  linkedinUrl: text("linkedin_url"),
  // 'manual' | 'linkedin' | 'discover' | 'csv'
  source: text("source").notNull().default("manual"),
  notes: text("notes"),
  status: text("status").notNull().default("new"),
  emailsSent: integer("emails_sent").notNull().default(0),
  lastEmailAt: timestamp("last_email_at"),
  lastEmailSubject: text("last_email_subject"),
  lastEmailBody: text("last_email_body"),
  // Tracking oferta page
  viewCount: integer("view_count").notNull().default(0),
  firstViewedAt: timestamp("first_viewed_at"),
  lastViewedAt: timestamp("last_viewed_at"),
  clickedCta: boolean("clicked_cta").notNull().default(false),
  // Resend webhook tracking (open/click events)
  openCount: integer("open_count").notNull().default(0),
  clickCount: integer("click_count").notNull().default(0),
  // Urgency discount code
  discountCode: text("discount_code"),
  discountExpiresAt: timestamp("discount_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Comenzi venite via /oferta/[token]/comanda — pagina personalizata pentru prospects.
// Pastram datele firmei CUMPARATOARE (pentru factura pe care o emit eu manual in soft-ul meu de facturare).
// Lifecycle: pending -> articles_published -> invoiced -> paid (sau cancelled).
export const prospectOrders = pgTable("prospect_order", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  prospectId: text("prospect_id").references(() => prospects.id, { onDelete: "set null" }),
  packageId: text("package_id").notNull(),
  buyerCompanyName: text("buyer_company_name").notNull(),
  buyerCui: text("buyer_cui").notNull(),
  buyerRegCom: text("buyer_reg_com"),
  buyerAddress: text("buyer_address").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  buyerPhone: text("buyer_phone"),
  articleTopic: text("article_topic").notNull(),
  articleNotes: text("article_notes"),
  photoLinks: text("photo_links"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  publishedAt: timestamp("published_at"),
  invoicedAt: timestamp("invoiced_at"),
  paidAt: timestamp("paid_at"),
});

// Materialele trimise de clienti dupa plata (formularul /articol/[token]).
// Inainte, fluxul trimitea totul DOAR pe email catre adresa de contact — care
// facea bounce — si articolul unui client platitor a ramas de negasit in admin.
// De-acum orice trimitere se salveaza AICI inainte de orice email.
export const orderSubmissions = pgTable("order_submission", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // UNIC: o plata = o singura trimitere de materiale. Tokenul de acces e valabil
  // 90 de zile, deci fara constrangerea asta acelasi client putea retrimite
  // articole la nesfarsit pe aceeasi plata, iar adminul nu avea cum sa observe.
  stripeSessionId: text("stripe_session_id").unique().notNull(),
  email: text("email").notNull(),
  packageId: text("package_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  metaDescription: text("meta_description"),
  keywords: text("keywords"),
  companyName: text("company_name"),
  siteUrl: text("site_url"),
  contactPhone: text("contact_phone"),
  // JSON: [{url, publicId}] — pozele din Cloudinary; featuredIndex arata reprezentativa.
  images: text("images").notNull().default("[]"),
  featuredIndex: integer("featured_index").notNull().default(0),
  facebookOptIn: boolean("facebook_opt_in").notNull().default(true),
  // true = varianta rescrisa unic pe fiecare ziar (implicit); false = clientul
  // a cerut EXACT textul lui, identic peste tot (comunicat oficial/juridic).
  uniquePerSite: boolean("unique_per_site").notNull().default(true),
  generatedByAi: boolean("generated_by_ai").notNull().default(false),
  isCasino: boolean("is_casino").notNull().default(false),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  publishedAt: timestamp("published_at"),
});

// Rapoartele de publicare trimise clientilor. Pana acum raportul exista DOAR
// in emailul trimis — clientul care il pierdea nu-l mai putea revedea. Acum se
// salveaza si aici, iar clientul il vede oricand in contul lui (/cont/rapoarte),
// legat prin adresa de email.
export const publicationReports = pgTable("publication_report", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull(),
  clientName: text("client_name"),
  articleTitle: text("article_title"),
  // JSON: string[] — linkurile articolelor publicate.
  links: text("links").notNull().default("[]"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Conversatia client <-> MediaExpres, din contul clientului.
// Motivul: clientii cer modificari si trimit materiale (capturi, sigle,
// referinte) pe email, iar cererile se pierdeau intre notificari. Aici stau
// legate de client, cu istoric si status, si se vad in admin ca sarcini.
// Legatura se face pe EMAIL, nu pe userId: raportul si comanda pot exista
// inainte ca omul sa-si activeze contul.
export const clientMessages = pgTable("client_message", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull(),
  // true = scris de client; false = raspunsul nostru.
  fromClient: boolean("from_client").notNull().default(true),
  body: text("body").notNull(),
  // JSON: [{url, name}] — fisiere urcate in Cloudinary de client.
  attachments: text("attachments").notNull().default("[]"),
  // Doar pentru mesajele clientului: cat timp e false, apare ca sarcina in admin.
  handled: boolean("handled").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// O linie per termen ANUNTAT al ofertei promo. Unicitatea pe deadline_label e
// garantia ca /api/cron/promo-announce trimite anuntul de prelungire O SINGURA
// data per termen, oricat de des ar fi apelat cronul.
export const promoAnnouncements = pgTable("promo_announcement", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  deadlineLabel: text("deadline_label").unique().notNull(),
  sentCount: integer("sent_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const publishers = pgTable("publisher", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  siteName: text("site_name").notNull(),
  siteUrl: text("site_url").notNull(),
  county: text("county"),
  region: text("region"),
  facebookUrl: text("facebook_url"),
  monthlyTraffic: integer("monthly_traffic"),
  articlesPerMonth: integer("articles_per_month"),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  payoutIban: text("payout_iban"),
  payoutCompany: text("payout_company"),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  decidedAt: timestamp("decided_at"),
});
