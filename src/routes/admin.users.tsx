import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, type User } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2, UserCog } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Eye, Pencil } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  component: () => (
    <ProtectedRoute roles={["superadmin"]}>
      <DashboardLayout>
        <UsersAdminPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function UsersAdminPage() {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    address: "",
    role: "",
    status: "",
  });

  const { data, isLoading: loading } = useQuery({
    queryKey: ["admin-users", { filter, page }],
    queryFn: async () => {
      const params: any = { page, limit: 10 };
      if (filter !== "all") params.role = filter;
      const r = await api.get("/users", { params });
      const resp = r.data?.data ?? r.data ?? {};
      return {
        users: Array.isArray(resp) ? resp : resp.users ?? [],
        totalPages: resp.pagination?.totalPages ?? 1,
      };
    },
    placeholderData: keepPreviousData,
  });

  const users = data?.users ?? [];
  const totalPages = data?.totalPages ?? 1;

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/users/${id}/status`, { status }),
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed"),
  });

  const removeUserMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      toast.success("User deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed"),
  });

  const updateUserMutation = useMutation({
    mutationFn: (form: any) => api.put(`/users/${selectedUser?._id}`, form),
    onSuccess: () => {
      toast.success("User updated successfully");
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to update user"),
    onSettled: () => setIsSaving(false),
  });

  const updateStatus = (id: string, status: string) => updateStatusMutation.mutate({ id, status });
  const removeUser = (id: string) => removeUserMutation.mutate(id);

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      fullName: user.fullName || "",
      email: user.email || "",
      phoneNumber: user.phoneNumber || "",
      address: user.address || "",
      role: user.role || "",
      status: user.status || "",
    });
    setIsEditModalOpen(true);
  };

  const handleViewClick = (user: User) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    updateUserMutation.mutate(editForm);
  };

  const filtered = users; // Filtering is now handled by the server via the 'role' parameter

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users Management</h1>
          <p className="mt-1 text-muted-foreground">Approve owners and manage all users.</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="owner">Owners</SelectItem>
            <SelectItem value="tailor">Tailors</SelectItem>
            <SelectItem value="superadmin">Superadmins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-3 rounded-full bg-muted p-4">
              <UserCog className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium">No users</p>
          </div>
        ) : (
          <>
            {/* Mobile View: List of Cards */}
            <div className="grid gap-3 p-3 md:hidden">
              {filtered.map((u) => (
                <div 
                  key={u._id} 
                  className="rounded-xl border bg-card p-4 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold border border-primary/20">
                        {u.fullName?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-foreground truncate">{u.fullName}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                        <div className="mt-1 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{u.role}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={u.status || "active"} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-muted/50 pt-3">
                    <div className="text-xs text-muted-foreground">{u.phoneNumber}</div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleViewClick(u)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditClick(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeUser(u._id)} className="bg-destructive text-destructive-foreground">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  
                  {u.role === "owner" && u.status === "pending" && (
                    <div className="mt-3 flex gap-2 border-t border-muted/50 pt-3">
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-9" onClick={() => updateStatus(u._id, "approved")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-9 text-destructive hover:text-destructive" onClick={() => updateStatus(u._id, "rejected")}>
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((u) => (
                  <tr key={u._id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                          {u.fullName?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{u.fullName}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{u.role}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.phoneNumber}</td>
                    <td className="px-4 py-3">
                      {u.status ? <StatusBadge status={u.status} /> : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleViewClick(u)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEditClick(u)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {u.role === "owner" && u.status === "pending" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => updateStatus(u._id, "approved")}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateStatus(u._id, "rejected")}>
                              Reject
                            </Button>
                          </>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removeUser(u._id)} className="bg-destructive text-destructive-foreground">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
        {!loading && users.length > 0 && (
          <Pagination 
            page={page} 
            totalPages={totalPages} 
            onPageChange={setPage} 
            loading={loading} 
          />
        )}
      </div>

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Full information about this user account.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <span className="text-sm font-medium text-muted-foreground">Full Name</span>
                <span className="col-span-2 text-sm">{selectedUser.fullName}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <span className="text-sm font-medium text-muted-foreground">Email</span>
                <span className="col-span-2 text-sm">{selectedUser.email || "N/A"}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <span className="text-sm font-medium text-muted-foreground">Phone</span>
                <span className="col-span-2 text-sm">{selectedUser.phoneNumber}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <span className="text-sm font-medium text-muted-foreground">Role</span>
                <span className="col-span-2 text-sm capitalize">{selectedUser.role}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <span className="text-sm font-medium text-muted-foreground">Status</span>
                <span className="col-span-2">
                  {selectedUser.status ? <StatusBadge status={selectedUser.status} /> : "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <span className="text-sm font-medium text-muted-foreground">Address</span>
                <span className="col-span-2 text-sm">{selectedUser.address || "N/A"}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <span className="text-sm font-medium text-muted-foreground">Joined</span>
                <span className="col-span-2 text-sm">
                  {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Modify user account details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                value={editForm.phoneNumber}
                onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(v) => setEditForm({ ...editForm, role: v })}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="tailor">Tailor</SelectItem>
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) => setEditForm({ ...editForm, status: v })}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
