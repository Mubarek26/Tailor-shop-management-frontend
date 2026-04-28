import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: string[];
}) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    } else if (!loading && user && roles && !roles.includes(user.role)) {
      // redirect to their default dashboard
      if (user.role === "tailor") navigate({ to: "/tailor/orders" });
      else navigate({ to: "/dashboard" });
    }
  }, [user, loading, navigate, roles]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (roles && !roles.includes(user.role)) return null;

  return <>{children}</>;
}
