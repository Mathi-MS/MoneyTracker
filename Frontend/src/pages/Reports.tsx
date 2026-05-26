import { AppLayout } from "@/components/layout/AppLayout";
import { useGetMonthlyBreakdown, useGetCategoryBreakdown } from "@/lib/api-client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function Reports() {
  const { data: monthlyData, isLoading: isMonthlyLoading } = useGetMonthlyBreakdown();
  const { data: categoryData, isLoading: isCategoryLoading } = useGetCategoryBreakdown();

  const formatCurrency = (val: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);

  return (
    <AppLayout>
      <div className="p-4 space-y-6 pb-8">
        <div className="flex flex-col gap-2 mb-2">
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Insights into your financial flow.</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="bg-card border-border/50 overflow-hidden shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Monthly Flow</CardTitle>
            </CardHeader>
            <CardContent>
              {isMonthlyLoading ? (
                <Skeleton className="w-full h-[200px]" />
              ) : monthlyData?.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  No data available
                </div>
              ) : (
                <div className="h-[200px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(val) => `₹${val}`} />
                      <Tooltip 
                        cursor={{ fill: 'hsl(var(--secondary)/0.5)' }}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Bar dataKey="earned" name="Earned" fill="hsl(var(--emerald-500, 142.1 70.6% 45.3%))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="spent" name="Spent" fill="hsl(var(--rose-500, 346.8 77.2% 49.8%))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {isCategoryLoading ? (
                <Skeleton className="w-full h-[250px]" />
              ) : categoryData?.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                  No spending data yet
                </div>
              ) : (
                <div className="h-[250px] w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="total"
                        nameKey="categoryName"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                      >
                        {categoryData?.map((entry: any, index: any) => (
                          <Cell key={`cell-${index}`} fill={entry.categoryColor || `hsl(var(--chart-${(index % 5) + 1}))`} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total</div>
                      <div className="text-lg font-bold">
                        {formatCurrency(categoryData?.reduce((acc: any, curr: any) => acc + curr.total, 0) || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="mt-6 space-y-3">
                {categoryData?.map((item: any, i: any) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.categoryColor || `hsl(var(--chart-${(i % 5) + 1}))` }} />
                      <span className="font-medium">{item.categoryName}</span>
                    </div>
                    <div className="font-semibold">{formatCurrency(item.total)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}