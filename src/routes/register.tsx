import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Scissors, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    address: "",
    password: "",
    passwordConfirm: "",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const upd = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.passwordConfirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (photo) fd.append("photo", photo);
      await api.post("/auth/owner-request", fd);
      navigate({ to: "/registration-success", search: { email: form.email } });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background items-start">
      {/* Left side: Form */}
      <div className="w-full lg:w-1/2 px-4 py-12 sm:px-8 lg:px-12 xl:px-16 order-2 lg:order-1">
        <div className="mx-auto w-full max-w-md lg:max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Logo for mobile */}
          <div className="lg:hidden mb-10 text-center">
            <Link to="/" className="inline-flex items-center gap-3 text-foreground justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Scissors className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold tracking-tight">Tailor Pro</span>
            </Link>
          </div>

          <div className="mb-6 pt-8 text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">Open your shop</h1>
            <p className="mt-3 text-base text-muted-foreground">
              Register as a tailor shop owner. Your account will be reviewed before activation.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="fullName" className="text-sm font-medium">Full name</Label>
                <Input id="fullName" value={form.fullName} onChange={(e) => upd("fullName", e.target.value)} required className="h-12 bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => upd("email", e.target.value)} required className="h-12 bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all" autoCapitalize="none" autoCorrect="off" spellCheck="false" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-sm font-medium">Phone number</Label>
                <Input id="phoneNumber" value={form.phoneNumber} onChange={(e) => upd("phoneNumber", e.target.value)} required className="h-12 bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address" className="text-sm font-medium">Shop address</Label>
                <Textarea id="address" value={form.address} onChange={(e) => upd("address", e.target.value)} rows={2} required className="min-h-[80px] resize-none bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    value={form.password} 
                    onChange={(e) => upd("password", e.target.value)} 
                    required 
                    minLength={8} 
                    className="h-12 bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all pr-12" 
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="passwordConfirm" className="text-sm font-medium">Confirm password</Label>
                <div className="relative">
                  <Input 
                    id="passwordConfirm" 
                    type={showConfirmPassword ? "text" : "password"} 
                    value={form.passwordConfirm} 
                    onChange={(e) => upd("passwordConfirm", e.target.value)} 
                    required 
                    minLength={8} 
                    className="h-12 bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all pr-12" 
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="photo" className="text-sm font-medium">Profile photo (optional)</Label>
                <Input id="photo" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} className="h-12 bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer pt-[6px]" />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 bg-[image:var(--gradient-primary)] hover:opacity-90 mt-4"
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Submit registration
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right side: Image + Overlay */}
      <div className="hidden lg:block lg:w-1/2 relative bg-zinc-900 overflow-hidden order-1 lg:order-2 lg:sticky lg:top-0 lg:h-screen">
        <img
          src="https://images.unsplash.com/photo-1558024920-b41e1887dc32?q=80&w=2000&auto=format&fit=crop"
          alt="Tailor shop"
          className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-1000 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/40 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full h-full">
          <div className="flex justify-end w-full">
            <Link to="/" className="inline-flex items-center gap-3 text-white transition-opacity hover:opacity-80">
              <span className="text-2xl font-bold tracking-tight drop-shadow-md">Tailor Pro</span>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md shadow-lg">
                <Scissors className="h-6 w-6 text-white" />
              </div>
            </Link>
          </div>
          <div className="text-white mt-auto animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <h2 className="text-4xl font-bold tracking-tight mb-4 drop-shadow-lg">A New Era of Tailoring</h2>
            <p className="text-zinc-300 max-w-md text-lg leading-relaxed drop-shadow">
              Join thousands of expert tailors who trust Tailor Pro to manage their bespoke creations, clients, and shop operations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
