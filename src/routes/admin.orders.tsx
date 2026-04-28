import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatETB, type Customer, type Order, type User } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ShoppingBag } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { format, isThisWeek, isThisMonth } from "date-fns";

export const Route = createFileRoute("/admin/orders")({
  component: () => (
    <ProtectedRoute roles={["superadmin"]}>
      <DashboardLayout>
        <AllOrdersPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function AllOrdersPage() {
  const [ownerId, setOwnerId] = useState("all");
  const [timeRange, setTimeRange] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data: ownersData } = useQuery({
    queryKey: ["admin-owners"],
    queryFn: async () => {
      const r = await api.get("/users");
      const data = r.data?.data ?? r.data ?? [];
      const arr: User[] = Array.isArray(data) ? data : data.users ?? [];
      return arr.filter((u) => u.role === "owner");
    },
  });

  const owners = ownersData ?? [];

  const { data, isLoading: loading } = useQuery({
    queryKey: ["admin-orders", { ownerId, timeRange, page }],
    queryFn: async () => {
      const params: any = { page, limit: 10 };
      if (ownerId !== "all") params.owner_id = ownerId;
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

  useEffect(() => {
    setPage(1);
  }, [ownerId, timeRange]);

  const isOverdue = (o: Order) => {
    if (o.status === "completed") return false;
    if (!o.appointment_date) return false;
    return new Date(o.appointment_date) < new Date();
  };

  const filteredOrders = useMemo(() => {
    let list = orders;
    
    if (timeRange !== "all") {
      list = list.filter((o) => {
        if (!o.appointment_date) return false;
        const date = new Date(o.appointment_date);
        if (timeRange === "week") return isThisWeek(date);
        if (timeRange === "month") return isThisMonth(date);
        return true;
      });
    }

    return [...list].sort((a, b) => {
      const aOverdue = isOverdue(a);
      const bOverdue = isOverdue(b);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [orders, timeRange]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Orders</h1>
          <p className="mt-1 text-muted-foreground">System-wide orders across all shops.</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Time Range" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All shops</SelectItem>
              {owners.map((o) => (
                <SelectItem key={o._id} value={o._id}>{o.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-3 rounded-full bg-muted p-4">
              <ShoppingBag className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium">No orders</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Appointment</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredOrders.map((o) => {
                  const c = o.customer_id as Customer;
                  const ow = o.owner_id as User | undefined;
                  return (
                    <tr key={o._id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{c?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">#{c?.unique_code}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{typeof ow === "object" ? ow?.fullName : "—"}</td>
                      <td className="px-4 py-3 font-medium">{formatETB(o.total_price)}</td>
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
                      <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <Link to="/orders/$orderId" params={{ orderId: o._id }}>
                          <Button size="sm" variant="ghost">View</Button>
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
