import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scissors, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(identifier, password);
      toast.success("Welcome back!");
      if (u.role === "tailor") navigate({ to: "/tailor/orders" });
      else navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Invalid credentials");
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
            <h2 className="text-4xl font-bold tracking-tight mb-4 drop-shadow-lg">Crafting Excellence</h2>
            <p className="text-zinc-300 max-w-md text-lg leading-relaxed drop-shadow">
              Manage your orders, connect with customers, and grow your bespoke tailoring business with our modern platform.
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
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Welcome back</h1>
            <p className="mt-3 text-base text-muted-foreground">
              Sign in to your account to continue your craft.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-sm font-medium">Email or phone number</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="name@example.com or 0912..."
                required
                className="h-12 bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
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
              Sign in
            </Button>
          </form>

          <p className="mt-10 text-center text-sm text-muted-foreground">
            New shop owner?{" "}
            <Link to="/register" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
