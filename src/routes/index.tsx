import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Scissors, Ruler, BarChart3, Users, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "tailor") navigate({ to: "/tailor/orders" });
      else navigate({ to: "/dashboard" });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
              <Scissors className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">Tailor Pro</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-[image:var(--gradient-primary)]">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-40"
          style={{
            background:
              "radial-gradient(60% 40% at 50% 0%, oklch(0.65 0.13 175 / 0.25), transparent 70%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Built for modern tailor shops
          </div>
          <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
            Run your tailor shop with{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              precision and ease
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Manage orders, measurements, customers, payments, and your team — all from one elegant
            dashboard. Designed for shop owners and tailors alike.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/register">
              <Button size="lg" className="bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
                Start free
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Ruler,
              title: "Full measurements",
              desc: "Track coat, pant and vest measurements per order.",
            },
            {
              icon: Users,
              title: "Customer profiles",
              desc: "Auto-generated codes and full order history per customer.",
            },
            {
              icon: BarChart3,
              title: "Live analytics",
              desc: "Revenue trends, deposits, and order status at a glance.",
            },
            {
              icon: Scissors,
              title: "Tailor assignments",
              desc: "Assign work to tailors and track their progress.",
            },
            {
              icon: ShieldCheck,
              title: "Role-based access",
              desc: "Separate views for owners, tailors and superadmins.",
            },
            {
              icon: Sparkles,
              title: "Designed for speed",
              desc: "Create a full order — customer, design, measurements — in one go.",
            },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl border bg-card p-6 transition-all hover:shadow-[var(--shadow-md)]"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Tailor Pro. Crafted with care.
      </footer>
    </div>
  );
}
