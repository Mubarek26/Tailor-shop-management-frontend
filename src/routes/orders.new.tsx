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
    amharic: "ካፖርት",
    fields: [
      ["coat_length", "Length", "ቁመት"],
      ["coat_waist", "Waist", "ወገብ"],
      ["coat_chest", "Chest", "ደረት"],
      ["coat_shoulder", "Shoulder", "ትከሻ"],
    ],
  },
  {
    title: "Pant",
    amharic: "ሱሪ",
    fields: [
      ["pant_length", "Length", "ቁመት"],
      ["pant_waist", "Waist", "ወገብ"],
      ["pant_hip", "Hip", "ዳሌ"],
      ["pant_thigh", "Thigh", "ጭን"],
      ["pant_bottom", "Bottom", "ታች"],
    ],
  },
  {
    title: "Vest",
    amharic: "ቬስት",
    fields: [
      ["vest_length", "Length", "ቁመት"],
      ["vest_waist", "Waist", "ወገብ"],
      ["vest_chest", "Chest", "ደረት"],
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
      if (!image) {
        toast.error("Reference image is required / የማጣቀሻ ምስል ያስፈልጋል");
        setLoading(false);
        return;
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
        <h1 className="text-3xl font-bold tracking-tight">
          New Order <span className="text-primary text-2xl font-bold">አዲስ ትዕዛዝ</span>
        </h1>
        <p className="mt-1 text-muted-foreground">
          Capture customer info, order details and measurements.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Owner Selection for Superadmin */}
        {isSuperadmin && (
          <Section title="Shop Owner" amharic="የሱቅ ባለቤት">
            <div className="space-y-2">
              <BilLabel en="Assign to Owner" am="ለባለቤት ይመድቡ" />
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
          <Section title="Customer Information" amharic="የደንበኛ መረጃ" icon={UserIcon}>
            <div className="grid gap-4">
              <div className="space-y-2">
                <BilLabel en="Full name" am="ሙሉ ስም" htmlFor="name" />
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <BilLabel en="Phone number" am="ስልክ ቁጥር" htmlFor="phone" />
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
          <Section title="Order Details" amharic="የትዕዛዝ ዝርዝር" icon={Calendar}>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <BilLabel en="Total price (ETB)" am="ጠቅላላ ዋጋ" htmlFor="total_price" />
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
                  <BilLabel en="Deposit (ETB)" am="ቅድሚያ ክፍያ" htmlFor="deposit" />
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
                <BilLabel en="Appointment / Delivery Date" am="ቀጠሮ / የርክክብ ቀን" htmlFor="appointment_date" />
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
            <h2>Measurements <span className="text-primary text-base">መለኪያዎች</span></h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {measurementGroups.map((g) => (
              <Section key={g.title} title={g.title} amharic={g.amharic}>
                <div className="space-y-4">
                  {g.fields.map(([key, label, am]) => (
                    <div key={key} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold text-foreground">{label}</span>
                        <span className="text-sm font-semibold text-primary">{am}</span>
                      </div>
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
        <Section title="Design Specifications" amharic="የዲዛይን ዝርዝሮች" icon={Palette}>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <BilLabel en="Coat style" am="ካፖርት ስታይል" htmlFor="coat_style" />
              <Input
                id="coat_style"
                placeholder="e.g. Single breasted, 2 buttons"
                value={design.coat_style}
                onChange={(e) => setDesign({ ...design, coat_style: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <BilLabel en="Pant style" am="ሱሪ ስታይል" htmlFor="pant_style" />
              <Input
                id="pant_style"
                placeholder="e.g. Slim fit, no pleats"
                value={design.pant_style}
                onChange={(e) => setDesign({ ...design, pant_style: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <BilLabel en="Vest style" am="ቬስት ስታይል" htmlFor="vest_style" />
              <Input
                id="vest_style"
                placeholder="e.g. 5 buttons, V-neck"
                value={design.vest_style}
                onChange={(e) => setDesign({ ...design, vest_style: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <BilLabel en="Additional notes" am="ተጨማሪ ማስታወሻ" htmlFor="notes" icon={<FileText className="h-4 w-4" />} />
              <Textarea
                id="notes"
                placeholder="Any other specific requirements, adjustments, or special fabric requests..."
                rows={4}
                value={design.notes}
                onChange={(e) => setDesign({ ...design, notes: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <BilLabel en="Reference image" am="የማጣቀሻ ምስል *" htmlFor="image" icon={<ImageIcon className="h-4 w-4" />} />
              <div className="flex items-center gap-4">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  className="max-w-xs cursor-pointer"
                  required
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

function Section({ title, amharic, children, icon: Icon }: { title: string; amharic?: string; children: React.ReactNode; icon?: any }) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-6 flex items-center gap-2 border-b pb-3">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        <h2 className="font-bold text-sm uppercase tracking-wider text-foreground">{title}</h2>
        {amharic && <span className="text-sm font-bold text-primary">{amharic}</span>}
      </div>
      {children}
    </div>
  );
}

function BilLabel({
  en, am, htmlFor, icon
}: {
  en: string; am: string; htmlFor?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <Label htmlFor={htmlFor} className="flex items-center gap-1.5 cursor-pointer">
        <span className="font-bold text-foreground">{en}</span>
        <span className="font-bold text-primary">{am}</span>
      </Label>
    </div>
  );
}
