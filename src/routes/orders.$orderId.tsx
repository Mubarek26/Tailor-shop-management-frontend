import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatETB, type Order, type Customer, type Measurement, type Payment, type User, type Design } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, 
  Trash2, 
  ArrowLeft, 
  UserPlus, 
  UserMinus, 
  Plus, 
  User as UserIcon, 
  ShoppingBag, 
  Scissors, 
  Ruler, 
  Wallet 
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export const Route = createFileRoute("/orders/$orderId")({
  component: () => (
    <ProtectedRoute roles={["owner", "superadmin"]}>
      <DashboardLayout>
        <OrderDetailPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const r = await api.get(`/orders/${orderId}`);
      const data = r.data?.data ?? r.data;
      return data?.order ?? data ?? null;
    },
  });

  const [pendingTailorId, setPendingTailorId] = useState<string | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  const { data: measurements } = useQuery({
    queryKey: ["measurements", orderId],
    queryFn: async () => {
      const r = await api.get(`/measurements/${orderId}`);
      const data = r.data?.data ?? r.data;
      return data?.measurement ?? data ?? null;
    },
    enabled: !!order,
  });

  const { data: payment } = useQuery({
    queryKey: ["payments", orderId],
    queryFn: async () => {
      const r = await api.get(`/payments/${orderId}`);
      const data = r.data?.data ?? r.data;
      return data?.payments ? { history: data.payments } : data ?? null;
    },
    enabled: !!order,
  });

  const { data: tailors = [] } = useQuery({
    queryKey: ["tailors"],
    queryFn: async () => {
      const r = await api.get("/users/tailors");
      const ts = r.data?.data ?? r.data ?? [];
      return Array.isArray(ts) ? ts : ts.tailors ?? [];
    },
  });

  const { data: design } = useQuery({
    queryKey: ["design", orderId],
    queryFn: async () => {
      const r = await api.get(`/designs/${orderId}`);
      const data = r.data?.data ?? r.data;
      return data?.design ?? data ?? null;
    },
    enabled: !!order,
  });

  const loading = orderLoading;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    queryClient.invalidateQueries({ queryKey: ["payments", orderId] });
  };

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/orders/${orderId}/status`, { status }),
    onSuccess: () => {
      toast.success("Status updated");
      invalidate();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed"),
  });

  const assignTailorMutation = useMutation({
    mutationFn: (tailorId: string) => api.patch(`/orders/${orderId}/assign-tailor`, { tailorId }),
    onSuccess: () => {
      toast.success("Tailor assigned");
      invalidate();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed"),
  });

  const unassignTailorMutation = useMutation({
    mutationFn: () => api.patch(`/orders/${orderId}/unassign-tailor`),
    onSuccess: () => {
      toast.success("Tailor unassigned");
      invalidate();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed"),
  });

  const deleteOrderMutation = useMutation({
    mutationFn: () => api.delete(`/orders/${orderId}`),
    onSuccess: () => {
      toast.success("Order deleted");
      navigate({ to: "/orders" });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed"),
  });

  const addPaymentMutation = useMutation({
    mutationFn: ({ amount, type }: { amount: number; type: "deposit" | "full" }) =>
      api.post(`/payments`, {
        order_id: orderId,
        amount,
        payment_type: type,
      }),
    onSuccess: () => {
      toast.success("Payment recorded");
      invalidate();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed"),
  });

  const updateStatus = (status: string) => updateStatusMutation.mutate(status);
  const assignTailor = (tailorId: string) => {
    assignTailorMutation.mutate(tailorId);
    setShowAssignDialog(false);
    setPendingTailorId(null);
  };
  const unassignTailor = () => unassignTailorMutation.mutate();
  const deleteOrder = () => deleteOrderMutation.mutate();
  const addPayment = (amount: number, type: "deposit" | "full") => addPaymentMutation.mutate({ amount, type });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <p className="text-muted-foreground">Order not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate({ to: "/orders" })}>
          Back to orders
        </Button>
      </div>
    );
  }

  const customer = order.customer_id as Customer;
  const tailor = order.assigned_tailor_id as User | undefined;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Premium Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-9 w-9 shrink-0 rounded-full bg-background" 
            onClick={() => navigate({ to: "/orders" })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Order #{customer?.unique_code ?? order._id.slice(-6)}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Placed on {order.createdAt ? format(new Date(order.createdAt), "MMM d, yyyy") : "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 sm:flex-none">
            <Select value={order.status} onValueChange={updateStatus}>
              <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="w-[90vw] sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Order?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove this order and all associated records.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteOrder} className="bg-destructive text-destructive-foreground">
                  Confirm Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Customer */}
          <Card 
            title="Customer" 
            amharic="ደንበኛ" 
            icon={<UserIcon className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <Field label="Full Name" amharic="ስም" value={customer?.name} />
              <Field label="Phone Number" amharic="ስልክ" value={customer?.phone} />
              <div className="sm:col-span-2">
                <Field label="Customer Code" amharic="ኮድ" value={`#${customer?.unique_code ?? "—"}`} mono />
              </div>
            </div>
          </Card>

          {/* Order Financials */}
          <Card 
            title="Financial Overview" 
            amharic="የክፍያ ዝርዝር" 
            icon={<ShoppingBag className="h-4 w-4" />}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Price / ጠቅላላ ዋጋ</p>
                    <p className="text-2xl font-black text-primary">{formatETB(order.total_price)}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Appointment / ቀጠሮ</p>
                    <p className="text-sm font-bold text-foreground">
                      {order.appointment_date ? format(new Date(order.appointment_date), "MMM d, yyyy") : "No date"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-xl border bg-muted/30">
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Paid / የተከፈለ</p>
                <p className="text-base font-bold text-foreground">{formatETB(order.deposit)}</p>
              </div>
              <div className="p-3 rounded-xl border bg-destructive/5 border-destructive/10">
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Balance / ቀሪ</p>
                <p className="text-base font-bold text-destructive">{formatETB(order.remaining_price)}</p>
              </div>
            </div>
          </Card>

          {/* Design */}
          <Card 
            title="Style & Design" 
            amharic="የዲዛይን ዝርዝር" 
            icon={<Scissors className="h-4 w-4" />}
          >
            {!design ? (
              <div className="py-4 text-center border-2 border-dashed rounded-xl border-muted/50">
                <p className="text-sm text-muted-foreground italic">No design styles recorded.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 rounded-xl border bg-card">
                    <Field label="Coat Style" amharic="ካፖርት ስታይል" value={design.coat_style} />
                  </div>
                  <div className="p-3 rounded-xl border bg-card">
                    <Field label="Pant Style" amharic="ሱሪ ስታይል" value={design.pant_style} />
                  </div>
                  <div className="p-3 rounded-xl border bg-card">
                    <Field label="Vest Style" amharic="ቬስት ስታይል" value={design.vest_style} />
                  </div>
                </div>
                {design.notes && (
                  <div className="p-4 rounded-xl bg-muted/40 border">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Special Notes / ማስታወሻ</span>
                    </div>
                    <p className="text-sm leading-relaxed italic text-foreground/80">{design.notes}</p>
                  </div>
                )}
              </div>
            )}
            {order.design_image_url && (
              <div className="mt-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Design Reference / የማጣቀሻ ምስል</p>
                <div className="relative group overflow-hidden rounded-xl border shadow-sm">
                  <img
                    src={order.design_image_url}
                    alt="Design"
                    className="w-full max-h-[500px] object-contain bg-muted/10 transition-transform group-hover:scale-[1.02]"
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Measurements */}
          <Card 
            title="Measurements" 
            amharic="መለኪያዎች" 
            icon={<Ruler className="h-4 w-4" />}
          >
            {!measurements ? (
              <div className="py-8 text-center border-2 border-dashed rounded-xl border-muted/50">
                <p className="text-sm text-muted-foreground">No measurements recorded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                <MGroup
                  title="Coat"
                  amharic="ካፖርት"
                  data={[
                    ["Length", "ቁመት", measurements.coat_length],
                    ["Waist", "ወገብ", measurements.coat_waist],
                    ["Chest", "ደረት", measurements.coat_chest],
                    ["Shoulder", "ትከሻ", measurements.coat_shoulder],
                  ]}
                />
                <Separator className="opacity-50" />
                <MGroup
                  title="Pant"
                  amharic="ሱሪ"
                  data={[
                    ["Length", "ቁመት", measurements.pant_length],
                    ["Waist", "ወገብ", measurements.pant_waist],
                    ["Hip", "ዳሌ", measurements.pant_hip],
                    ["Thigh", "ጭን", measurements.pant_thigh],
                    ["Bottom", "ታች", measurements.pant_bottom],
                  ]}
                />
                <Separator className="opacity-50" />
                <MGroup
                  title="Vest"
                  amharic="ቬስት"
                  data={[
                    ["Length", "ቁመት", measurements.vest_length],
                    ["Waist", "ወገብ", measurements.vest_waist],
                    ["Chest", "ደረት", measurements.vest_chest],
                  ]}
                />
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {/* Tailor assignment */}
          <Card 
            title="Workshop Team" 
            amharic="የተመደበ ሰፊ" 
            icon={<Scissors className="h-4 w-4" />}
          >
            {tailor ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/10">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                    {tailor.fullName?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{tailor.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{tailor.phoneNumber}</p>
                  </div>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full h-10 text-xs font-semibold text-destructive hover:text-destructive hover:bg-destructive/10 border-dashed">
                      <UserMinus className="mr-2 h-4 w-4" /> Change Tailor
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="w-[90vw] sm:max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Unassign tailor?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove <span className="font-bold text-foreground">{tailor.fullName}</span> from this order?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={unassignTailor} className="bg-destructive text-destructive-foreground">
                        Unassign
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground italic">No tailor has been assigned to this order yet.</p>
                <div className="relative">
                  <Select 
                    value={pendingTailorId || ""} 
                    onValueChange={(id) => {
                      setPendingTailorId(id);
                      setShowAssignDialog(true);
                    }}
                  >
                    <SelectTrigger className="w-full h-11 bg-primary/5 border-primary/20 text-primary font-semibold">
                      <SelectValue placeholder="Select a tailor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tailors.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">No tailors found</div>
                      ) : (
                        tailors.map((t) => (
                          <SelectItem key={t._id} value={t._id}>
                            <div className="flex flex-col py-1">
                              <span className="font-bold">{t.fullName}</span>
                              <span className="text-[10px] text-muted-foreground">{t.phoneNumber}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <AlertDialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                  <AlertDialogContent className="w-[90vw] sm:max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Assign Tailor?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Assign <span className="font-bold text-foreground">
                          {tailors.find(t => t._id === pendingTailorId)?.fullName}
                        </span> to begin production on this order?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel onClick={() => {
                        setPendingTailorId(null);
                        setShowAssignDialog(false);
                      }} className="mt-0">No, Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => pendingTailorId && assignTailor(pendingTailorId)}
                        className="bg-[image:var(--gradient-primary)]"
                      >
                        Confirm Assignment
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </Card>

          {/* Payments */}
          <Card 
            title="Transaction History" 
            amharic="ክፍያዎች" 
            icon={<Wallet className="h-4 w-4" />}
          >
            <div className="space-y-3">
              {payment?.history?.length ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {payment.history.map((p, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border bg-muted/20 p-3 text-sm transition-colors hover:bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Wallet className="h-3 w-3 text-primary" />
                        </div>
                        <div>
                          <div className="font-bold text-foreground">{formatETB(p.amount)}</div>
                          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{p.payment_type}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {p.payment_date ? format(new Date(p.payment_date), "MMM d, yyyy") : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center border rounded-xl bg-muted/10">
                  <p className="text-xs text-muted-foreground italic">No payments recorded yet.</p>
                </div>
              )}
              <div className="pt-2">
                <AddPaymentDialog onAdd={addPayment} remaining={order.remaining_price} />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ 
  title, 
  amharic, 
  icon, 
  children 
}: { 
  title: string; 
  amharic?: string; 
  icon?: React.ReactNode; 
  children: React.ReactNode 
}) {
  return (
    <div className="rounded-2xl border bg-card shadow-[var(--shadow-sm)] overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 bg-muted/30 border-b">
        {icon && <div className="text-primary">{icon}</div>}
        <h2 className="flex items-baseline gap-2">
          <span className="text-sm font-black uppercase tracking-widest text-foreground">{title}</span>
          {amharic && <span className="text-[10px] font-bold text-primary opacity-80">{amharic}</span>}
        </h2>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

function Field({ label, amharic, value, mono }: { label: string; amharic?: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        {amharic && <span className="text-[10px] font-bold text-primary opacity-60">{amharic}</span>}
      </div>
      <div className={`text-sm font-bold text-foreground ${mono ? "font-mono tracking-tight" : ""}`}>
        {value ?? <span className="text-muted-foreground font-normal italic">Not specified</span>}
      </div>
    </div>
  );
}

function MGroup({ title, amharic, data }: { title: string; amharic?: string; data: [string, string, number | undefined][] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-[10px] font-black uppercase tracking-widest text-primary">{title}</span>
        {amharic && <span className="text-[10px] font-bold text-primary/60">{amharic}</span>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {data.map(([k, am, v]) => (
          <div key={k} className="rounded-xl border bg-muted/20 px-3 py-2.5 transition-colors hover:bg-muted/30">
            <div className="flex flex-col mb-1">
              <span className="text-[9px] font-bold text-muted-foreground uppercase">{k}</span>
              <span className="text-[9px] font-bold text-primary/60">{am}</span>
            </div>
            <div className="text-sm font-black text-foreground">
              {v ?? "—"}{v != null ? <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">cm</span> : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddPaymentDialog({
  onAdd,
  remaining,
}: {
  onAdd: (amount: number, type: "deposit" | "full") => void;
  remaining: number;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"deposit" | "full">("deposit");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full">
          <Plus className="mr-2 h-4 w-4" /> Record payment
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider">Amount (ETB)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Remaining: ${formatETB(remaining)}`}
              className="h-11 font-bold text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider">Payment Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger className="h-11 font-semibold"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="deposit">Deposit / ቅድሚያ</SelectItem>
                <SelectItem value="full">Full Payment / ሙሉ ክፍያ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 mt-6">
          <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">Cancel</Button>
          <Button
            onClick={() => {
              const a = Number(amount);
              if (!a || a <= 0) {
                toast.error("Enter a valid amount");
                return;
              }
              onAdd(a, type);
              setOpen(false);
              setAmount("");
            }}
            className="w-full sm:w-auto bg-[image:var(--gradient-primary)] font-bold"
          >
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserPlusIcon() { return <UserPlus className="h-4 w-4" />; }
