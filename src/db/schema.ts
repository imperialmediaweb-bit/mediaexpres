import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
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

export const accounts = pgTable("account", {
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
  compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
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
  stripeSessionId: text("stripe_session_id"),
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
  email: text("email").notNull(),
  phone: text("phone"),
  industry: text("industry"),
  city: text("city"),
  website: text("website"),
  notes: text("notes"),
  status: text("status").notNull().default("new"),
  emailsSent: integer("emails_sent").notNull().default(0),
  lastEmailAt: timestamp("last_email_at"),
  lastEmailSubject: text("last_email_subject"),
  lastEmailBody: text("last_email_body"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
