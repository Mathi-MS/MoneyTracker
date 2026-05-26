import { AppLayout } from "@/components/layout/AppLayout";
import { useGetDashboardSummary, useListTransactions } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownLeft, ArrowUpRight, Wallet, ArrowRightLeft, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: transactions, isLoading: isLoadingTransactions } = useListTransactions({ limit: 5 });

  return (
    <AppLayout>
      <div className="p-4 space-y-6">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-primary/90 to-primary text-primary-foreground border-none overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
            <CardContent className="p-6 relative z-10">
              <div className="flex flex-col gap-1 mb-6">
                <span className="text-primary-foreground/80 font-medium text-sm">Total Balance</span>
                {isLoadingSummary ? (
                  <Skeleton className="h-10 w-40 bg-white/20" />
                ) : (
                  <span className="text-4xl font-bold tracking-tight">
                    {formatCurrency(summary?.totalBalance || 0)}
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <ArrowDownLeft className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-[10px] text-primary-foreground/70 font-medium uppercase tracking-wider">Income</div>
                    <div className="font-semibold text-sm">
                      {isLoadingSummary ? <Skeleton className="h-4 w-16 bg-white/20 mt-1" /> : formatCurrency(summary?.totalEarned || 0)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-[10px] text-primary-foreground/70 font-medium uppercase tracking-wider">Expense</div>
                    <div className="font-semibold text-sm">
                      {isLoadingSummary ? <Skeleton className="h-4 w-16 bg-white/20 mt-1" /> : formatCurrency(summary?.totalSpent || 0)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-secondary/50 border-none cursor-pointer hover:bg-secondary/80 transition-colors" onClick={() => navigate('/transactions?type=lend')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-blue-500/20 text-blue-500 rounded-lg">
                  <Wallet className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Lent</span>
              </div>
              {isLoadingSummary ? <Skeleton className="h-6 w-20" /> : <div className="text-lg font-bold">{formatCurrency(summary?.totalLent || 0)}</div>}
            </CardContent>
          </Card>
          <Card className="bg-secondary/50 border-none cursor-pointer hover:bg-secondary/80 transition-colors" onClick={() => navigate('/transactions?type=borrow')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-amber-500/20 text-amber-500 rounded-lg">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Borrowed</span>
              </div>
              {isLoadingSummary ? <Skeleton className="h-6 w-20" /> : <div className="text-lg font-bold">{formatCurrency(summary?.totalBorrowed || 0)}</div>}
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Recent Transactions</h2>
            <Link to="/transactions" className="text-sm text-primary font-medium">See All</Link>
          </div>

          <div className="space-y-3">
            {isLoadingTransactions ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))
            ) : transactions?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No recent transactions.</p>
              </div>
              ) : (
              transactions?.map((tx: any, i: any) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                >
                  <Link to={`/transactions/${tx.id}/edit`}>
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
                        <p className="font-semibold truncate">{tx.category ? tx.category.name : tx.notes || "Transaction"}</p>
                        <p className="text-xs text-muted-foreground truncate">{new Date(tx.date).toLocaleDateString()}</p>
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
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}