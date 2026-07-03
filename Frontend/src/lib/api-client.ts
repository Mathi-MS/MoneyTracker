import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch } from "./auth";

function buildQueryString(params?: Record<string, any>) {
  if (!params) return "";

  const filteredParams = Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value === undefined || value === null) return acc;
    acc[key] = String(value);
    return acc;
  }, {});

  return Object.keys(filteredParams).length ? `?${new URLSearchParams(filteredParams).toString()}` : "";
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export function useGetDashboardSummary(params?: { month?: number; year?: number }) {
  const query = buildQueryString(params);
  return useQuery({ queryKey: ["dashboard", "summary", params], queryFn: () => apiFetch(`/api/dashboard/summary${query}`) });
}

export function useGetMonthlyBreakdown() {
  return useQuery({ queryKey: ["dashboard", "monthly"], queryFn: () => apiFetch("/api/dashboard/monthly-breakdown") });
}

export function useGetCategoryBreakdown(params?: { month?: number; year?: number }) {
  const query = buildQueryString(params);
  return useQuery({ queryKey: ["dashboard", "category", params], queryFn: () => apiFetch(`/api/dashboard/category-breakdown${query}`) });
}

// ── Transactions ───────────────────────────────────────────────────────────
export function useListTransactions(params?: Record<string, any>) {
  const query = buildQueryString(params);
  return useQuery({ queryKey: ["transactions", params], queryFn: () => apiFetch(`/api/transactions${query}`) });
}

export function useGetTransaction(id: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["transactions", id],
    queryFn: () => apiFetch(`/api/transactions/${id}`),
    enabled: options?.enabled ?? true,
  });
}

export function getGetTransactionQueryKey(id: number) {
  return ["transactions", id];
}

export function useCreateTransaction() {
  return useMutation({ mutationFn: ({ data }: { data: any }) => apiFetch("/api/transactions", { method: "POST", body: JSON.stringify(data) }) });
}

export function useGetTransactionHistory(parentTransactionId?: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["transactions", "history", parentTransactionId],
    enabled: Boolean(parentTransactionId) && (options?.enabled ?? true),
    queryFn: () => apiFetch(`/api/transactions?parentTransactionId=${parentTransactionId}`),
  });
}

export function useUpdateTransaction() {
  return useMutation({ mutationFn: ({ id, data }: { id: number; data: any }) => apiFetch(`/api/transactions/${id}`, { method: "PATCH", body: JSON.stringify(data) }) });
}

export function useDeleteTransaction() {
  return useMutation({ mutationFn: ({ id }: { id: number }) => apiFetch(`/api/transactions/${id}`, { method: "DELETE" }) });
}

// ── Categories ─────────────────────────────────────────────────────────────
export function useListCategories(params?: Record<string, any>) {
  const query = buildQueryString(params);
  return useQuery({ queryKey: ["categories", params], queryFn: () => apiFetch(`/api/categories${query}`) });
}

export function useCreateCategory() {
  return useMutation({ mutationFn: ({ data }: { data: any }) => apiFetch("/api/categories", { method: "POST", body: JSON.stringify(data) }) });
}

export function useUpdateCategory() {
  return useMutation({ mutationFn: ({ id, data }: { id: number; data: any }) => apiFetch(`/api/categories/${id}`, { method: "PATCH", body: JSON.stringify(data) }) });
}

export function useDeleteCategory() {
  return useMutation({ mutationFn: ({ id }: { id: number }) => apiFetch(`/api/categories/${id}`, { method: "DELETE" }) });
}

// ── Persons ────────────────────────────────────────────────────────────────
export function useListPersons(params?: Record<string, any>) {
  const query = buildQueryString(params);
  return useQuery({ queryKey: ["persons", params], queryFn: () => apiFetch(`/api/persons${query}`) });
}

export function useCreatePerson() {
  return useMutation({ mutationFn: ({ data }: { data: any }) => apiFetch("/api/persons", { method: "POST", body: JSON.stringify(data) }) });
}

export function useUpdatePerson() {
  return useMutation({ mutationFn: ({ id, data }: { id: number; data: any }) => apiFetch(`/api/persons/${id}`, { method: "PATCH", body: JSON.stringify(data) }) });
}

export function useDeletePerson() {
  return useMutation({ mutationFn: ({ id }: { id: number }) => apiFetch(`/api/persons/${id}`, { method: "DELETE" }) });
}
