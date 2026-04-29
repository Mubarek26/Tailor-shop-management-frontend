import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatETB, type Customer, type Order } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";

export const Route = createFileRoute("/payments")({
  component: () => (
    <ProtectedRoute roles={["owner", "superadmin"]}>
      <DashboardLayout>
        <PaymentsPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function PaymentsPage() {
  const [page, setPage] = useState(1);

  const { data: summary } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: async () => {
      const res = await api.get("/analytics/summary");
      return res.data?.data ?? res.data ?? {};
    },
  });

  const { data: ordersData, isLoading: loading } = useQuery({
    queryKey: ["orders-payments", { page }],
    queryFn: async () => {
      const params = { page, limit: 10 };
      const res = await api.get("/orders", { params });
      const oData = res.data?.data ?? res.data ?? {};
      return {
        orders: Array.isArray(oData) ? oData : oData.orders ?? [],
        totalPages: oData.pagination?.totalPages ?? 1,
      };
    },
    placeholderData: keepPreviousData,
  });

  const orders = ordersData?.orders ?? [];
  const totalPages = ordersData?.totalPages ?? 1;

  const totalRemaining = summary?.total_remaining ?? 0;
  const totalDeposit = summary?.total_deposit ?? 0;
  const totalRevenue = summary?.total_revenue ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <p className="mt-1 text-muted-foreground">Track deposits and remaining balances per order.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Total revenue" value={formatETB(totalRevenue)} />
        <SummaryCard label="Total deposits" value={formatETB(totalDeposit)} />
        <SummaryCard label="Outstanding" value={formatETB(totalRemaining)} accent />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-3 rounded-full bg-muted p-4">
              <Wallet className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium">No orders to show payments for.</p>
          </div>
        ) : (
          <>
            {/* Mobile View: List of Cards */}
            <div className="grid gap-3 p-3 md:hidden">
              {orders.map((o) => {
                const c = o.customer_id as Customer;
                return (
                  <Link key={o._id} to="/orders/$orderId" params={{ orderId: o._id }}>
                    <div className="group rounded-xl border bg-card p-4 transition-all active:scale-[0.98] hover:border-primary/50">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-mono text-base font-black text-primary uppercase tracking-tight">
                            #{c?.unique_code ?? "—"}
                          </div>
                          <div className="mt-1 font-bold text-foreground group-hover:text-primary transition-colors">
                            {c?.name ?? "—"}
                          </div>
                        </div>
                        <StatusBadge status={o.status} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-3 border-t border-muted/50 pt-3">
                        <div className="space-y-0.5">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Total</div>
                          <div className="text-xs font-semibold text-foreground">{formatETB(o.total_price)}</div>
                        </div>
                        <div className="space-y-0.5 text-right">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Deposit</div>
                          <div className="text-xs font-semibold text-muted-foreground">{formatETB(o.deposit)}</div>
                        </div>
                        <div className="col-span-2 flex items-center justify-between rounded-lg bg-destructive/5 px-2 py-1.5 border border-destructive/10">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-destructive/80">Remaining Balance</span>
                          <span className="text-sm font-black text-destructive">{formatETB(o.remaining_price)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Deposit</th>
                  <th className="px-4 py-3 font-medium">Remaining</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((o) => {
                  const c = o.customer_id as Customer;
                  return (
                    <tr key={o._id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-base font-black text-primary">#{c?.unique_code ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{c?.name ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3">{formatETB(o.total_price)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatETB(o.deposit)}</td>
                      <td className="px-4 py-3 font-medium text-destructive">{formatETB(o.remaining_price)}</td>
                      <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <Link to="/orders/$orderId" params={{ orderId: o._id }}>
                          <Button size="sm" variant="ghost">Manage</Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
        {!loading && orders.length > 0 && (
          <Pagination 
            page={page} 
            totalPages={totalPages} 
            onPageChange={setPage} 
            loading={loading} 
          />
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${accent ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}
