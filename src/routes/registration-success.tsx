import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, ArrowRight, ShieldCheck, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/registration-success")({
  validateSearch: z.object({
    email: z.string().optional(),
  }),
  component: RegistrationSuccessPage,
});

function RegistrationSuccessPage() {
  const { email } = Route.useSearch();
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast.error("Email address not found. Please try logging in.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/resend-verification", { email });
      toast.success(res.data?.message || "Verification email resent!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to resend email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Card className="border-none shadow-2xl overflow-hidden">
          <div className="h-2 bg-[image:var(--gradient-primary)]" />
          <CardHeader className="text-center pt-10 pb-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary mb-6">
              <Mail className="h-10 w-10" />
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight">Application Submitted!</CardTitle>
            <p className="text-muted-foreground mt-2 text-lg">
              We've received your application to join the Tailor Pro network.
            </p>
            {email && <p className="text-sm font-medium text-primary mt-2">{email}</p>}
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div className="grid gap-6">
              <div className="flex gap-4 p-4 rounded-xl bg-muted/50 border border-muted-foreground/10">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Step 1: Verify your email</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Check your inbox (and spam folder) for a verification link. You must verify your email to proceed.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-xl bg-muted/50 border border-muted-foreground/10">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Step 2: Admin Review</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Once verified, our team will review your shop's application. This typically takes 24-48 hours.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 p-6 rounded-2xl bg-primary/5 border border-primary/10 text-center">
              <p className="text-sm text-primary font-medium">
                You will receive a final confirmation email once your account is approved.
              </p>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Didn't get the email?{" "}
              <button 
                onClick={handleResend} 
                disabled={loading}
                className="text-primary font-semibold hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {loading ? "Sending..." : "Resend link"}
              </button>
            </p>
            <Button asChild className="bg-[image:var(--gradient-primary)] hover:opacity-90 shadow-md">
              <Link to="/login" className="flex items-center gap-2">
                Go to Login <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
