import { Link } from "wouter";

export default function BakerLogin() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md p-8 border border-border rounded-2xl bg-card shadow-lg text-center space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary mb-2">Baker Portal</h1>
          <p className="text-muted-foreground">Manage your kitchen on Sweet Tooth.</p>
        </div>
        
        <div className="space-y-4 text-left">
          <div className="space-y-2">
            <label className="text-sm font-medium">WhatsApp Number</label>
            <input type="text" placeholder="+92 300 0000000" className="w-full px-4 py-3 border border-border rounded-md bg-background" />
          </div>
          <button className="w-full bg-primary text-primary-foreground py-3 rounded-md font-bold hover:bg-primary/90 transition-colors">
            Access Dashboard
          </button>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Looking for sweets? <Link href="/login" className="text-primary hover:underline">Go to Marketplace</Link>
        </p>
      </div>
    </div>
  );
}
