import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, type Customer, type Order } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Pagination } from "@/components/Pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/customers")({
  component: () => (
    <ProtectedRoute roles={["owner", "superadmin"]}>
      <DashboardLayout>
        <CustomersPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function CustomersPage() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading: loading } = useQuery({
    queryKey: ["customers", { q, page }],
    queryFn: async () => {
      const params: any = { page, limit: 10 };
      if (q) params.name = q;
      const r = await api.get("/customers", { params });
      const resp = r.data?.data ?? r.data ?? {};
      return {
        customers: Array.isArray(resp) ? resp : resp.customers ?? [],
        totalPages: resp.pagination?.totalPages ?? 1,
      };
    },
    placeholderData: keepPreviousData,
  });

  const customers = data?.customers ?? [];
  const totalPages = data?.totalPages ?? 1;

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["customer-orders", selected?._id],
    queryFn: async () => {
      const r = await api.get(`/customers/${selected?._id}/orders`);
      const data = r.data?.data ?? r.data ?? {};
      const list = data.customerOrders ?? [];
      return list.map((item: any) => item.order || item);
    },
    enabled: !!selected,
  });

  useEffect(() => {
    setPage(1);
  }, [q]);

  const removeCustomerMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => {
      toast.success("Customer deleted");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed"),
  });

  const removeCustomer = (id: string) => removeCustomerMutation.mutate(id);
  const openCustomer = (c: Customer) => setSelected(c);

  const filtered = customers;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="mt-1 text-muted-foreground">All customers and their orders.</p>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-3 rounded-full bg-muted p-4">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium">No customers</p>
            <p className="text-sm text-muted-foreground">Customers are auto-created when you make orders.</p>
          </div>
        ) : (
          <>
            {/* Mobile View: List of Cards */}
            <div className="grid gap-3 p-3 md:hidden">
              {filtered.map((c) => (
                <div 
                  key={c._id} 
                  className="group rounded-xl border bg-card p-4 transition-all active:scale-[0.98] hover:border-primary/50 cursor-pointer"
                  onClick={() => openCustomer(c)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                        #{c.unique_code}
                      </div>
                      <div className="mt-1 font-bold text-foreground group-hover:text-primary transition-colors">
                        {c.name}
                      </div>
                      <div className="text-xs text-muted-foreground">{c.phone}</div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete customer?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove {c.name} from your records.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground"
                            onClick={() => removeCustomer(c._id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((c) => (
                  <tr key={c._id} className="hover:bg-muted/30 cursor-pointer" onClick={() => openCustomer(c)}>
                    <td className="px-4 py-3 font-mono text-xs">#{c.unique_code}</td>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.phone}</td>
                    <td className="px-4 py-3 text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => e.stopPropagation()}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove {c.name} from your records.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground"
                              onClick={() => removeCustomer(c._id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
        {!loading && customers.length > 0 && (
          <Pagination 
            page={page} 
            totalPages={totalPages} 
            onPageChange={setPage} 
            loading={loading} 
          />
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selected?.name}</SheetTitle>
            <SheetDescription>
              Code #{selected?.unique_code} · {selected?.phone}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold">Orders</h3>
            {ordersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <div className="space-y-2">
                {orders.map((o) => (
                  <div key={o._id} className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs">#{o._id.slice(-6)}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="mt-2 text-sm">Total: <span className="font-medium">ETB {o.total_price?.toLocaleString()}</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
