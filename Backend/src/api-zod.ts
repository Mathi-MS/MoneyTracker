import { z } from "zod";

// ── Auth ───────────────────────────────────────────────────────────────────
export const AuthUser = z.object({
  id: z.string(),
  email: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  profileImageUrl: z.string().nullable(),
});
export type AuthUser = z.infer<typeof AuthUser>;

export const GetCurrentAuthUserResponse = z.object({
  user: AuthUser.nullable(),
});

export const ExchangeMobileAuthorizationCodeBody = z.object({
  code: z.string(),
  code_verifier: z.string(),
  redirect_uri: z.string(),
  state: z.string(),
  nonce: z.string().nullable().optional(),
});

export const ExchangeMobileAuthorizationCodeResponse = z.object({
  token: z.string(),
});

export const LogoutMobileSessionResponse = z.object({
  success: z.boolean(),
});

// ── Health ─────────────────────────────────────────────────────────────────
export const HealthCheckResponse = z.object({
  status: z.string(),
});

// ── Categories ─────────────────────────────────────────────────────────────
export const ListCategoriesQueryParams = z.object({
  search: z.string().optional(),
});

export const CreateCategoryBody = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  icon: z.string().optional().default("tag"),
  color: z.string().optional().default("#6B7280"),
});

export const UpdateCategoryParams = z.object({
  id: z.coerce.number(),
});

export const UpdateCategoryBody = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export const DeleteCategoryParams = z.object({
  id: z.coerce.number(),
});

// ── Persons ────────────────────────────────────────────────────────────────
export const ListPersonsQueryParams = z.object({
  search: z.string().optional(),
});

export const CreatePersonBody = z.object({
  name: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const UpdatePersonParams = z.object({
  id: z.coerce.number(),
});

export const UpdatePersonBody = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const DeletePersonParams = z.object({
  id: z.coerce.number(),
});

// ── Transactions ───────────────────────────────────────────────────────────
export const ListTransactionsQueryParams = z.object({
  type: z.string().optional(),
  categoryId: z.coerce.number().optional(),
  personId: z.coerce.number().optional(),
  parentTransactionId: z.coerce.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
});

const TransactionType = z.enum(["spend", "earn", "lend", "borrow"]);
export type TransactionType = z.infer<typeof TransactionType>;

export const CreateTransactionBody = z.object({
  type: TransactionType,
  categoryId: z.number().nullable().optional(),
  personId: z.number().nullable().optional(),
  parentTransactionId: z.number().nullable().optional(),
  amount: z.number().positive(),
  date: z.string(),
  notes: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
});

export const GetTransactionParams = z.object({
  id: z.coerce.number(),
});

export const UpdateTransactionParams = z.object({
  id: z.coerce.number(),
});

export const UpdateTransactionBody = z.object({
  type: TransactionType.optional(),
  categoryId: z.number().nullable().optional(),
  personId: z.number().nullable().optional(),
  parentTransactionId: z.number().nullable().optional(),
  amount: z.number().positive().optional(),
  date: z.string().optional(),
  notes: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
});

export const DeleteTransactionParams = z.object({
  id: z.coerce.number(),
});
