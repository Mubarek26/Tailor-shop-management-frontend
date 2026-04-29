import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api, formatETB } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  ShoppingBag,
  Wallet,
  TrendingUp,
  CircleDollarSign,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <ProtectedRoute roles={["owner", "superadmin"]}>
      <DashboardLayout>
        <DashboardPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

interface Summary {
  total_orders?: number;
  total_revenue?: number;
  total_deposit?: number;
  total_remaining?: number;
  total_paid?: number;
  orders_status?: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "var(--warning)",
  in_progress: "var(--info)",
  completed: "var(--success)",
};

function DashboardPage() {
  const { user } = useAuth();
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const res = await api.get("/analytics/summary");
      return res.data?.data ?? res.data ?? {};
    },
  });

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["dashboard-revenue", groupBy],
    queryFn: async () => {
      const res = await api.get(`/analytics/revenue?groupBy=${groupBy}`);
      const data = res.data?.data ?? res.data ?? [];
      return Array.isArray(data) ? data : data.series ?? [];
    },
    placeholderData: keepPreviousData,
  });

  const summary = summaryData as Summary | null;
  const revenue = revenueData ?? [];
  const loading = summaryLoading || (revenueLoading && !revenue.length);

  const statusData = Object.entries(summary?.orders_status ?? {}).map(([k, v]) => ({
    name: k.replace("_", " "),
    value: v,
    key: k,
  }));

  const cards = [
    { label: "Total Orders", value: summary?.total_orders ?? 0, icon: ShoppingBag, color: "text-info dark:text-info", isCurrency: false },
    { label: "Revenue", value: summary?.total_revenue ?? 0, icon: TrendingUp, color: "text-accent", isCurrency: true },
    { label: "Deposits", value: summary?.total_deposit ?? 0, icon: Wallet, color: "text-warning-foreground dark:text-warning", isCurrency: true },
    { label: "Outstanding", value: summary?.total_remaining ?? 0, icon: CircleDollarSign, color: "text-destructive", isCurrency: true },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          Welcome back, <span className="text-primary">{user?.fullName?.split(" ")[0]}</span>
        </h1>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">Snapshot of your business performance today.</p>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-bold text-primary uppercase tracking-widest">Live Updates</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-[var(--shadow-sm)] transition-all hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{c.label}</p>
                      <p className="text-2xl font-black tracking-tight text-foreground">
                        {c.isCurrency ? formatETB(c.value) : c.value.toLocaleString()}
                      </p>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-muted transition-transform group-hover:scale-110 ${c.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 h-1 w-full bg-primary/5 transition-colors group-hover:bg-primary/20"></div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border bg-card shadow-[var(--shadow-sm)] overflow-hidden lg:col-span-2">
              <div className="px-6 py-4 border-b bg-muted/30 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                    <TrendingUp className="h-3 w-3 text-primary" />
                    Revenue Trend
                  </h2>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Performance over time</p>
                </div>
                <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
                  {(["day", "week", "month"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGroupBy(g)}
                      className={`rounded-lg px-4 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                        groupBy === g
                          ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6 h-80">
                {revenue.length === 0 ? (
                  <div className="flex h-full items-center justify-center border-2 border-dashed rounded-xl text-xs text-muted-foreground">
                    Waiting for revenue data...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenue}>
                      <defs>
                        <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey={(d) => d.date || d._id || d.period || ""}
                        tick={{ fontSize: 11 }}
                        stroke="var(--muted-foreground)"
                      />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                          color: "var(--foreground)",
                        }}
                        itemStyle={{ color: "var(--foreground)" }}
                        formatter={(v: any) => formatETB(Number(v))}
                      />
                      <Area
                        type="monotone"
                        dataKey={(d) => d.paid_total ?? 0}
                        name="Revenue"
                        stroke="var(--accent)"
                        strokeWidth={2}
                        fill="url(#revFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-2xl border bg-card shadow-[var(--shadow-sm)] overflow-hidden">
              <div className="px-6 py-4 border-b bg-muted/30">
                <h2 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                  <ShoppingBag className="h-3 w-3 text-primary" />
                  Order Status
                </h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">Current distribution</p>
              </div>
              <div className="p-6 h-80">
                {statusData.length === 0 ? (
                  <div className="flex h-full items-center justify-center border-2 border-dashed rounded-xl text-xs text-muted-foreground">
                    No orders to analyze yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        stroke="none"
                      >
                        {statusData.map((d) => (
                          <Cell key={d.key} fill={STATUS_COLORS[d.key] ?? "oklch(0.7 0 0)"} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          fontSize: 10,
                          fontWeight: "bold",
                          boxShadow: "var(--shadow-sm)",
                        }}
                        itemStyle={{ textTransform: "capitalize" }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        wrapperStyle={{ 
                          fontSize: 10, 
                          fontWeight: "bold", 
                          textTransform: "uppercase", 
                          paddingTop: 20 
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
