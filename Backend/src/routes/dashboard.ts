import { Router, type IRouter } from "express";
import { eq, and, gte, lte, sql, isNull } from "../db";
import { db, transactionsTable, categoriesTable } from "../db";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user.id;
  const now = new Date();
  const reqMonth = req.query.month ? parseInt(req.query.month as string) : now.getMonth() + 1;
  const reqYear = req.query.year ? parseInt(req.query.year as string) : now.getFullYear();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(reqYear, reqMonth - 1, 1);
  const endOfMonth = new Date(reqYear, reqMonth, 0, 23, 59, 59, 999);

  // Month-scoped: earn/spend only within selected month
  const monthTxs = await db
    .select({ type: transactionsTable.type, amount: transactionsTable.amount })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), gte(transactionsTable.date, startOfMonth), lte(transactionsTable.date, endOfMonth)));

  const todayTxs = await db
    .select({ type: transactionsTable.type, amount: transactionsTable.amount })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), gte(transactionsTable.date, startOfToday)));

  const sum = (txs: Array<Record<string, unknown>>, type: string) =>
    txs.filter((t) => t.type === type).reduce((acc, t) => acc + parseFloat(t.amount as string), 0);

  const totalSpent = sum(monthTxs as Array<Record<string, unknown>>, "spend");

  // Carry-forward: lend/borrow — fetch ALL up to end of selected month (no start date)
  const lendTxs = await db
    .select({ id: transactionsTable.id, amount: transactionsTable.amount })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), eq(transactionsTable.type, "lend"), isNull(transactionsTable.parentTransactionId), lte(transactionsTable.date, endOfMonth)));

  const borrowTxs = await db
    .select({ id: transactionsTable.id, amount: transactionsTable.amount })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), eq(transactionsTable.type, "borrow"), isNull(transactionsTable.parentTransactionId), lte(transactionsTable.date, endOfMonth)));

  const totalLent = lendTxs.reduce((acc, t) => acc + parseFloat(t.amount as string), 0);
  const totalBorrowed = borrowTxs.reduce((acc, t) => acc + parseFloat(t.amount as string), 0);

  // All repayments up to end of selected month
  const allRepayments = await db
    .select({ parentTransactionId: transactionsTable.parentTransactionId, amount: transactionsTable.amount })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), lte(transactionsTable.date, endOfMonth)));

  const repaymentsByParent = allRepayments.reduce<Record<number, number>>((acc, r) => {
    if (r.parentTransactionId) {
      acc[r.parentTransactionId] = (acc[r.parentTransactionId] || 0) + parseFloat(r.amount as string);
    }
    return acc;
  }, {});

  const lendRepaid = lendTxs.reduce((s, tx) => s + (repaymentsByParent[tx.id as number] || 0), 0);
  const borrowRepaid = borrowTxs.reduce((s, tx) => s + (repaymentsByParent[tx.id as number] || 0), 0);
  const lendUnpaid = totalLent - lendRepaid;
  const borrowUnpaid = totalBorrowed - borrowRepaid;

  const totalEarned = sum(monthTxs as Array<Record<string, unknown>>, "earn");
  const totalBalance = totalEarned - totalSpent + totalBorrowed - totalLent + lendRepaid - borrowRepaid;
  const todaySpend = sum(todayTxs as Array<Record<string, unknown>>, "spend");
  const monthlySpend = totalSpent;
  const monthlyEarn = totalEarned;
  const savingPercentage = monthlyEarn > 0 ? Math.max(0, ((monthlyEarn - monthlySpend) / monthlyEarn) * 100) : 0;

  res.json({
    totalBalance,
    totalEarned,
    totalSpent,
    totalLent,
    totalBorrowed,
    lendRepaid,
    lendUnpaid,
    borrowRepaid,
    borrowUnpaid,
    todaySpend,
    monthlySpend,
    savingPercentage: Math.round(savingPercentage * 10) / 10,
  });
});

router.get("/dashboard/monthly-breakdown", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user.id;
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const txs = await db
    .select({
      type: transactionsTable.type,
      amount: transactionsTable.amount,
      date: transactionsTable.date,
    })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), gte(transactionsTable.date, sixMonthsAgo)));

  const months: Record<string, { month: string; earned: number; spent: number; lent: number; borrowed: number }> = {};

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
    months[key] = { month: label, earned: 0, spent: 0, lent: 0, borrowed: 0 };
  }

  for (const tx of txs) {
    const d = new Date(tx.date as string | number | Date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!months[key]) continue;
    const amt = parseFloat(tx.amount as string);
    if (tx.type === "earn") months[key].earned += amt;
    else if (tx.type === "spend") months[key].spent += amt;
    else if (tx.type === "lend") months[key].lent += amt;
    else if (tx.type === "borrow") months[key].borrowed += amt;
  }

  res.json(Object.values(months));
});

router.get("/dashboard/category-breakdown", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user.id;
  const now = new Date();
  const reqMonth = req.query.month ? parseInt(req.query.month as string) : now.getMonth() + 1;
  const reqYear = req.query.year ? parseInt(req.query.year as string) : now.getFullYear();
  const startOfMonth = new Date(reqYear, reqMonth - 1, 1);
  const endOfMonth = new Date(reqYear, reqMonth, 0, 23, 59, 59, 999);

  const txs = await db
    .select({
      type: transactionsTable.type,
      amount: transactionsTable.amount,
      categoryId: transactionsTable.categoryId,
    })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.userId, userId),
        eq(transactionsTable.type, "spend"),
        isNull(transactionsTable.parentTransactionId),
        gte(transactionsTable.date, startOfMonth),
        lte(transactionsTable.date, endOfMonth),
      ),
    );

  const groups: Record<
    string,
    { categoryId: number | null; categoryName: string; categoryColor: string; categoryIcon: string; total: number; count: number }
  > = {};

  // Fetch all categories for this user
  const categories = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.userId, userId));

  const categoryMap = new Map(categories.map((c: any) => [c.id, c]));

  for (const tx of txs) {
    const key = tx.categoryId != null ? String(tx.categoryId) : "uncategorized";
    if (!groups[key]) {
      const category = tx.categoryId ? categoryMap.get(tx.categoryId as number) : null;
      groups[key] = {
        categoryId: tx.categoryId as number | null,
        categoryName: category?.name ?? "Uncategorized",
        categoryColor: category?.color ?? "#6B7280",
        categoryIcon: category?.icon ?? "tag",
        total: 0,
        count: 0,
      };
    }
    groups[key].total += parseFloat(tx.amount as string);
    groups[key].count += 1;
  }

  res.json(Object.values(groups).sort((a, b) => b.total - a.total));
});

export default router;
