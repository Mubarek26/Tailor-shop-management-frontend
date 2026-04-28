import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scissors, Loader2, Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/resetPassword/$token")({
  component: ResetPage,
});

function ResetPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await api.patch(`/auth/reset-password/${token}`, { password, passwordConfirm });
      toast.success("Password reset successfully");
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side: Image + Overlay */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-900 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?q=80&w=2080&auto=format&fit=crop"
          alt="Tailor shop"
          className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-1000 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/40 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full h-full">
          <Link to="/" className="inline-flex items-center gap-3 text-white transition-opacity hover:opacity-80">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md shadow-lg">
              <Scissors className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight drop-shadow-md">Tailor Pro</span>
          </Link>
          <div className="text-white mt-auto animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <h2 className="text-4xl font-bold tracking-tight mb-4 drop-shadow-lg">New Beginnings</h2>
            <p className="text-zinc-300 max-w-md text-lg leading-relaxed drop-shadow">
              Secure your account with a strong password. You're just one step away from getting back to work.
            </p>
          </div>
        </div>
      </div>

      {/* Right side: Form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="lg:hidden mb-10 text-center">
            <Link to="/" className="inline-flex items-center gap-3 text-foreground justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Scissors className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold tracking-tight">Tailor Pro</span>
            </Link>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <div className="mb-6 hidden lg:flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Set new password</h1>
            <p className="mt-3 text-base text-muted-foreground">
              Your new password must be different from previous used passwords.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">New password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="h-12 bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passwordConfirm" className="text-sm font-medium">Confirm password</Label>
              <Input
                id="passwordConfirm"
                type="password"
                placeholder="••••••••"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={8}
                className="h-12 bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 bg-[image:var(--gradient-primary)] hover:opacity-90 mt-4"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : null}
              Reset Password
            </Button>

            <div className="text-center lg:text-left pt-4">
              <Link to="/login" className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
