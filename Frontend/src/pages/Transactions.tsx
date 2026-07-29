import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListTransactions, useCreateTransaction, useGetTransactionHistory } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Search, CreditCard, ChevronLeft, ChevronRight } from "lucide-react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

function getRepaymentType(txType: string) {
  return txType === "borrow" ? "spend" : "earn";
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function Transactions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>(searchParams.get("type") || "all");

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const isDebtType = type === "lend" || type === "borrow";

  const queryParams = {
    ...(search ? { search } : {}),
    ...(type && type !== "all" ? { type: type as any } : {}),
    ...(isDebtType ? {} : { startDate, endDate }),
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const { data: transactions, isLoading } = useListTransactions(queryParams);
  const createTx = useCreateTransaction();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [repaymentAmount, setRepaymentAmount] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTx, setHistoryTx] = useState<any>(null);
  const historyQuery = useGetTransactionHistory(historyTx?.id, { enabled: historyOpen && Boolean(historyTx) });

  const openRepaymentDialog = (tx: any) => {
    setSelectedTx(tx);
    setRepaymentAmount(tx.amount?.toString() ?? "");
    setDialogOpen(true);
  };

  const closeRepaymentDialog = () => {
    setDialogOpen(false);
    setSelectedTx(null);
    setRepaymentAmount("");
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      closeRepaymentDialog();
      return;
    }
    setDialogOpen(true);
  };

  const openHistoryDialog = (tx: any) => {
    setHistoryTx(tx);
    setHistoryOpen(true);
  };

  const closeHistoryDialog = () => {
    setHistoryOpen(false);
    setHistoryTx(null);
  };

  const handleTransactionClick = (tx: any) => {
    navigate(`/transactions/${tx.id}/edit`);
  };

  const handleRepaymentSubmit = () => {
    if (!selectedTx) return;

    const amountValue = parseFloat(repaymentAmount);
    if (Number.isNaN(amountValue) || amountValue <= 0) {
      toast({ title: "Enter a valid repayment amount", variant: "destructive" });
      return;
    }

    if (amountValue > selectedTx.amount) {
      toast({ title: "Repayment cannot exceed original amount", variant: "destructive" });
      return;
    }

    createTx.mutate(
      {
        data: {
          type: getRepaymentType(selectedTx.type),
          amount: amountValue,
          personId: selectedTx.personId ?? null,
          categoryId: null,
          date: new Date().toISOString(),
          notes: `Repayment for ${selectedTx.type} transaction #${selectedTx.id}`,
          paymentMethod: selectedTx.paymentMethod || "Cash",
          parentTransactionId: selectedTx.id,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Repayment recorded" });
          queryClient.invalidateQueries();
          closeRepaymentDialog();
        },
        onError: (error: unknown) => {
          const message = error instanceof Error ? error.message : "Unable to record repayment";
          toast({ title: message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <AppLayout>
      <div className="p-4 space-y-4">
        <div className="flex flex-col gap-2 mb-2">
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          {isDebtType ? (
            <p className="text-sm text-muted-foreground">All time</p>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-secondary/50 transition-colors">
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <span className="text-sm text-muted-foreground font-medium">{MONTHS[month - 1]} {year}</span>
              <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-secondary/50 transition-colors">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2 sticky top-16 bg-background/80 backdrop-blur-md z-10 py-2 -mx-4 px-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border/50 rounded-xl"
            />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[110px] bg-card border-border/50 rounded-xl">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="earn">Earn</SelectItem>
              <SelectItem value="spend">Spend</SelectItem>
              <SelectItem value="lend">Lend</SelectItem>
              <SelectItem value="borrow">Borrow</SelectItem>
              <SelectItem value="repayment">Repayment</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 pb-8">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))
          ) : transactions?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="font-medium text-foreground">No transactions found</p>
              <p className="text-sm">Try adjusting your filters or add a new one.</p>
            </div>
          ) : (
            transactions?.filter((tx: any) => type === "all" || (type === "repayment" ? Boolean(tx.parentTransactionId) : !tx.parentTransactionId)).map((tx: any, i: number) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                onClick={() => handleTransactionClick(tx)}
              >
                <div className="flex items-center gap-4 p-3 rounded-xl bg-card border border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer active:scale-[0.98]">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg shadow-sm ${
                    tx.type === 'earn' ? 'bg-emerald-500/10 text-emerald-500' :
                    tx.type === 'spend' ? 'bg-rose-500/10 text-rose-500' :
                    tx.type === 'lend' ? 'bg-blue-500/10 text-blue-500' :
                    'bg-amber-500/10 text-amber-500'
                  }`}>
                    {tx.category ? tx.category.icon : <CreditCard className="w-5 h-5" />}
                  </div>
                  
                              <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-full border border-border/70 bg-muted/80 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-foreground/80">
                        {tx.type}
                      </span>
                      <p className="font-semibold truncate">{tx.category ? tx.category.name : tx.notes || "Transaction"}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                      <span>{new Date(tx.date).toLocaleDateString()}</span>
                      {(tx.type === "lend" || tx.type === "borrow") && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openHistoryDialog(tx);
                          }}
                          className="rounded-full border border-border/70 bg-background px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-foreground/90 hover:bg-secondary/50"
                        >
                          {tx.status
                            ? (tx.status === 'paid' || tx.status === 'repaid') ? 'Repaid' : tx.status
                            : 'Unpaid'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className={`font-bold text-sm ${
                    tx.type === 'earn' ? 'text-emerald-500' :
                    tx.type === 'spend' ? 'text-foreground' :
                    tx.type === 'lend' ? 'text-blue-500' :
                    'text-amber-500'
                  }`}>
                    {tx.type === 'earn' || tx.type === 'borrow' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-md w-[95vw] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle>Record Repayment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Original {selectedTx?.type} amount:</p>
              <p className="text-lg font-semibold">{selectedTx ? formatCurrency(selectedTx.amount) : "-"}</p>
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
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={closeRepaymentDialog} type="button" className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleRepaymentSubmit} type="button" className="w-full sm:w-auto">
                Record Repayment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={(open) => !open && closeHistoryDialog()}>
        <DialogContent className="max-w-md w-[95vw] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle>Transaction History</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{historyTx?.type} Transaction</p>
              <p className="text-lg font-semibold">{historyTx ? formatCurrency(historyTx.amount) : "-"}</p>
              <p className="text-xs text-muted-foreground">{historyTx ? new Date(historyTx.date).toLocaleDateString() : ""}</p>
            </div>

            {historyQuery.isLoading ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Loading history…</p>
              </div>
            ) : historyQuery.data?.length ? (
              <div className="space-y-3">
                {historyQuery.data.map((entry: any) => (
                  <div key={entry.id} className="rounded-2xl border border-border/50 bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{entry.type}</p>
                      <p className="text-sm font-semibold">{formatCurrency(entry.amount)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{entry.notes || "Repayment entry"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(entry.date).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No repayment history found for this transaction.</p>
            )}

            <div className="flex justify-end">
              <Button variant="secondary" onClick={closeHistoryDialog} type="button" className="w-full sm:w-auto">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
