import { Router, type IRouter } from "express";
import { eq, and, ilike } from "../db";
import { db, personsTable } from "../db";
import {
  ListPersonsQueryParams,
  CreatePersonBody,
  UpdatePersonParams,
  UpdatePersonBody,
  DeletePersonParams,
} from "../api-zod";

const router: IRouter = Router();

router.get("/persons", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const query = ListPersonsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const conditions = [eq(personsTable.userId, req.user.id)];
  if (query.data.search) {
    conditions.push(ilike(personsTable.name, `%${query.data.search}%`));
  }
  const persons = await db
    .select()
    .from(personsTable)
    .where(and(...conditions))
    .orderBy(personsTable.createdAt);
  res.json(persons);
});

router.post("/persons", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = CreatePersonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [person] = await db
    .insert(personsTable)
    .values({ ...parsed.data, userId: req.user.id })
    .returning();
  res.status(201).json(person);
});

router.patch("/persons/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = UpdatePersonParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePersonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [person] = await db
    .update(personsTable)
    .set(parsed.data)
    .where(and(eq(personsTable.id, params.data.id), eq(personsTable.userId, req.user.id)))
    .returning();
  if (!person) {
    res.status(404).json({ error: "Person not found" });
    return;
  }
  res.json(person);
});

router.delete("/persons/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = DeletePersonParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(personsTable)
    .where(and(eq(personsTable.id, params.data.id), eq(personsTable.userId, req.user.id)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Person not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
