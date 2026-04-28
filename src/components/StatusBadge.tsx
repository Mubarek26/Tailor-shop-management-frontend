import { cn } from "@/lib/utils";

type Status = "pending" | "in_progress" | "completed" | string;

const styles: Record<string, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/30 [&]:text-[oklch(0.45_0.12_70)]",
  in_progress: "bg-info/15 border-info/30 [&]:text-[oklch(0.45_0.15_245)]",
  completed: "bg-success/15 border-success/30 [&]:text-[oklch(0.4_0.13_155)]",
  approved: "bg-success/15 border-success/30 [&]:text-[oklch(0.4_0.13_155)]",
  rejected: "bg-destructive/15 border-destructive/30 text-destructive",
};

const labels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  approved: "Approved",
  rejected: "Rejected",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        styles[status] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {labels[status] ?? status.replace("_", " ")}
    </span>
  );
}
