import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Scissors,
  Wallet,
  Settings,
  LogOut,
  PlusCircle,
  Shield,
  UserCog,
  Menu,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
}

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["owner", "superadmin"] },
  { to: "/orders", label: "Orders", icon: ShoppingBag, roles: ["owner", "superadmin"] },
  { to: "/orders/new", label: "New Order", icon: PlusCircle, roles: ["owner", "superadmin"] },
  { to: "/customers", label: "Customers", icon: Users, roles: ["owner", "superadmin"] },
  { to: "/tailors", label: "Tailors", icon: Scissors, roles: ["owner", "superadmin"] },
  { to: "/payments", label: "Payments", icon: Wallet, roles: ["owner", "superadmin"] },
  { to: "/admin/users", label: "Users Mgmt", icon: UserCog, roles: ["superadmin"] },
  { to: "/admin/orders", label: "All Orders", icon: Shield, roles: ["superadmin"] },
  { to: "/tailor/orders", label: "My Orders", icon: ShoppingBag, roles: ["tailor"] },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const role = user?.role;
  const filtered = navItems.filter((n) => !n.roles || (role && n.roles.includes(role)));

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-card/80 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground overflow-hidden">
            {user?.photo ? (
              <img src={user.photo} alt={user.fullName} className="h-full w-full object-cover" />
            ) : (
              <Scissors className="h-4 w-4" />
            )}
          </div>
          <span className="font-semibold">Tailor Pro</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 w-64 transform bg-sidebar text-sidebar-foreground transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-full flex-col">
            <div className="hidden h-16 items-center gap-3 border-b border-sidebar-border px-6 lg:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-accent)] text-accent-foreground">
                <Scissors className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">Tailor Pro</div>
                <div className="text-[11px] text-sidebar-foreground/60">Shop Management</div>
              </div>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {filtered.map((item) => {
                const Icon = item.icon;
                const active =
                  location.pathname === item.to ||
                  (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-sidebar-border p-3">
              <div className="mb-2 flex items-center justify-between gap-3 rounded-lg px-3 py-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold overflow-hidden border border-sidebar-border/50">
                    {user?.photo ? (
                      <img src={user.photo} alt={user.fullName} className="h-full w-full object-cover" />
                    ) : (
                      user?.fullName?.[0]?.toUpperCase() ?? "U"
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{user?.fullName}</div>
                    <div className="truncate text-[11px] text-sidebar-foreground/60 capitalize">
                      {user?.role}
                    </div>
                  </div>
                </div>
                <ThemeToggle />
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {open && (
          <div
            className="fixed inset-0 z-20 bg-black/40 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Main */}
        <main className="min-h-screen flex-1 lg:ml-0">
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
