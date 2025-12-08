import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Header from "@/components/layout/Header";
import FloatingActions from "@/components/ui/floating-actions";
import ProtectedRoute from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Orders from "./pages/Orders";
import CashClosures from "./pages/CashClosures";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import CashClosing from "./pages/CashClosing";
import Trash from "./pages/Trash";
import NotFound from "./pages/NotFound";
import TransactionsPreview from "./pages/dev/TransactionsPreview";
import CreditSales from "./pages/CreditSales";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TooltipProvider>
          <Routes>
            {import.meta.env.DEV && (
              <Route path="/dev/transactions-preview" element={<TransactionsPreview />} />
            )}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-background">
                    <Header />
                    <main>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/transactions" element={<Transactions />} />
                        <Route path="/orders" element={<Orders />} />
                        <Route path="/credit-sales" element={<CreditSales />} />
                        <Route path="/cash-closures" element={<CashClosures />} />
                        <Route path="/trash" element={<Trash />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/cash-closing" element={<CashClosing />} />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </main>
                    <FloatingActions />
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
