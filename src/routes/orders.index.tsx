import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatETB, type Order, type Customer } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Search, ShoppingBag, ChevronLeft, ChevronRight } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { format, isThisWeek, isThisMonth, parseISO } from "date-fns";

export const Route = createFileRoute("/orders/")({
  component: () => (
    <ProtectedRoute roles={["owner", "superadmin"]}>
      <DashboardLayout>
        <OrdersListPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function OrdersListPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading: loading } = useQuery({
    queryKey: ["orders", { status, timeRange, page }],
    queryFn: async () => {
      const params: any = { page, limit: 10 };
      if (status !== "all") params.status = status;
      if (timeRange !== "all") params.timeRange = timeRange;
      const r = await api.get("/orders", { params });
      const resp = r.data?.data ?? r.data ?? {};
      return {
        orders: Array.isArray(resp) ? resp : resp.orders ?? [],
        totalPages: resp.pagination?.totalPages ?? 1,
      };
    },
    placeholderData: keepPreviousData,
  });

  const orders = data?.orders ?? [];
  const totalPages = data?.totalPages ?? 1;

  const isOverdue = (o: Order) => {
    if (o.status === "completed") return false;
    if (!o.appointment_date) return false;
    return new Date(o.appointment_date) < new Date();
  };

  useEffect(() => {
    setPage(1);
  }, [status, timeRange]);

  const filtered = useMemo(() => {
    const list = orders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      
      // Time range filter
      if (timeRange !== "all" && o.appointment_date) {
        const date = new Date(o.appointment_date);
        if (timeRange === "week" && !isThisWeek(date)) return false;
        if (timeRange === "month" && !isThisMonth(date)) return false;
      } else if (timeRange !== "all" && !o.appointment_date) {
        return false;
      }

      if (!q) return true;
      const c = o.customer_id as Customer | undefined;
      const term = q.toLowerCase();
      return (
        c?.name?.toLowerCase().includes(term) ||
        c?.phone?.toLowerCase().includes(term) ||
        String(c?.unique_code ?? "").includes(term) ||
        o._id.toLowerCase().includes(term)
      );
    });

    return list.sort((a, b) => {
      const aOverdue = isOverdue(a);
      const bOverdue = isOverdue(b);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [orders, q, status, timeRange]);


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="mt-1 text-muted-foreground">Manage all suit orders.</p>
        </div>
        <Link to="/orders/new">
          <Button className="bg-[image:var(--gradient-primary)]">
            <Plus className="mr-2 h-4 w-4" /> New Order
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border bg-card p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by customer, phone, code, ID..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Time Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full bg-muted p-4">
              <ShoppingBag className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium">No orders found</p>
            <p className="text-sm text-muted-foreground">Try changing filters or create a new order.</p>
          </div>
        ) : (
          <>
            {/* Mobile View: List of Cards */}
            <div className="grid gap-3 p-3 md:hidden">
              {filtered.map((o) => {
                const c = o.customer_id as Customer | undefined;
                return (
                  <Link key={o._id} to="/orders/$orderId" params={{ orderId: o._id }}>
                    <div className="group rounded-xl border bg-card p-4 transition-all active:scale-[0.98] hover:border-primary/50">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                            #{c?.unique_code ?? "—"}
                          </div>
                          <div className="mt-1 font-bold text-foreground group-hover:text-primary transition-colors">
                            {c?.name ?? "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">{c?.phone}</div>
                        </div>
                        <StatusBadge status={o.status} />
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-muted/50 pt-3">
                        <div className="space-y-1">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Total Price</div>
                          <div className="text-sm font-bold text-foreground">{formatETB(o.total_price)}</div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Appointment</div>
                          <div className={`text-sm font-bold ${isOverdue(o) ? "text-destructive" : "text-foreground"}`}>
                            {o.appointment_date ? format(new Date(o.appointment_date), "MMM d") : "—"}
                            {isOverdue(o) && <span className="ml-1 text-[8px] font-black uppercase text-destructive">!</span>}
                          </div>
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
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Remaining</th>
                  <th className="px-4 py-3 font-medium">Appointment</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((o) => {
                  const c = o.customer_id as Customer | undefined;
                  return (
                    <tr key={o._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">#{c?.unique_code ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{c?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{c?.phone}</div>
                      </td>
                      <td className="px-4 py-3 font-medium">{formatETB(o.total_price)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatETB(o.remaining_price)}</td>
                      <td className={`px-4 py-3 ${isOverdue(o) ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                        <div className="flex items-center gap-2">
                          {o.appointment_date ? format(new Date(o.appointment_date), "MMM d, yyyy") : "—"}
                          {isOverdue(o) && (
                            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to="/orders/$orderId" params={{ orderId: o._id }}>
                          <Button size="sm" variant="ghost">
                            View
                          </Button>
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
