import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, User as UserIcon, Calendar, DollarSign, Ruler, Palette, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/orders/new")({
  component: () => (
    <ProtectedRoute roles={["owner", "superadmin"]}>
      <DashboardLayout>
        <NewOrderPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

const measurementGroups = [
  {
    title: "Coat",
    fields: [
      ["coat_length", "Length"],
      ["coat_waist", "Waist"],
      ["coat_chest", "Chest"],
      ["coat_shoulder", "Shoulder"],
    ],
  },
  {
    title: "Pant",
    fields: [
      ["pant_length", "Length"],
      ["pant_waist", "Waist"],
      ["pant_hip", "Hip"],
      ["pant_thigh", "Thigh"],
      ["pant_bottom", "Bottom"],
    ],
  },
  {
    title: "Vest",
    fields: [
      ["vest_length", "Length"],
      ["vest_waist", "Waist"],
      ["vest_chest", "Chest"],
    ],
  },
] as const;

function NewOrderPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperadmin = user?.role === "superadmin";

  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [order, setOrder] = useState({ total_price: "", deposit: "", appointment_date: "" });
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [design, setDesign] = useState({ coat_style: "", pant_style: "", vest_style: "", notes: "" });
  const [image, setImage] = useState<File | null>(null);

  const [owners, setOwners] = useState<User[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");

  useEffect(() => {
    if (isSuperadmin) {
      api.get("/users?role=owner").then((r) => {
        const data = r.data?.data ?? r.data ?? [];
        const usersList: User[] = Array.isArray(data) ? data : data.users ?? [];
        setOwners(usersList.filter(u => u.role === "owner"));
      }).catch(console.error);
    }
  }, [isSuperadmin]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      if (isSuperadmin) {
        if (!selectedOwnerId) {
          toast.error("Please select an owner");
          setLoading(false);
          return;
        }
        fd.append("owner_id", selectedOwnerId);
      }
      fd.append("name", customer.name);
      fd.append("phone", customer.phone);
      fd.append("total_price", order.total_price);
      fd.append("deposit", order.deposit || "0");
      if (order.appointment_date) fd.append("appointment_date", order.appointment_date);
      Object.entries(measurements).forEach(([k, v]) => {
        if (v) fd.append(k, v);
      });
      if (image) fd.append("image", image);

      const res = await api.post("/orders/create-full", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const newOrder = res.data?.data?.order || res.data?.data || res.data;
      const id = newOrder?._id || newOrder?.id;

      if (id) {
        // Integrate design API
        await api.post("/designs", {
          order_id: id,
          coat_style: design.coat_style,
          pant_style: design.pant_style,
          vest_style: design.vest_style,
          notes: design.notes,
        });
      }

      toast.success("Order created!");
      
      // Invalidate queries to ensure lists are updated
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
      if (id) navigate({ to: "/orders/$orderId", params: { orderId: id } });
      else navigate({ to: "/orders" });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Order</h1>
        <p className="mt-1 text-muted-foreground">
          Capture customer info, order details and measurements.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Owner Selection for Superadmin */}
        {isSuperadmin && (
          <Section title="Shop Owner">
            <div className="space-y-2">
              <Label>Assign to Owner</Label>
              <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select an owner" />
                </SelectTrigger>
                <SelectContent>
                  {owners.map(o => (
                    <SelectItem key={o._id} value={o._id}>
                      {o.fullName} ({o.phoneNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Section>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Customer */}
          <Section title="Customer Information" icon={UserIcon}>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  placeholder="0911..."
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  required
                />
              </div>
            </div>
          </Section>

          {/* Order details */}
          <Section title="Order Details" icon={Calendar}>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="total_price">Total price (ETB)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="total_price"
                      type="number"
                      min="0"
                      step="0.01"
                      className="pl-9"
                      value={order.total_price}
                      onChange={(e) => setOrder({ ...order, total_price: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit">Deposit (ETB)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="deposit"
                      type="number"
                      min="0"
                      step="0.01"
                      className="pl-9"
                      value={order.deposit}
                      onChange={(e) => setOrder({ ...order, deposit: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointment_date">Appointment / Delivery Date</Label>
                <Input
                  id="appointment_date"
                  type="date"
                  value={order.appointment_date}
                  onChange={(e) => setOrder({ ...order, appointment_date: e.target.value })}
                />
              </div>
            </div>
          </Section>
        </div>

        {/* Measurements */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1 text-lg font-semibold">
            <Ruler className="h-5 w-5 text-primary" />
            <h2>Measurements</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {measurementGroups.map((g) => (
              <Section key={g.title} title={`${g.title}`}>
                <div className="space-y-4">
                  {g.fields.map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between gap-4">
                      <Label htmlFor={key} className="text-muted-foreground">{label}</Label>
                      <div className="flex w-24 items-center gap-2">
                        <Input
                          id={key}
                          type="number"
                          step="0.1"
                          className="h-8 text-right"
                          value={measurements[key] ?? ""}
                          onChange={(e) =>
                            setMeasurements({ ...measurements, [key]: e.target.value })
                          }
                        />
                        <span className="text-[10px] text-muted-foreground">cm</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            ))}
          </div>
        </div>

        {/* Design details at the end */}
        <Section title="Design Specifications" icon={Palette}>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="coat_style">Coat style</Label>
              <Input
                id="coat_style"
                placeholder="e.g. Single breasted, 2 buttons"
                value={design.coat_style}
                onChange={(e) => setDesign({ ...design, coat_style: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pant_style">Pant style</Label>
              <Input
                id="pant_style"
                placeholder="e.g. Slim fit, no pleats"
                value={design.pant_style}
                onChange={(e) => setDesign({ ...design, pant_style: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vest_style">Vest style</Label>
              <Input
                id="vest_style"
                placeholder="e.g. 5 buttons, V-neck"
                value={design.vest_style}
                onChange={(e) => setDesign({ ...design, vest_style: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Additional notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Any other specific requirements, adjustments, or special fabric requests..."
                rows={4}
                value={design.notes}
                onChange={(e) => setDesign({ ...design, notes: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <Label htmlFor="image" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Reference image (optional)
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  className="max-w-xs cursor-pointer"
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                />
                {image && (
                  <span className="text-xs text-muted-foreground italic">
                    {image.name} selected
                  </span>
                )}
              </div>
            </div>
          </div>
        </Section>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/orders" })}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="bg-[image:var(--gradient-primary)]">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Create order
          </Button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: any }) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-6 flex items-center gap-2 border-b pb-3">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        <h2 className="font-semibold text-sm uppercase tracking-wider">{title}</h2>
      </div>
      {children}
    </div>
  );
}
