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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
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
                      <td className="px-4 py-3">
                        <div className="font-medium">{c?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">#{c?.unique_code}</div>
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
