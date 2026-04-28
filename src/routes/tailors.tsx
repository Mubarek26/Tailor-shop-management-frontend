import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, type User } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Scissors, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Pagination } from "@/components/Pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export const Route = createFileRoute("/tailors")({
  component: () => (
    <ProtectedRoute roles={["owner", "superadmin"]}>
      <DashboardLayout>
        <TailorsPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function TailorsPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading: loading } = useQuery({
    queryKey: ["tailors", { page }],
    queryFn: async () => {
      const params = { page, limit: 10 };
      const r = await api.get("/users/tailors", { params });
      const resp = r.data?.data ?? r.data ?? {};
      return {
        tailors: Array.isArray(resp) ? resp : resp.tailors ?? [],
        totalPages: resp.pagination?.totalPages ?? 1,
      };
    },
    placeholderData: keepPreviousData,
  });

  const tailors = data?.tailors ?? [];
  const totalPages = data?.totalPages ?? 1;

  const onDone = () => {
    queryClient.invalidateQueries({ queryKey: ["tailors"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tailors</h1>
          <p className="mt-1 text-muted-foreground">Manage your team of tailors.</p>
        </div>
        <AddTailorDialog onDone={onDone} />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tailors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full bg-muted p-4">
              <Scissors className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium">No tailors yet</p>
            <p className="text-sm text-muted-foreground">Create one or assign by phone number.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Tailor</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tailors.map((t) => (
                  <tr key={t._id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent text-sm font-semibold">
                          {t.fullName?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium">{t.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.phoneNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.email ?? "—"}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{t.status ?? "active"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && tailors.length > 0 && (
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

function AddTailorDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("create");

  // create
  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    address: "",
    password: "",
    passwordConfirm: "",
  });
  const [creating, setCreating] = useState(false);

  // assign
  const [assignPhone, setAssignPhone] = useState("");
  const [assigning, setAssigning] = useState(false);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.passwordConfirm) {
      toast.error("Passwords do not match");
      return;
    }
    setCreating(true);
    try {
      await api.post("/users/create-tailor", form);
      toast.success("Tailor created");
      setOpen(false);
      onDone();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed");
    } finally {
      setCreating(false);
    }
  };

  const onAssign = async (e: FormEvent) => {
    e.preventDefault();
    setAssigning(true);
    try {
      await api.post("/auth/assign-tailor-by-phone", { phoneNumber: assignPhone });
      toast.success("Tailor assigned");
      setOpen(false);
      setAssignPhone("");
      onDone();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[image:var(--gradient-primary)]">
          <Plus className="mr-2 h-4 w-4" /> Add tailor
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a tailor</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create"><UserPlus className="mr-2 h-4 w-4" />Create new</TabsTrigger>
            <TabsTrigger value="assign">Assign existing</TabsTrigger>
          </TabsList>
          <TabsContent value="create">
            <form onSubmit={onCreate} className="space-y-3 pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Full name</Label>
                  <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Email (optional)</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Address (optional)</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm</Label>
                  <Input type="password" value={form.passwordConfirm} onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })} required minLength={8} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={creating} className="bg-[image:var(--gradient-primary)]">
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create tailor
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
          <TabsContent value="assign">
            <form onSubmit={onAssign} className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label>Tailor phone number</Label>
                <Input value={assignPhone} onChange={(e) => setAssignPhone(e.target.value)} required />
                <p className="text-xs text-muted-foreground">
                  The tailor must already have an account.
                </p>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={assigning} className="bg-[image:var(--gradient-primary)]">
                  {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Assign
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
