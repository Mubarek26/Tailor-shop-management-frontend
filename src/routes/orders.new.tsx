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
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          New Order <span className="text-primary ml-1">አዲስ ትዕዛዝ</span>
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Complete the form below to register a new customer and capture their measurements and style preferences.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Owner Selection for Superadmin */}
        {isSuperadmin && (
          <Section title="Shop Owner" amharic="የሱቅ ባለቤት" icon={UserIcon}>
            <div className="space-y-3">
              <BilLabel en="Assign to Shop" am="ለባለቤት ይመድቡ" />
              <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId} required>
                <SelectTrigger className="h-11 bg-primary/5 border-primary/20 text-primary font-semibold">
                  <SelectValue placeholder="Select shop owner" />
                </SelectTrigger>
                <SelectContent>
                  {owners.map(o => (
                    <SelectItem key={o._id} value={o._id}>
                      <div className="flex flex-col">
                        <span className="font-bold">{o.fullName}</span>
                        <span className="text-[10px] opacity-70">{o.phoneNumber}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Section>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Customer */}
          <Section title="Customer Info" amharic="የደንበኛ መረጃ" icon={UserIcon}>
            <div className="grid gap-5">
              <div className="space-y-2">
                <BilLabel en="Full name" am="ሙሉ ስም" htmlFor="name" />
                <Input
                  id="name"
                  placeholder="e.g. Abebe Bikila"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  className="h-11"
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
                  className="h-11 font-mono"
                  required
                />
              </div>
            </div>
          </Section>

          {/* Order details */}
          <Section title="Order Financials" amharic="የትዕዛዝ ዝርዝር" icon={DollarSign}>
            <div className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <BilLabel en="Total (ETB)" am="ጠቅላላ ዋጋ" htmlFor="total_price" />
                  <Input
                    id="total_price"
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-11 font-bold text-lg"
                    value={order.total_price}
                    onChange={(e) => setOrder({ ...order, total_price: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <BilLabel en="Deposit (ETB)" am="ቅድሚያ ክፍያ" htmlFor="deposit" />
                  <Input
                    id="deposit"
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-11"
                    value={order.deposit}
                    onChange={(e) => setOrder({ ...order, deposit: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <BilLabel en="Delivery Date" am="ከርክክብ ቀን" htmlFor="appointment_date" icon={<Calendar className="h-3 w-3" />} />
                <Input
                  id="appointment_date"
                  type="date"
                  className="h-11"
                  value={order.appointment_date}
                  onChange={(e) => setOrder({ ...order, appointment_date: e.target.value })}
                />
              </div>
            </div>
          </Section>
        </div>

        {/* Measurements */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Ruler className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-black uppercase tracking-tighter">Measurements <span className="text-primary lowercase font-bold text-sm">መለኪያዎች</span></h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {measurementGroups.map((g) => (
              <Section key={g.title} title={g.title} amharic={g.amharic}>
                <div className="space-y-4 pt-2">
                  {g.fields.map(([key, label, am]) => (
                    <div key={key} className="flex items-center justify-between gap-3 p-2 rounded-xl bg-muted/20 transition-colors hover:bg-muted/40">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">{label}</span>
                        <span className="text-[10px] font-bold text-primary opacity-70">{am}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          id={key}
                          type="number"
                          step="0.1"
                          placeholder="0"
                          className="h-9 w-20 text-right font-bold focus-visible:ring-primary"
                          value={measurements[key] ?? ""}
                          onChange={(e) =>
                            setMeasurements({ ...measurements, [key]: e.target.value })
                          }
                        />
                        <span className="text-[10px] font-bold text-muted-foreground">cm</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            ))}
          </div>
        </div>

        {/* Design details at the end */}
        {/* Design details at the end */}
        <Section title="Design & Style" amharic="የዲዛይን ዝርዝሮች" icon={Palette}>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <BilLabel en="Coat style" am="ካፖርት ስታይል" htmlFor="coat_style" />
              <Input
                id="coat_style"
                placeholder="e.g. Slim fit, 2 buttons"
                value={design.coat_style}
                onChange={(e) => setDesign({ ...design, coat_style: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <BilLabel en="Pant style" am="ሱሪ ስታይል" htmlFor="pant_style" />
              <Input
                id="pant_style"
                placeholder="e.g. No pleats, belt loops"
                value={design.pant_style}
                onChange={(e) => setDesign({ ...design, pant_style: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <BilLabel en="Vest style" am="ቬስት ስታይል" htmlFor="vest_style" />
              <Input
                id="vest_style"
                placeholder="e.g. 4 buttons, slim"
                value={design.vest_style}
                onChange={(e) => setDesign({ ...design, vest_style: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <BilLabel en="Additional notes" am="ተጨማሪ ማስታወሻ" htmlFor="notes" icon={<FileText className="h-3 w-3" />} />
              <Textarea
                id="notes"
                placeholder="Specific fabric requirements or special instructions..."
                rows={4}
                value={design.notes}
                onChange={(e) => setDesign({ ...design, notes: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <BilLabel en="Design Image" am="የማጣቀሻ ምስል *" htmlFor="image" icon={<ImageIcon className="h-3 w-3" />} />
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border-2 border-dashed rounded-xl bg-muted/10">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  className="max-w-xs cursor-pointer h-10"
                  required
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                />
                <div className="flex-1">
                  {image ? (
                    <p className="text-xs font-bold text-primary truncate">
                      ✓ {image.name}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Upload a photo of the desired design.
                    </p>
                  )}
                </div>
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
    <div className="rounded-2xl border bg-card shadow-[var(--shadow-sm)] overflow-hidden transition-all hover:shadow-md">
      <div className="px-6 py-4 border-b bg-muted/30 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        <h2 className="font-black text-xs uppercase tracking-widest text-foreground">{title}</h2>
        {amharic && <span className="text-[10px] font-bold text-primary opacity-70">{amharic}</span>}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

function BilLabel({
  en, am, htmlFor, icon
}: {
  en: string; am: string; htmlFor?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon && <span className="text-muted-foreground opacity-70">{icon}</span>}
      <Label htmlFor={htmlFor} className="flex items-baseline gap-1.5 cursor-pointer">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{en}</span>
        <span className="text-[10px] font-bold text-primary opacity-60">{am}</span>
      </Label>
    </div>
  );
}
