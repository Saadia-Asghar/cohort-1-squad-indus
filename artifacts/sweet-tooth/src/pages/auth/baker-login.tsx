import { SignIn, SignUp } from "@clerk/react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Store, Mail, Lock, Phone, ChevronDown, ChevronUp, UserCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useManagedBaker } from "@/lib/managed-auth";
import { customFetch } from "@workspace/api-client-react";

export default function BakerLogin({ initialTab = "login" }: { initialTab?: "login" | "register" }) {
  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);
  const [, setLocation] = useLocation();
  const [showClerkSSO, setShowClerkSSO] = useState(false);
  const { loginNatively } = useManagedBaker();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await customFetch<{ token: string; baker: { id: number } }>("/api/bakers/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email, password }),
      });
      loginNatively(response.token, response.baker.id);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Invalid email/number or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/60 via-purple-50/40 to-pink-50/60 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-900 px-4 py-8 sm:py-12 flex flex-col justify-center items-center">
      <div className="w-full max-w-md mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold text-muted-foreground transition-all hover:bg-card hover:text-primary shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Sweet Tooth
        </Link>
        <span className="font-serif text-2xl font-bold text-primary">
          Sweet Tooth
        </span>
      </div>

      <Card className="w-full max-w-md border-purple-100 dark:border-purple-900/40 shadow-xl bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 shadow-inner">
            <Store className="h-6 w-6" />
          </div>
          <CardTitle className="font-serif text-2xl font-bold text-foreground">
            Baker Portal
          </CardTitle>
          <CardDescription className="text-sm">
            Manage kitchen orders, product catalog & AI assistant
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-purple-50 dark:bg-slate-900 p-1 rounded-xl">
              <TabsTrigger value="login" className="rounded-lg font-medium text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-xs">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg font-medium text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-xs">
                Sign Up (New Baker)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 focus-visible:outline-none">
              {error && (
                <div className="flex items-center gap-2 p-3 text-xs font-semibold text-destructive rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <form onSubmit={handleCustomSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Email or Phone Number</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="baker@example.com or +92 300 1234567"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 text-sm"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium h-10 shadow-sm cursor-pointer" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In to Dashboard"}
                </Button>
              </form>

              <div className="rounded-xl border border-dashed border-purple-200 dark:border-purple-900/40 p-3 bg-purple-50/50 dark:bg-purple-950/10 space-y-2 mt-4">
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 block">💡 Quick Demo Login details:</span>
                <div className="text-[11px] text-muted-foreground space-y-1">
                  <div><strong>Email:</strong> <code className="bg-background px-1.5 py-0.5 rounded border border-border select-all font-mono font-bold text-foreground">sana@studio.com</code></div>
                  <div><strong>Password:</strong> <code className="bg-background px-1.5 py-0.5 rounded border border-border select-all font-mono font-bold text-foreground">sana123</code></div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("sana@studio.com");
                    setPassword("sana123");
                  }}
                  className="w-full text-center text-xs font-bold text-purple-600 hover:underline pt-1 block cursor-pointer"
                >
                  Auto-fill demo credentials
                </button>
              </div>

              {/* Optional Clerk Managed Auth toggle */}
              <div className="pt-3 border-t border-border/60 text-center">
                <button
                  type="button"
                  onClick={() => setShowClerkSSO(!showClerkSSO)}
                  className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1"
                >
                  {showClerkSSO ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {showClerkSSO ? "Hide Clerk Social Sign-In" : "Or Sign In with Clerk / Google"}
                </button>

                {showClerkSSO && (
                  <div className="mt-3 flex justify-center">
                    <SignIn
                      routing="hash"
                      fallbackRedirectUrl="/dashboard"
                      signUpUrl="/dashboard/register"
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 focus-visible:outline-none">
              <form onSubmit={handleCustomSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Bakery / Kitchen Name</label>
                  <div className="relative">
                    <Store className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="e.g. Meethi Khushiyan Bakery"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="pl-9 text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Owner Name</label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="e.g. Fatima Ali"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="pl-9 text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="fatima@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">WhatsApp Business Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="+92 300 1234567"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="pl-9 text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 text-sm"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium h-10 shadow-sm" disabled={loading}>
                  {loading ? "Creating Bakery..." : "Create Bakery Account"}
                </Button>
              </form>

              {/* Optional Clerk Managed Register toggle */}
              <div className="pt-3 border-t border-border/60 text-center">
                <button
                  type="button"
                  onClick={() => setShowClerkSSO(!showClerkSSO)}
                  className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1"
                >
                  {showClerkSSO ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {showClerkSSO ? "Hide Clerk Social Sign-Up" : "Or Register with Clerk / Google"}
                </button>

                {showClerkSSO && (
                  <div className="mt-3 flex justify-center">
                    <SignUp
                      routing="hash"
                      fallbackRedirectUrl="/dashboard/onboarding"
                      signInUrl="/dashboard/login"
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

