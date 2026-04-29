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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2, ArrowLeft, UserPlus, UserMinus, Plus } from "lucide-react";
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
  const assignTailor = (tailorId: string) => assignTailorMutation.mutate(tailorId);
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/orders" })}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Orders
          </Button>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Order #{customer?.unique_code ?? order._id.slice(-6)}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <StatusBadge status={order.status} />
            <span className="text-sm text-muted-foreground">
              Created {order.createdAt ? format(new Date(order.createdAt), "MMM d, yyyy") : "—"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={order.status} onValueChange={updateStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive hover:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this order?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the order, measurements, and design image.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteOrder} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Customer */}
          <Card title="Customer" amharic="ደንበኛ">
            <Field label="Name" amharic="ስም" value={customer?.name} />
            <Field label="Phone" amharic="ስልክ" value={customer?.phone} />
            <Field label="Code" amharic="ኮድ" value={`#${customer?.unique_code ?? "—"}`} mono />
          </Card>

          {/* Order */}
          <Card title="Order details" amharic="የትዕዛዝ ዝርዝር">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Total price" amharic="ጠቅላላ ዋጋ" value={formatETB(order.total_price)} />
              <Field label="Deposit" amharic="ቅድሚያ ክፍያ" value={formatETB(order.deposit)} />
              <Field label="Remaining" amharic="ቀሪ ክፍያ" value={formatETB(order.remaining_price)} />
              <Field
                label="Appointment"
                amharic="ቀጠሮ"
                value={
                  order.appointment_date
                    ? format(new Date(order.appointment_date), "MMM d, yyyy")
                    : "—"
                }
              />
            </div>
          </Card>

          {/* Design */}
          <Card title="Design details" amharic="የዲዛይን ዝርዝር">
            {!design ? (
              <p className="text-sm text-muted-foreground">No design styles specified.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Coat style" amharic="ካፖርት ስታይል" value={design.coat_style} />
                <Field label="Pant style" amharic="ሱሪ ስታይል" value={design.pant_style} />
                <Field label="Vest style" amharic="ቬስት ስታይል" value={design.vest_style} />
                {design.notes && (
                  <div className="sm:col-span-3">
                    <Field label="Notes" amharic="ማስታወሻ" value={design.notes} />
                  </div>
                )}
              </div>
            )}
            {order.design_image_url && (
              <div className="mt-4">
                <Label className="mb-2 block">Reference Image / <span className="text-muted-foreground font-normal">የማጣቀሻ ምስል</span></Label>
                <img
                  src={order.design_image_url}
                  alt="Design"
                  className="max-h-72 rounded-lg border object-contain"
                />
              </div>
            )}
          </Card>

          {/* Measurements */}
          <Card title="Measurements" amharic="መለኪያዎች">
            {!measurements ? (
              <p className="text-sm text-muted-foreground">No measurements yet.</p>
            ) : (
              <div className="space-y-4">
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
          <Card title="Assigned tailor" amharic="የተመደበ ሰፊ">
            {tailor ? (
              <div>
                <p className="font-medium">{tailor.fullName}</p>
                <p className="text-sm text-muted-foreground">{tailor.phoneNumber}</p>
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={unassignTailor}>
                  <UserMinus className="mr-2 h-4 w-4" /> Unassign
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">No tailor assigned.</p>
                <Select onValueChange={assignTailor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assign tailor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tailors.length === 0 ? (
                      <div className="p-2 text-xs text-muted-foreground">No tailors available</div>
                    ) : (
                      tailors.map((t) => (
                        <SelectItem key={t._id} value={t._id}>
                          {t.fullName} — {t.phoneNumber}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </Card>

          {/* Payments */}
          <Card title="Payments" amharic="ክፍያዎች">
            <div className="space-y-2">
              {payment?.history?.length ? (
                payment.history.map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium">{formatETB(p.amount)}</div>
                      <div className="text-xs capitalize text-muted-foreground">{p.payment_type}</div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {p.payment_date ? format(new Date(p.payment_date), "MMM d") : ""}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No payments recorded.</p>
              )}
              <AddPaymentDialog onAdd={addPayment} remaining={order.remaining_price} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, amharic, children }: { title: string; amharic?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="mb-4 flex items-baseline gap-2">
        <span className="text-base font-bold text-foreground">{title}</span>
        {amharic && <span className="text-sm font-bold text-primary">{amharic}</span>}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, amharic, value, mono }: { label: string; amharic?: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs font-bold uppercase tracking-wide text-foreground">{label}</span>
        {amharic && <span className="text-xs font-bold text-primary">{amharic}</span>}
      </div>
      <div className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value ?? "—"}</div>
    </div>
  );
}

function MGroup({ title, amharic, data }: { title: string; amharic?: string; data: [string, string, number | undefined][] }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-foreground">{title}</span>
        {amharic && <span className="text-xs font-bold text-primary">{amharic}</span>}
      </div>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {data.map(([k, am, v]) => (
          <div key={k} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs font-semibold text-foreground">{k}</span>
              <span className="text-xs font-semibold text-primary">{am}</span>
            </div>
            <div className="font-bold text-foreground">{v ?? "—"}{v != null ? " cm" : ""}</div>
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Amount (ETB)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Remaining: ${formatETB(remaining)}`}
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="full">Full payment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
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
            className="bg-[image:var(--gradient-primary)]"
          >
            Save payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserPlusIcon() { return <UserPlus className="h-4 w-4" />; }
