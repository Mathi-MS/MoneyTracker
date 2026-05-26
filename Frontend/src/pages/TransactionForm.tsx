import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetTransaction, getGetTransactionQueryKey,
  useCreateTransaction, 
  useUpdateTransaction,
  useDeleteTransaction,
  useListCategories,
  useListPersons,
  useGetDashboardSummary,
  useGetTransactionHistory,
} from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Trash2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

export default function TransactionForm({ params }: { params?: { id?: string; params?: { id?: string } } }) {
  const id = params?.params?.id || params?.id;
  const isEdit = !!id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();



  const searchParams = new URLSearchParams(window.location.search);
  const initialType = searchParams.get("type") || "spend";

  const { data: transaction, isLoading: isLoadingTx, error: txError } = useGetTransaction(Number(id), {
    enabled: isEdit,
  });

  useEffect(() => {
    if (txError) {
      console.error("Error fetching transaction:", txError);
      toast({ title: "Failed to load transaction", variant: "destructive" });
    }
  }, [txError, toast]);

  const { data: categories } = useListCategories();
  const { data: persons } = useListPersons();
  const { data: dashboard } = useGetDashboardSummary();
  const historyQuery = useGetTransactionHistory(Number(id), { enabled: isEdit && Boolean(Number(id)) });

  const createTx = useCreateTransaction();
  const updateTx = useUpdateTransaction();
  const deleteTx = useDeleteTransaction();

  const [formData, setFormData] = useState({
    type: initialType,
    amount: "",
    categoryId: "none",
    personId: "none",
    status: "unpaid",
    date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
    paymentMethod: "Cash"
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [repaymentAmount, setRepaymentAmount] = useState("");
  const [showRepaymentDialog, setShowRepaymentDialog] = useState(false);

  useEffect(() => {
    if (isEdit && transaction) {

      const txDate = transaction.date
        ? (typeof transaction.date === 'string' ? transaction.date.substring(0, 10) : new Date(transaction.date).toISOString().substring(0, 10))
        : format(new Date(), 'yyyy-MM-dd');

      setFormData({
        type: transaction.type,
        amount: transaction.amount.toString(),
        categoryId: transaction.categoryId ? transaction.categoryId.toString() : "none",
        personId: transaction.personId ? transaction.personId.toString() : "none",
        status: transaction.status || "unpaid",
        date: txDate,
        notes: transaction.notes || "",
        paymentMethod: transaction.paymentMethod || "Cash"
      });
      
      // If this is a repayment transaction, set the amount in repayment field
      if (transaction.parentTransactionId) {
        setRepaymentAmount(transaction.amount.toString());
      }
      

    }
  }, [isEdit, transaction]);

  const handleTypeChange = (newType: string) => {
    setFormData(f => ({
      ...f,
      type: newType,
      categoryId: "none",
      personId: "none",
    }));
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    }

    if (!formData.date) {
      newErrors.date = "Date is required";
    }

    if (['spend', 'earn'].includes(formData.type) && formData.categoryId === "none") {
      newErrors.categoryId = "Category is required for spend/earn transactions";
    }

    if (['lend', 'borrow'].includes(formData.type) && formData.personId === "none") {
      newErrors.personId = "Person is required for lend/borrow transactions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRepaymentUpdate = () => {
    const repayAmount = parseFloat(repaymentAmount);
    if (isNaN(repayAmount) || repayAmount <= 0) {
      toast({ title: "Enter a valid repayment amount", variant: "destructive" });
      return;
    }

    if (!transaction || !transaction.parentTransactionId) {
      toast({ title: "Parent transaction not found", variant: "destructive" });
      return;
    }

    // Fetch parent transaction to validate
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/transactions/${transaction.parentTransactionId}`, {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("pf_token")}`,
      },
    })
      .then(res => res.json())
      .then(parentTx => {
        // Fetch all repayments for this parent
        return fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/transactions?parentTransactionId=${transaction.parentTransactionId}`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("pf_token")}`,
          },
        })
          .then(res => res.json())
          .then(repayments => {
            // Calculate total repaid excluding current transaction
            const totalRepaid = repayments
              .filter((r: any) => r.id !== transaction.id)
              .reduce((sum: number, entry: any) => sum + (parseFloat(entry.amount) || 0), 0);

            const remainingBalance = parentTx.amount - totalRepaid;

            if (repayAmount > remainingBalance) {
              toast({ 
                title: "Repayment exceeds remaining balance", 
                description: `Remaining balance: ${formatCurrency(remainingBalance)}`,
                variant: "destructive" 
              });
              return;
            }

            // Proceed with update
            updateTx.mutate(
              { 
                id: Number(id), 
                data: { amount: repayAmount } 
              },
              {
                onSuccess: () => {
                  queryClient.invalidateQueries();
                  toast({ title: "Repayment updated" });
                  setLocation("/transactions");
                },
                onError: (error: unknown) => {
                  const message = error instanceof Error ? error.message : "Unable to update repayment";
                  toast({ title: message, variant: "destructive" });
                },
              }
            );
          });
      })
      .catch(error => {
        console.error("Error validating repayment:", error);
        toast({ title: "Unable to validate repayment", variant: "destructive" });
      });
  };

  const handleRepaymentSubmit = () => {
    const repayAmount = parseFloat(repaymentAmount);
    if (isNaN(repayAmount) || repayAmount <= 0) {
      toast({ title: "Enter a valid repayment amount", variant: "destructive" });
      return;
    }

    if (!transaction) {
      toast({ title: "Transaction not found", variant: "destructive" });
      return;
    }

    // Calculate total already repaid
    const totalRepaid = historyQuery.data?.reduce((sum: number, entry: any) => {
      return sum + (parseFloat(entry.amount) || 0);
    }, 0) || 0;

    // Calculate remaining balance
    const remainingBalance = transaction.amount - totalRepaid;

    if (repayAmount > remainingBalance) {
      toast({ 
        title: "Repayment exceeds remaining balance", 
        description: `Remaining balance: ${formatCurrency(remainingBalance)}`,
        variant: "destructive" 
      });
      return;
    }

    const repaymentType = formData.type === "borrow" ? "spend" : "earn";

    createTx.mutate(
      {
        data: {
          type: repaymentType,
          amount: repayAmount,
          personId: formData.personId === "none" ? null : Number(formData.personId),
          categoryId: null,
          date: new Date().toISOString(),
          notes: `Repayment for ${formData.type} transaction #${id}`,
          paymentMethod: formData.paymentMethod,
          parentTransactionId: Number(id),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Repayment recorded" });
          queryClient.invalidateQueries();
          setShowRepaymentDialog(false);
          setRepaymentAmount("");
        },
        onError: (error: unknown) => {
          const message = error instanceof Error ? error.message : "Unable to record repayment";
          toast({ title: message, variant: "destructive" });
        },
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({ title: "Please fix the errors", variant: "destructive" });
      return;
    }

    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    const payload = {
      type: formData.type as any,
      amount: amountNum,
      categoryId: formData.categoryId === "none" ? null : Number(formData.categoryId),
      personId: formData.personId === "none" ? null : Number(formData.personId),
      status: formData.status,
      date: new Date(formData.date).toISOString(),
      notes: formData.notes,
      paymentMethod: formData.paymentMethod
    };



    const handleMutationError = (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to save transaction";
      toast({ title: message, variant: "destructive" });
    };

    if (isEdit) {
      updateTx.mutate({ id: Number(id), data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries();
          toast({ title: "Transaction updated" });
          setLocation("/transactions");
        },
        onError: handleMutationError,
      });
    } else {
      createTx.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries();
          toast({ title: "Transaction created" });
          setLocation("/transactions");
        },
        onError: handleMutationError,
      });
    }
  };

  const handleDelete = () => {
    if (!confirm("Delete transaction?")) return;
    deleteTx.mutate({ id: Number(id) }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast({ title: "Transaction deleted" });
        setLocation("/transactions");
      }
    });
  };

  const isPending = createTx.isPending || updateTx.isPending;

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={() => setLocation("/transactions")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-bold text-lg">{isEdit ? "Edit Transaction" : "New Transaction"}</span>
        </div>
        {isEdit && (
          <Button variant="ghost" size="icon" className="text-destructive w-8 h-8 rounded-full" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </header>

      <div className="p-4 max-w-lg mx-auto pb-24">
        {isEdit && isLoadingTx ? (
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-secondary/50 rounded-xl" />
            <div className="h-24 bg-secondary/50 rounded-xl" />
            <div className="h-12 bg-secondary/50 rounded-xl" />
          </div>
        ) : transaction?.parentTransactionId ? (
          // Simplified form for repayment transactions
          <div className="space-y-6">
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/30 rounded-2xl">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Repayment Transaction</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Repayment Amount *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">₹</span>
                <Input 
                  type="number" 
                  step="0.01" 
                  autoFocus
                  required
                  value={repaymentAmount}
                  onChange={e => setRepaymentAmount(e.target.value)}
                  className="pl-10 h-16 text-3xl font-bold rounded-2xl bg-card border-border/50"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Notes:</p>
              <p className="text-sm">{transaction.notes || "No notes"}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Date:</p>
              <p className="text-sm">{new Date(transaction.date).toLocaleDateString()}</p>
            </div>

            <Button 
              type="button"
              onClick={handleRepaymentUpdate}
              disabled={updateTx.isPending} 
              className="w-full h-14 text-lg font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              {updateTx.isPending ? "Updating..." : "Update Repayment"}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Type selector - only show in create mode */}
            {!isEdit && (
              <div className="grid grid-cols-4 gap-2 bg-secondary/30 p-1.5 rounded-2xl">
                {['spend', 'earn', 'lend', 'borrow'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`py-2 px-1 text-xs font-semibold rounded-xl capitalize transition-all ${
                      formData.type === t 
                        ? 'bg-card shadow-sm text-foreground' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {/* Type display in edit mode */}
            {isEdit && (
              <div className="flex items-center justify-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/30 rounded-2xl">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type:</span>
                  <span className="text-sm font-bold capitalize">{formData.type}</span>
                </div>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">₹</span>
                <Input 
                  type="number" 
                  step="0.01" 
                  autoFocus={!isEdit}
                  required
                  value={formData.amount}
                  onChange={e => {
                    setFormData(f => ({ ...f, amount: e.target.value }));
                    if (errors.amount) setErrors(e => ({ ...e, amount: "" }));
                  }}
                  className={`pl-10 h-16 text-3xl font-bold rounded-2xl bg-card border-border/50 ${
                    errors.amount ? 'border-red-500' : ''
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.amount && <p className="text-xs text-red-500">{errors.amount}</p>}
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date *</label>
                <div className="relative">
                  <Input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={e => {
                      setFormData(f => ({ ...f, date: e.target.value }));
                      if (errors.date) setErrors(e => ({ ...e, date: "" }));
                    }}
                    className={`h-12 rounded-xl bg-card border-border/50 ${
                      errors.date ? 'border-red-500' : ''
                    }`}
                  />
                </div>
                {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Method</label>
                <Select key={`payment-${formData.paymentMethod}`} value={formData.paymentMethod} onValueChange={v => setFormData(f => ({ ...f, paymentMethod: v }))}>
                  <SelectTrigger className="h-12 rounded-xl bg-card border-border/50">
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Debit Card">Debit Card</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Conditional fields based on type */}
            <div className="space-y-4">
              {['spend', 'earn'].includes(formData.type) ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category *</label>
                  <Select 
                    key={`category-${formData.categoryId}`}
                    value={formData.categoryId} 
                    onValueChange={v => {
                      setFormData(f => ({ ...f, categoryId: v }));
                      if (errors.categoryId) setErrors(e => ({ ...e, categoryId: "" }));
                    }}
                  >
                    <SelectTrigger className={`h-12 rounded-xl bg-card border-border/50 ${
                      errors.categoryId ? 'border-red-500' : ''
                    }`}>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {categories?.filter((c: any) => c.type === formData.type).map((c: any) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          <span className="flex items-center gap-2">
                            <span className="w-4">{c.icon}</span> {c.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.categoryId && <p className="text-xs text-red-500">{errors.categoryId}</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Person *</label>
                  <Select 
                    key={`person-${formData.personId}`}
                    value={formData.personId} 
                    onValueChange={v => {
                      setFormData(f => ({ ...f, personId: v }));
                      if (errors.personId) setErrors(e => ({ ...e, personId: "" }));
                    }}
                  >
                    <SelectTrigger className={`h-12 rounded-xl bg-card border-border/50 ${
                      errors.personId ? 'border-red-500' : ''
                    }`}>
                      <SelectValue placeholder="Select Person" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Person</SelectItem>
                      {persons?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.personId && <p className="text-xs text-red-500">{errors.personId}</p>}
                  {/* Status selector for lend/borrow transactions */}
                  {(formData.type === 'lend' || formData.type === 'borrow') && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
                      <Select key={`status-${formData.status}`} value={formData.status} onValueChange={v => setFormData(f => ({ ...f, status: v }))}>
                        <SelectTrigger className="h-12 rounded-xl bg-card border-border/50">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                          <SelectItem value="partial">Partially Repaid</SelectItem>
                          <SelectItem value="paid">Repaid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</label>
                <Textarea 
                  value={formData.notes}
                  onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                  className="rounded-xl bg-card border-border/50 resize-none"
                  placeholder="What was this for?"
                  rows={3}
                />
              </div>
              {/* Repayment history (for lend/borrow parent transactions) */}
              {isEdit && (formData.type === 'lend' || formData.type === 'borrow') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Repayment History</h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowRepaymentDialog(true)}
                      className="rounded-xl"
                    >
                      Add Repayment
                    </Button>
                  </div>
                  {historyQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading history…</p>
                  ) : historyQuery.data && historyQuery.data.length > 0 ? (
                    <div className="space-y-2">
                      {historyQuery.data.map((entry: any) => (
                        <div key={entry.id} className="rounded-2xl border border-border/50 bg-background p-3 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{entry.type}</p>
                              <p className="text-sm text-muted-foreground">{new Date(entry.date).toLocaleDateString()}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">{entry.notes || "Repayment entry"}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="font-semibold">{formatCurrency(entry.amount)}</p>
                            <Button variant="ghost" size="sm" onClick={() => setLocation(`/transactions/${entry.id}/edit`)}>Edit</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No repayment history found for this transaction.</p>
                  )}
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={isPending} 
              className="w-full h-14 text-lg font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              {isPending ? "Saving..." : isEdit ? "Save Changes" : "Save Transaction"}
            </Button>
          </form>
        )}
      </div>

      {/* Repayment Dialog */}
      <Dialog open={showRepaymentDialog} onOpenChange={setShowRepaymentDialog}>
        <DialogContent className="max-w-md w-[95vw] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle>Record Repayment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Original {formData.type} amount:</p>
              <p className="text-lg font-semibold">{transaction ? formatCurrency(transaction.amount) : "-"}</p>
            </div>

            {historyQuery.data && historyQuery.data.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Already repaid:</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(
                    historyQuery.data.reduce((sum: number, entry: any) => sum + (parseFloat(entry.amount) || 0), 0)
                  )}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Remaining balance:</p>
              <p className="text-lg font-semibold text-orange-600">
                {transaction && historyQuery.data
                  ? formatCurrency(
                      transaction.amount -
                        historyQuery.data.reduce((sum: number, entry: any) => sum + (parseFloat(entry.amount) || 0), 0)
                    )
                  : transaction
                  ? formatCurrency(transaction.amount)
                  : "-"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Repayment amount</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={repaymentAmount}
                onChange={(e) => setRepaymentAmount(e.target.value)}
                className="h-12 rounded-xl"
                placeholder="Enter amount"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowRepaymentDialog(false)} type="button" className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleRepaymentSubmit} type="button" disabled={createTx.isPending} className="w-full sm:w-auto">
                {createTx.isPending ? "Recording..." : "Record Repayment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}