import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Camera, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <SettingsPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function SettingsPage() {
  const { user, setUser } = useAuth();
  
  // Profile state
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [address, setAddress] = useState(user?.address || "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.photo || null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setEmail(user.email || "");
      setAddress(user.address || "");
      setPhotoPreview(user.photo || null);
    }
  }, [user]);

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const fd = new FormData();
      fd.append("fullName", fullName);
      fd.append("email", email);
      fd.append("address", address);
      if (photo) fd.append("photo", photo);

      const res = await api.patch("/users/me", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      const updatedUser = res.data?.data?.user || res.data?.user;
      if (updatedUser) {
        setUser(updatedUser);
        toast.success("Profile updated");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const onUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirm) {
      toast.error("Passwords do not match");
      return;
    }
    setPasswordLoading(true);
    try {
      await api.patch("/auth/update-password", { currentPassword, password, passwordConfirm });
      toast.success("Password updated");
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirm("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Settings <span className="text-primary text-2xl font-bold">ቅንብሮች</span>
        </h1>
        <p className="mt-1 text-muted-foreground">Manage your profile and security / መገለጫዎን እና ደህንነትዎን ያስተዳድሩ</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Card */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-bold text-foreground mb-6">
            <span>Profile Information</span>
            <span className="text-primary text-sm">የመገለጫ መረጃ</span>
          </h2>
          
          <form onSubmit={onUpdateProfile} className="space-y-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="relative group">
                <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-primary/20 bg-muted flex items-center justify-center">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <label 
                  htmlFor="photo-upload" 
                  className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110"
                >
                  <Camera className="h-4 w-4" />
                  <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
                </label>
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-bold text-foreground">{user?.fullName}</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{user?.role}</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG or GIF. Max 2MB.</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <BilLabel en="Full Name" am="ሙሉ ስም" htmlFor="fullName" />
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                  disabled={user?.role === "tailor"}
                />
              </div>
              <div className="space-y-2">
                <BilLabel en="Email Address" am="ኢሜይል አድራሻ" htmlFor="email" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={user?.role === "tailor"}
                />
              </div>
              <div className="space-y-2">
                <BilLabel en="Physical Address" am="አድራሻ" htmlFor="address" />
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Shop location or city"
                />
              </div>
            </div>

            <Button type="submit" disabled={profileLoading} className="w-full sm:w-auto bg-[image:var(--gradient-primary)]">
              {profileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes / ለውጦችን አስቀምጥ
            </Button>
          </form>
        </div>

        {/* Password Card */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-bold text-foreground mb-6">
            <span>Change Password</span>
            <span className="text-primary text-sm">የይለፍ ቃል ቀይር</span>
          </h2>
          
          <form onSubmit={onUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <BilLabel en="Current Password" am="የአሁኑ የይለፍ ቃል" htmlFor="currentPassword" />
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <BilLabel en="New Password" am="አዲስ የይለፍ ቃል" htmlFor="password" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <BilLabel en="Confirm New Password" am="አዲስ የይለፍ ቃል ያረጋግጡ" htmlFor="passwordConfirm" />
              <Input
                id="passwordConfirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" disabled={passwordLoading} className="w-full sm:w-auto bg-[image:var(--gradient-primary)]">
              {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password / የይለፍ ቃል አዘምን
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function BilLabel({ en, am, htmlFor }: { en: string; am: string; htmlFor?: string }) {
  return (
    <Label htmlFor={htmlFor} className="flex items-center gap-1.5 cursor-pointer">
      <span className="font-bold text-foreground text-xs uppercase tracking-wide">{en}</span>
      <span className="font-bold text-primary text-xs">{am}</span>
    </Label>
  );
}
