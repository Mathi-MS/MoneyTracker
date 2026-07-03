import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth, AuthProvider } from "@/lib/auth";
import { MonthProvider } from "@/lib/month-context";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import TransactionForm from "./pages/TransactionForm";
import Categories from "./pages/Categories";
import Persons from "./pages/Persons";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background text-primary">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <Component />;
}

function Router() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute component={Dashboard} />} />
      <Route path="/transactions" element={<ProtectedRoute component={Transactions} />} />
      <Route path="/transactions/new" element={<ProtectedRoute component={TransactionForm} />} />
      <Route path="/transactions/:id/edit" element={<ProtectedRoute component={TransactionForm} />} />
      <Route path="/categories" element={<ProtectedRoute component={Categories} />} />
      <Route path="/persons" element={<ProtectedRoute component={Persons} />} />
      <Route path="/reports" element={<ProtectedRoute component={Reports} />} />
      <Route path="/settings" element={<ProtectedRoute component={Settings} />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MonthProvider>
          <TooltipProvider>
            <HashRouter>
              <Router />
            </HashRouter>
            <Toaster />
          </TooltipProvider>
        </MonthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
