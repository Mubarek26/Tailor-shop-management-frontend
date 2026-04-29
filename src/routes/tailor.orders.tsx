import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useQuery, keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatETB, type Customer, type Order, type Measurement, type Design, type User } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Loader2, ShoppingBag, User as UserIcon, Ruler, Scissors, Info, Calendar } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { Separator } from "@/components/ui/separator";
import { format, isThisWeek, isThisMonth } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/tailor/orders")({
  component: () => (
    <ProtectedRoute roles={["tailor"]}>
      <DashboardLayout>
        <TailorOrdersPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function TailorOrdersPage() {
  const [filter, setFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [timeRange, setTimeRange] = useState<string>("all");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: owners = [] } = useQuery({
    queryKey: ["owners"],
    queryFn: async () => {
      const res = await api.get("/users/owners");
      const data = res.data?.data ?? res.data ?? [];
      return Array.isArray(data) ? data : data.owners ?? [];
    },
  });

  const { data, isLoading: loading } = useQuery({
    queryKey: ["tailor-orders", { ownerFilter, filter, timeRange, page }],
    queryFn: async () => {
      const params: any = { page, limit: 12 };
      if (ownerFilter !== "all") params.ownerId = ownerFilter;
      if (filter !== "all") params.status = filter;
      if (timeRange !== "all") params.timeRange = timeRange;
      const r = await api.get("/orders/tailor", { params });
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

  const { data: meas } = useQuery({
    queryKey: ["measurements", selected?._id],
    queryFn: async () => {
      const r = await api.get(`/measurements/${selected?._id}`);
      const data = r.data?.data ?? r.data;
      return data?.measurement ?? data ?? null;
    },
    enabled: !!selected,
  });

  const { data: design } = useQuery({
    queryKey: ["design", selected?._id],
    queryFn: async () => {
      const r = await api.get(`/designs/${selected?._id}`);
      const data = r.data?.data ?? r.data;
      return data?.design ?? data ?? null;
    },
    enabled: !!selected,
  });

  const isOverdue = (o: Order) => {
    if (o.status === "completed") return false;
    if (!o.appointment_date) return false;
    return new Date(o.appointment_date) < new Date();
  };

  useEffect(() => {
    setPage(1);
  }, [ownerFilter, filter, timeRange]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      api.patch(`/orders/${orderId}/status`, { status }),
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["tailor-orders"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed"),
  });

  const updateStatus = (orderId: string, status: string) => updateStatusMutation.mutate({ orderId, status });
  const openOrder = (o: Order) => setSelected(o);

  const filtered = useMemo(() => {
    return orders
      .filter((o) => {
        if (filter !== "all" && o.status !== filter) return false;
        
        // Time range filter
        if (timeRange !== "all" && o.appointment_date) {
          const date = new Date(o.appointment_date);
          if (timeRange === "week" && !isThisWeek(date)) return false;
          if (timeRange === "month" && !isThisMonth(date)) return false;
        } else if (timeRange !== "all" && !o.appointment_date) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        const aOverdue = isOverdue(a);
        const bOverdue = isOverdue(b);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [orders, filter, timeRange]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            My Orders <span className="text-primary text-2xl font-bold">የእኔ ትዕዛዞች</span>
          </h1>
          <p className="mt-1 text-muted-foreground text-sm sm:text-base">Orders assigned to you / ለእርስዎ የተሰጡ ትዕዛዞች</p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="All Owners" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shops</SelectItem>
              {owners.map((o) => (
                <SelectItem key={o._id} value={o._id}>{o.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="flex-1 sm:w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="flex-1 sm:w-[140px]"><SelectValue placeholder="Time Range" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card py-16 text-center">
          <div className="mx-auto mb-3 inline-flex rounded-full bg-muted p-4">
            <ShoppingBag className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium">No orders</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o) => {
            const c = o.customer_id as Customer;
            return (
              <div key={o._id} className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-[var(--shadow-md)]">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono text-base font-black text-primary uppercase tracking-tight">#{c?.unique_code ?? o._id.slice(-6)}</div>
                    <div className="mt-1 font-semibold">{c?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{c?.phone}</div>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                 <div className="mt-3 text-sm">
                  <div className="text-xs text-muted-foreground">Appointment</div>
                  <div className={`flex items-center gap-2 font-medium ${isOverdue(o) ? "text-destructive font-bold" : ""}`}>
                    {o.appointment_date ? format(new Date(o.appointment_date), "MMM d") : "—"}
                    {isOverdue(o) && (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">
                        Overdue
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 font-bold" onClick={() => openOrder(o)}>
                    Details / ዝርዝር
                  </Button>
                  <Select value={o.status} onValueChange={(v) => updateStatus(o._id, v)}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {!loading && orders.length > 0 && (
        <div className="mt-8 rounded-xl border bg-card">
          <Pagination 
            page={page} 
            totalPages={totalPages} 
            onPageChange={setPage} 
            loading={loading} 
          />
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span className="font-bold">Order details</span>
              <span className="text-primary font-bold">የትዕዛዝ ዝርዝር</span>
            </SheetTitle>
            <SheetDescription>Read-only view / ለማንበብ ብቻ</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="mt-8 space-y-8">
              {/* Customer Info */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">Customer</h3>
                  <span className="text-lg font-bold text-primary">ደንበኛ</span>
                </div>
                <div className="grid grid-cols-2 gap-4 rounded-xl border bg-muted/20 p-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Full Name</span>
                      <span className="text-[10px] font-bold text-primary">ሙሉ ስም</span>
                    </div>
                    <div className="text-base font-bold text-foreground">{(selected.customer_id as Customer)?.name}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Phone Number</span>
                      <span className="text-[10px] font-bold text-primary">ስልክ ቁጥር</span>
                    </div>
                    <div className="text-base font-bold text-foreground">{(selected.customer_id as Customer)?.phone}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Appointment</span>
                      <span className="text-[10px] font-bold text-primary">ቀጠሮ</span>
                    </div>
                    <div className={`flex items-center gap-2 text-base font-bold ${isOverdue(selected) ? "text-destructive" : "text-foreground"}`}>
                      <Calendar className={`h-4 w-4 ${isOverdue(selected) ? "text-destructive" : "text-muted-foreground"}`} />
                      {selected.appointment_date ? format(new Date(selected.appointment_date), "PPPP") : "No date set"}
                      {isOverdue(selected) && (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Design styles */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">Design Details</h3>
                  <span className="text-lg font-bold text-primary">የዲዛይን ዝርዝር</span>
                </div>
                
                {selected.design_image_url && (
                  <div className="overflow-hidden rounded-xl border bg-muted/10">
                    <div className="bg-muted/30 px-3 py-1.5 flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">Reference Image</span>
                      <span className="text-[10px] font-bold text-primary">የማጣቀሻ ምስል</span>
                    </div>
                    <img src={selected.design_image_url} alt="Design" className="w-full object-cover" />
                  </div>
                )}

                {design ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {[
                        { label: "Coat style", am: "ካፖርት ስታይል", value: design.coat_style },
                        { label: "Pant style", am: "ሱሪ ስታይል", value: design.pant_style },
                        { label: "Vest style", am: "ቬስት ስታይል", value: design.vest_style },
                      ].map((s) => (
                        <div key={s.label} className="rounded-xl border bg-card p-3 shadow-sm">
                          <div className="mb-1 flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">{s.label}</span>
                            <span className="text-[10px] font-bold text-primary">{s.am}</span>
                          </div>
                          <div className="text-sm font-bold text-foreground">{s.value || "Standard"}</div>
                        </div>
                      ))}
                    </div>

                    {design.notes && (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Info className="h-3 w-3 text-primary" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Special Instructions</span>
                          <span className="text-[10px] font-bold text-primary">ተጨማሪ ማስታወሻ</span>
                        </div>
                        <p className="text-sm italic leading-relaxed text-foreground/90">
                          "{design.notes}"
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No design styles specified.
                  </div>
                )}
              </section>

              <Separator />

              {/* Measurements */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Ruler className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">Measurements</h3>
                  <span className="text-lg font-bold text-primary">መለኪያዎች</span>
                </div>

                {meas ? (
                  <div className="space-y-6">
                    {[
                      { 
                        title: "Coat", 
                        am: "ካፖርት",
                        data: [
                          ["Length", "ቁመት", meas.coat_length], 
                          ["Waist", "ወገብ", meas.coat_waist], 
                          ["Chest", "ደረት", meas.coat_chest], 
                          ["Shoulder", "ትከሻ", meas.coat_shoulder]
                        ] 
                      },
                      { 
                        title: "Pant", 
                        am: "ሱሪ",
                        data: [
                          ["Length", "ቁመት", meas.pant_length], 
                          ["Waist", "ወገብ", meas.pant_waist], 
                          ["Hip", "ዳሌ", meas.pant_hip], 
                          ["Thigh", "ጭን", meas.pant_thigh], 
                          ["Bottom", "ታች", meas.pant_bottom]
                        ] 
                      },
                      { 
                        title: "Vest", 
                        am: "ቬስት",
                        data: [
                          ["Length", "ቁመት", meas.vest_length], 
                          ["Waist", "ወገብ", meas.vest_waist], 
                          ["Chest", "ደረት", meas.vest_chest]
                        ] 
                      },
                    ].map((group) => (
                      <div key={group.title} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-foreground">{group.title}</span>
                          <span className="text-[10px] font-bold text-primary">{group.am}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {group.data.map(([k, am, v]: any) => (
                            <div key={k} className="rounded-lg border bg-muted/5 p-2 transition-colors hover:bg-muted/10">
                              <div className="flex flex-col mb-1">
                                <span className="text-[10px] font-bold text-foreground">{k}</span>
                                <span className="text-[10px] font-bold text-primary">{am}</span>
                              </div>
                              <div className="text-sm font-bold text-foreground">
                                {v ?? "—"}<span className="ml-0.5 text-[10px] font-normal text-muted-foreground">{v != null ? "cm" : ""}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Measurements have not been recorded yet.
                  </div>
                )}
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
