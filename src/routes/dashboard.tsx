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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.fullName?.split(" ")[0]}</h1>
        <p className="mt-1 text-muted-foreground">Here's a snapshot of your shop today.</p>
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
                <div key={c.label} className="rounded-xl border bg-card p-5 shadow-[var(--shadow-sm)]">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{c.label}</p>
                      <p className="mt-2 text-2xl font-bold tracking-tight">
                        {c.isCurrency ? formatETB(c.value) : c.value.toLocaleString()}
                      </p>
                    </div>
                    <div className={`rounded-lg bg-muted p-2 ${c.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border bg-card p-6 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Revenue trend</h2>
                  <p className="text-xs text-muted-foreground">Total revenue over time</p>
                </div>
                <div className="flex gap-1 rounded-lg border p-0.5">
                  {(["day", "week", "month"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGroupBy(g)}
                      className={`rounded-md px-3 py-1 text-xs capitalize transition-colors ${
                        groupBy === g
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-72">
                {revenue.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No revenue data yet
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

            <div className="rounded-xl border bg-card p-6">
              <h2 className="font-semibold">Order status</h2>
              <p className="text-xs text-muted-foreground">Current breakdown</p>
              <div className="mt-4 h-64">
                {statusData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No orders yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {statusData.map((d) => (
                          <Cell key={d.key} fill={STATUS_COLORS[d.key] ?? "oklch(0.7 0 0)"} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                          color: "var(--foreground)",
                        }}
                        itemStyle={{ color: "var(--foreground)" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
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
