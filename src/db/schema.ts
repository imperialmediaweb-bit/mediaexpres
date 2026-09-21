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
  // 07.09.2026 — un client a platit cu cardul si n-a mai trimis niciodata
  // articolul; proprietarul a aflat abia uitandu-se in admin. Aici se scrie
  // cand a plecat reamintirea catre client si cand a plecat alerta catre
  // proprietar, ca fiecare sa plece O SINGURA data, oricat de des ruleaza
  // cronul. Coloanele se adauga prin /api/admin/fix-db si, ca plasa,
  // prin lib/ensure-columns.ts.
  materialReminderAt: timestamp("material_reminder_at"),
  // De unde a venit clientul (Google Ads, Facebook, direct...) — formatul e in
  // lib/sursa.ts. Vine din cookie-ul me_src prin metadata sesiunii Stripe.
  source: text("source"),
  materialAlertAt: timestamp("material_alert_at"),
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
  // 21.09.2026 — datele de facturare se cer dupa plata, nu pe pagina Stripe.
  cui: text("cui"),
  billingAddress: text("billing_address"),
  // JSON: [{url, publicId}] — pozele din Cloudinary; featuredIndex arata reprezentativa.
  images: text("images").notNull().default("[]"),
  featuredIndex: integer("featured_index").notNull().default(0),
  facebookOptIn: boolean("facebook_opt_in").notNull().default(true),
  // true = varianta rescrisa unic pe fiecare ziar (implicit); false = clientul
  // a cerut EXACT textul lui, identic peste tot (comunicat oficial/juridic).
  uniquePerSite: boolean("unique_per_site").notNull().default(true),
  // 06.09.2026 — promovarea postarii pe Facebook, 3 zile, prin reclama
  // platita, inclusa in pret. Clientul alege ziarul din lista (local sau
  // national); null = alegem noi ziarul din judetul lui. Coloana se adauga
  // in productie prin /api/admin/fix-db sau automat la prima comanda
  // (vezi lib/ensure-columns.ts).
  fbBoostPaper: text("fb_boost_paper"),
  // 13.09.2026 — „pe ce cuvinte pun linkul?" Clientul scrie aici ancora si
  // adresa („statie ITP Sector 5 → https://firma.ro"), o linie pe link.
  // Inainte exista doar in emailul comenzii prin OP; la card nu se cerea
  // deloc, iar cel care publica ghicea. Coloana: fix-db + ensure-columns.
  linkNotes: text("link_notes"),
  // 07.09.2026 — comanda prin OP la care clientul a trimis materialul si a
  // primit factura, dar n-a platit. Publicarea sta blocata pana la incasare,
  // deci fara o impingere ramane acolo la nesfarsit. Numaram cate reamintiri
  // au plecat (maximum doua) si cand a plecat ultima.
  paymentRemindersSent: integer("payment_reminders_sent").notNull().default(0),
  paymentReminderAt: timestamp("payment_reminder_at"),
  generatedByAi: boolean("generated_by_ai").notNull().default(false),
  isCasino: boolean("is_casino").notNull().default(false),
  // "card" = platit prin Stripe (confirmarea vine din webhook);
  // "op" = transfer bancar, unde clientul incarca dovada, iar plata se
  // confirma manual de noi inainte de publicare.
  paymentMethod: text("payment_method").notNull().default("card"),
  // Aceeasi sursa ca pe `order`, pentru comenzile care nu trec prin Stripe
  // (transfer bancar) sau adaugate de admin („manual").
  source: text("source"),
  // Ritmul de publicare ales de client: rapid (12 ore) / zile3 / sapt2.
  // Vezi lib/ritm.ts. Coloana se adauga prin fix-db si ensure-columns.
  ritm: text("ritm").notNull().default("rapid"),
  // JSON: {url, name} — dovada platii incarcata la comenzile prin OP.
  paymentProof: text("payment_proof"),
  // Date de facturare, cerute explicit la OP (la card vin din Stripe).
  companyCui: text("company_cui"),
  companyAddress: text("company_address"),
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
  // 10.09.2026 — linkul catre raportul gazduit (pagina cu toate cele 50 de
  // aparitii, postarile de Facebook si confirmarea indexarii). Emailul il
  // contine oricum, dar emailul se pierde; in contul clientului ramane.
  reportUrl: text("report_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Recenziile clientilor. Se cer in emailul cu raportul final — momentul in
// care omul tocmai a primit cele 50 de linkuri si e cel mai multumit. Doua
// cai: butonul catre /recenzie/[token] (ajunge aici cu source "form") sau
// raspunsul direct la email, pe care il introducem noi din admin (source
// "email"). Legatura se face pe EMAIL, ca la rapoarte si mesaje: comanda si
// raportul exista inainte ca omul sa-si activeze contul.
//
// Nu se publica nicaieri automat. `consentPublic` retine daca omul a bifat
// ca putem folosi textul pe site; abia dupa aia are voie sa ajunga acolo, si
// tot manual. `displayName` e numele SAU firma sub care vrea sa apara — asta
// a cerut-o proprietarul explicit, ca sa nu ghicim.
export const reviews = pgTable("review", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  rating: integer("rating").notNull().default(5),
  quote: text("quote").notNull(),
  siteUrl: text("site_url"),
  consentPublic: boolean("consent_public").notNull().default(false),
  // "form" = a completat pagina; "email" = a raspuns la email si am pus-o noi.
  source: text("source").notNull().default("form"),
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
  // 14.09.2026 — publicatiile partenere, cele pe care NU le detinem.
  //
  // Traficul declarat nu valoreaza nimic singur: oricine scrie 200.000. De
  // aceea se cere captura din Google Analytics la inscriere (urcata pe
  // Cloudinary) si se semneaza in contract ca cifrele sunt reale. Ce se
  // poate verifica singur (vechime domeniu, cate articole publica, scor de
  // autoritate) se verifica din admin, nu pe incredere.
  analyticsProofUrl: text("analytics_proof_url"),
  facebookFollowers: integer("facebook_followers"),
  /**
   * Linkurile din articol raman dofollow? Intrebarea care desparte plasarea
   * vanduta unui client de SEO de una vanduta pe vizibilitate. Multe ziare
   * pun automat nofollow pe tot ce e platit; daca afli asta de la un client
   * suparat, e prea tarziu.
   */
  dofollowLinks: boolean("dofollow_links"),
  /** Bronz / Argint / Aur / Platina — dupa cifre, nu dupa negociere. */
  tier: text("tier"),
  /** Cat ii platim pe articol publicat (lei). Vine din nivel, se poate ajusta. */
  pricePerArticle: integer("price_per_article"),
  /** A bifat ca cifrele declarate sunt reale si ca accepta verificarea. */
  declarationAccepted: boolean("declaration_accepted").notNull().default(false),
  /**
   * Creste cu 1 ca sa taie toate linkurile trimise pana acum publicatiei.
   * Asa se revoca un acces scurs fara sa tinem un tabel de sesiuni.
   */
  tokenVersion: integer("token_version").notNull().default(0),
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

/**
 * O plasare = un articol trimis unei publicatii partenere, spre publicare.
 *
 * 14.09.2026 — produsul nou: clientul plateste doar la noi, noi platim
 * publicatia, iar cele doua parti nu se cunosc. Diferenta ne ramane noua.
 *
 * MATERIALUL SE COPIAZA AICI, nu se citeste prin join din `order_submission`.
 * Pe comanda stau numele firmei, telefonul si CUI-ul clientului; daca pagina
 * partenerului ar face join, orice camp adaugat maine pe comanda ar deveni
 * vizibil printr-o scapare de randare. Ce nu e copiat nu poate scapa. In plus,
 * textul se poate curata inainte de trimitere fara sa atingem comanda.
 *
 * PRETURILE SE INGHEATA la trimitere: daca publicatia urca de nivel peste
 * trei luni, plasarile vechi raman cu banii promisi atunci.
 */
export const placements = pgTable("placement", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  publisherId: text("publisher_id").notNull(),
  /** Comanda din care vine, cand exista. Nullable: prima plasare se poate
   *  vinde inainte sa existe un pachet Stripe pentru ea. */
  orderSubmissionId: text("order_submission_id"),
  /** Eticheta interna cand nu exista comanda („Toma Enache — turneu"). */
  clientLabel: text("client_label"),
  tokenVersion: integer("token_version").notNull().default(0),

  // Materialul, copiat (vezi comentariul de mai sus).
  articleTitle: text("article_title").notNull(),
  articleBody: text("article_body").notNull(),
  images: text("images").notNull().default("[]"),
  featuredIndex: integer("featured_index").notNull().default(0),
  linkNotes: text("link_notes"),

  // Banii, inghetati la atribuire. In LEI, nu in bani: tarifele partenerilor
  // sunt sume rotunde si se citesc in admin, nu trec prin Stripe.
  tier: text("tier"),
  pricePartner: integer("price_partner").notNull(),
  priceClient: integer("price_client").notNull(),

  /** trimis → acceptat → publicat → finalizat; sau refuzat / expirat / anulat. */
  status: text("status").notNull().default("trimis"),
  refusalReason: text("refusal_reason"),
  publishedUrl: text("published_url"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  /** Termenele, calculate O DATA, in zile lucratoare (lib/zile-lucratoare.ts). */
  deadlineRefuz: timestamp("deadline_refuz").notNull(),
  deadlinePublicare: timestamp("deadline_publicare").notNull(),
  acceptedAt: timestamp("accepted_at"),
  refusedAt: timestamp("refused_at"),
  publishedAt: timestamp("published_at"),
  /** publishedAt + 12 luni. Garantia din contract. */
  onlineUntil: timestamp("online_until"),
  expiredAt: timestamp("expired_at"),

  /** Starea linkului, separata de ciclul plasarii: un link cazut nu sterge
   *  faptul ca articolul a fost livrat si facturat. */
  linkStatus: text("link_status"),
  linkCheckedAt: timestamp("link_checked_at"),
  dofollowExpected: boolean("dofollow_expected").notNull().default(true),

  /** Decontul in care a intrat. Setarea lui E lacatul: o plasare rezervata
   *  de un decont nu mai poate fi luata de al doilea. */
  statementId: text("statement_id"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
