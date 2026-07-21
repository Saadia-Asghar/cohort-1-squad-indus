import { SignIn } from "@clerk/react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function BakerLogin() {
  return <div className="min-h-screen bg-background px-4 py-8 sm:py-12">
    <div className="mx-auto mb-6 flex w-full max-w-md items-center justify-between">
      <Link href="/" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Sweet Tooth
      </Link>
      <span className="font-serif text-lg font-bold text-primary">Sweet Tooth</span>
    </div>
    <div className="mx-auto flex w-full max-w-md justify-center">
      <SignIn
        routing="hash"
        fallbackRedirectUrl="/dashboard"
        signUpUrl="/dashboard/register"
      />
    </div>
  </div>;
}
