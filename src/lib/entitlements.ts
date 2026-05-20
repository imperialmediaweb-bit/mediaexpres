import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { orders, subscriptions, articles } from "@/db/schema";
import { SUBSCRIPTION_PLANS } from "@/data/packages";

export interface Entitlements {
  hasPaid: boolean;
  hasActiveSubscription: boolean;
  activeSubscription: typeof subscriptions.$inferSelect | null;
  articlesRemaining: number;
  paidOrdersCount: number;
}

export async function getEntitlements(userId: string): Promise<Entitlements> {
  const [paidRows, subRows] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.status, "paid"))),
    db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt)),
  ]);

  const activeSub =
    subRows.find((s) => s.status === "active" || s.status === "trialing") ||
    null;

  return {
    hasPaid: paidRows.length > 0 || !!activeSub,
    hasActiveSubscription: !!activeSub,
    activeSubscription: activeSub,
    articlesRemaining: activeSub?.articlesRemaining ?? 0,
    paidOrdersCount: paidRows.length,
  };
}

export async function getUserOrders(userId: string) {
  return db
    .select({
      id: orders.id,
      userId: orders.userId,
      email: orders.email,
      packageId: orders.packageId,
      amount: orders.amount,
      currency: orders.currency,
      status: orders.status,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
      articleTitle: articles.title,
    })
    .from(orders)
    .leftJoin(articles, eq(articles.orderId, orders.id))
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
}

export async function getUserSubscriptions(userId: string) {
  return db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt));
}

export async function getUserArticles(userId: string) {
  return db
    .select()
    .from(articles)
    .where(eq(articles.userId, userId))
    .orderBy(desc(articles.createdAt));
}

export function planArticlesPerMonth(planId: string): number {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
  return plan?.distributionsPerMonth ?? 0;
}

export function isActiveSubStatus(status: string): boolean {
  return status === "active" || status === "trialing";
}
