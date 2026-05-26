import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import { eq, and, ilike, gte, lte, inArray, isNull, isNotNull } from "../db";
import { db, transactionsTable, categoriesTable, personsTable } from "../db";

declare global {
  namespace Express {
    interface User {
      id: string;
    }
  }
}
import {
  ListTransactionsQueryParams,
  CreateTransactionBody,
  GetTransactionParams,
  UpdateTransactionParams,
  UpdateTransactionBody,
  DeleteTransactionParams,
} from "../api-zod";

const router: IRouter = Router();

type TransactionType = "spend" | "earn" | "lend" | "borrow";

function isSpendOrLend(type: TransactionType) {
  return type === "spend" || type === "lend";
}

function applyTransaction(balance: number, type: TransactionType, amount: number) {
  if (type === "spend" || type === "lend") return balance - amount;
  return balance + amount;
}

function revertTransaction(balance: number, type: TransactionType, amount: number) {
  if (type === "spend" || type === "lend") return balance + amount;
  return balance - amount;
}

async function calculateBalance(userId: number | string) {
  const txs = await db
    .select({ type: transactionsTable.type, amount: transactionsTable.amount })
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId));

  return txs.reduce((balance, tx) => {
    const amount = parseFloat(tx.amount as unknown as string);
    if (Number.isNaN(amount)) return balance;

    const type = tx.type as TransactionType;
    if (!type || !["spend", "earn", "lend", "borrow"].includes(type)) return balance;
    return applyTransaction(balance, type, amount);
  }, 0);
}

async function refreshParentRepaymentStatus(parentTransactionId: number, userId: string | number) {
  const [parentTx] = await db
    .select({ type: transactionsTable.type, amount: transactionsTable.amount })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.id, parentTransactionId), eq(transactionsTable.userId, userId)));

  if (!parentTx) return;
  if (parentTx.type !== "lend" && parentTx.type !== "borrow") return;

  const payments = await db
    .select({ amount: transactionsTable.amount })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.parentTransactionId, parentTransactionId), eq(transactionsTable.userId, userId)));

  const totalPaid = payments.reduce((sum, tx) => {
    const amount = parseFloat(tx.amount as unknown as string);
    return sum + (Number.isNaN(amount) ? 0 : amount);
  }, 0);

  const originalAmount = parseFloat(parentTx.amount as unknown as string);
  if (Number.isNaN(originalAmount)) return;

  const newStatus = totalPaid >= originalAmount ? "paid" : "unpaid";
  await db
    .update(transactionsTable)
    .set({ status: newStatus })
    .where(and(eq(transactionsTable.id, parentTransactionId), eq(transactionsTable.userId, userId)))
    .returning();
}

function buildTransactionWithRelations(tx: typeof transactionsTable.$inferSelect & {
  category?: typeof categoriesTable.$inferSelect | null;
  person?: typeof personsTable.$inferSelect | null;
}) {
  return {
    ...tx,
    amount: parseFloat(tx.amount as unknown as string),
  };
}

async function enrichDebtStatuses(txs: Array<any>, userId: string | number) {
  const parentIds = txs
    .filter((tx) =>
      (tx.type === "lend" || tx.type === "borrow") && (tx.parentTransactionId === undefined || tx.parentTransactionId === null),
    )
    .map((tx) => tx.id);

  if (!parentIds.length) return txs;

  const payments = await db
    .select({
      parentTransactionId: transactionsTable.parentTransactionId,
      amount: transactionsTable.amount,
    })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), inArray(transactionsTable.parentTransactionId, parentIds)));

  const totals = payments.reduce<Record<string, number>>((acc, tx) => {
    const parentId = String(tx.parentTransactionId);
    const amount = parseFloat(tx.amount as unknown as string);
    if (Number.isNaN(amount)) return acc;
    acc[parentId] = (acc[parentId] ?? 0) + amount;
    return acc;
  }, {} as Record<string, number>);

  return txs.map((tx) => {
    if (tx.type === "lend" || tx.type === "borrow") {
      const parentTotal = totals[String(tx.id)] ?? 0;
      const originalAmount = parseFloat(tx.amount as unknown as string);
      if (!Number.isNaN(originalAmount)) {
        tx.status = parentTotal >= originalAmount ? "paid" : "unpaid";
      }
    }
    return tx;
  });
}

router.get("/transactions", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const query = ListTransactionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const queryData = query.data as z.infer<typeof ListTransactionsQueryParams>;

  const conditions = [eq(transactionsTable.userId, req.user.id)];
  if (queryData.type === "repayment") {
    conditions.push(isNotNull(transactionsTable.parentTransactionId));
  } else if (queryData.type) {
    conditions.push(eq(transactionsTable.type, queryData.type));
    conditions.push(isNull(transactionsTable.parentTransactionId));
  }
  if (queryData.categoryId) {
    conditions.push(eq(transactionsTable.categoryId, queryData.categoryId));
  }
  if (queryData.personId) {
    conditions.push(eq(transactionsTable.personId, queryData.personId));
  }
  if (queryData.parentTransactionId !== undefined) {
    conditions.push(eq(transactionsTable.parentTransactionId, queryData.parentTransactionId));
  }
  if (queryData.startDate) {
    conditions.push(gte(transactionsTable.date, new Date(queryData.startDate)));
  }
  if (queryData.endDate) {
    conditions.push(lte(transactionsTable.date, new Date(queryData.endDate)));
  }

  const baseQuery = db
    .select({
      id: transactionsTable.id,
      userId: transactionsTable.userId,
      type: transactionsTable.type,
      categoryId: transactionsTable.categoryId,
      personId: transactionsTable.personId,
      parentTransactionId: transactionsTable.parentTransactionId,
      amount: transactionsTable.amount,
      date: transactionsTable.date,
      notes: transactionsTable.notes,
      paymentMethod: transactionsTable.paymentMethod,
      status: transactionsTable.status,
      createdAt: transactionsTable.createdAt,
      category: {
        id: categoriesTable.id,
        userId: categoriesTable.userId,
        name: categoriesTable.name,
        type: categoriesTable.type,
        icon: categoriesTable.icon,
        color: categoriesTable.color,
        createdAt: categoriesTable.createdAt,
      },
      person: {
        id: personsTable.id,
        userId: personsTable.userId,
        name: personsTable.name,
        phone: personsTable.phone,
        email: personsTable.email,
        notes: personsTable.notes,
        createdAt: personsTable.createdAt,
      },
    })
    .from(transactionsTable)
    .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
    .leftJoin(personsTable, eq(transactionsTable.personId, personsTable.id))
    .where(and(...conditions));

  if (query.data.search) {
    const searchLower = query.data.search.toLowerCase();
    const all = (await baseQuery) as Array<{
      notes?: string | null;
      category?: { name: string } | null;
      person?: { name: string } | null;
      date: Date;
    }>;
    const filtered = all.filter(
      (t) =>
        t.notes?.toLowerCase().includes(searchLower) ||
        t.category?.name.toLowerCase().includes(searchLower) ||
        t.person?.name.toLowerCase().includes(searchLower),
    );
    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const sliced = query.data.limit
      ? filtered.slice(query.data.offset ?? 0, (query.data.offset ?? 0) + query.data.limit)
      : filtered;
    const enriched = await enrichDebtStatuses(sliced, req.user.id);
    res.json(enriched.map(buildTransactionWithRelations));
    return;
  }

  // Fetch all transactions first
  let txs = await baseQuery;
  // Sort by id descending (newest first - higher id = newer transaction)
  txs.sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
  
  // Apply limit and offset after sorting
  if (query.data.offset) {
    txs = txs.slice(query.data.offset);
  }
  if (query.data.limit) {
    txs = txs.slice(0, query.data.limit);
  }
  
  const enriched = await enrichDebtStatuses(txs, req.user.id);
  res.json(enriched.map(buildTransactionWithRelations));
});

router.post("/transactions", async (req, res): Promise<void> => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const parsed = CreateTransactionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const currentBalance = await calculateBalance(req.user.id);
    if (Number.isNaN(currentBalance)) {
      res.status(500).json({ error: "Unable to calculate current balance" });
      return;
    }

    const projectedBalance = applyTransaction(currentBalance, parsed.data.type, parsed.data.amount);
    if (projectedBalance < 0) {
      res.status(400).json({ error: "Insufficient balance for spend or lend transaction" });
      return;
    }

    const isDebt = parsed.data.type === "lend" || parsed.data.type === "borrow";
    const [tx] = await db
      .insert(transactionsTable)
      .values({
        ...parsed.data,
        userId: req.user.id,
        date: new Date(parsed.data.date),
        amount: String(parsed.data.amount),
        parentTransactionId: parsed.data.parentTransactionId ?? null,
        status: parsed.data.parentTransactionId
          ? parsed.data.status ?? null
          : isDebt
          ? "unpaid"
          : parsed.data.status ?? null,
      })
      .returning();

    if (!tx) {
      res.status(500).json({ error: "Unable to create transaction" });
      return;
    }

    if (parsed.data.parentTransactionId !== undefined && parsed.data.parentTransactionId !== null) {
      await refreshParentRepaymentStatus(parsed.data.parentTransactionId, req.user.id);
    }

    const full = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, tx.id));
    
    if (!full || full.length === 0) {
      res.status(500).json({ error: "Transaction created but could not be retrieved" });
      return;
    }

    res.status(201).json(buildTransactionWithRelations(full[0]));
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) });
  }
});

router.get("/transactions/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = GetTransactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const txs = await db
    .select()
    .from(transactionsTable)
    .where(and(eq(transactionsTable.id, params.data.id), eq(transactionsTable.userId, req.user.id)));

  if (!txs || txs.length === 0) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  const tx = txs[0] as any;

  let category = null;
  if (tx.categoryId) {
    const cats = await db.select().from(categoriesTable).where(eq(categoriesTable.id, tx.categoryId));
    category = cats[0] || null;
  }

  let person = null;
  if (tx.personId) {
    const persons = await db.select().from(personsTable).where(eq(personsTable.id, tx.personId));
    person = persons[0] || null;
  }

  res.json(buildTransactionWithRelations({
    ...tx,
    category,
    person,
  }));
});

router.patch("/transactions/:id", async (req, res): Promise<void> => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const params = UpdateTransactionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateTransactionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [existingTx] = (await db
      .select({ type: transactionsTable.type, amount: transactionsTable.amount })
      .from(transactionsTable)
      .where(and(eq(transactionsTable.id, params.data.id), eq(transactionsTable.userId, req.user.id)))) as Array<{ type: TransactionType; amount: string }>;

    if (!existingTx) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    const previousAmount = parseFloat(existingTx.amount);
    if (Number.isNaN(previousAmount)) {
      res.status(500).json({ error: "Invalid existing transaction amount" });
      return;
    }

    const newType = parsed.data.type ?? existingTx.type;
    const newAmount = parsed.data.amount ?? previousAmount;

    console.log("Update validation:", {
      previousAmount,
      newAmount,
      previousType: existingTx.type,
      newType,
      amountInPayload: parsed.data.amount,
      typeInPayload: parsed.data.type
    });

    // Only validate balance if amount or type actually changed
    const amountChanged = parsed.data.amount !== undefined && Math.abs(newAmount - previousAmount) > 0.001;
    const typeChanged = parsed.data.type !== undefined && newType !== existingTx.type;

    console.log("Change detection:", { amountChanged, typeChanged });

    if (amountChanged || typeChanged) {
      const currentBalance = await calculateBalance(req.user.id);
      if (Number.isNaN(currentBalance)) {
        res.status(500).json({ error: "Unable to calculate current balance" });
        return;
      }

      const balanceWithoutExisting = revertTransaction(currentBalance, existingTx.type, previousAmount);
      const projectedBalance = applyTransaction(balanceWithoutExisting, newType, newAmount);

      if (projectedBalance < 0) {
        res.status(400).json({ error: "Insufficient balance for spend or lend transaction" });
        return;
      }
    }

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.date) updateData.date = new Date(parsed.data.date);
    if (parsed.data.amount !== undefined) updateData.amount = String(parsed.data.amount);

    const [tx] = await db
      .update(transactionsTable)
      .set(updateData)
      .where(and(eq(transactionsTable.id, params.data.id), eq(transactionsTable.userId, req.user.id)))
      .returning();
    if (!tx) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }
    const [full] = await db
      .select({
        id: transactionsTable.id,
        userId: transactionsTable.userId,
        type: transactionsTable.type,
        categoryId: transactionsTable.categoryId,
        personId: transactionsTable.personId,
        parentTransactionId: transactionsTable.parentTransactionId,
        amount: transactionsTable.amount,
        date: transactionsTable.date,
        notes: transactionsTable.notes,
        paymentMethod: transactionsTable.paymentMethod,
        status: transactionsTable.status,
        createdAt: transactionsTable.createdAt,
        category: {
          id: categoriesTable.id,
          userId: categoriesTable.userId,
          name: categoriesTable.name,
          type: categoriesTable.type,
          icon: categoriesTable.icon,
          color: categoriesTable.color,
          createdAt: categoriesTable.createdAt,
        },
        person: {
          id: personsTable.id,
          userId: personsTable.userId,
          name: personsTable.name,
          phone: personsTable.phone,
          email: personsTable.email,
          notes: personsTable.notes,
          createdAt: personsTable.createdAt,
        },
      })
      .from(transactionsTable)
      .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
      .leftJoin(personsTable, eq(transactionsTable.personId, personsTable.id))
      .where(eq(transactionsTable.id, tx.id));
    res.json(buildTransactionWithRelations(full));
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) });
  }
});

router.delete("/transactions/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = DeleteTransactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(transactionsTable)
    .where(and(eq(transactionsTable.id, params.data.id), eq(transactionsTable.userId, req.user.id)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
