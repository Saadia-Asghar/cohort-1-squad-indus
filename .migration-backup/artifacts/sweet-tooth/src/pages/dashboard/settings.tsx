import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useBuyerSession } from "@/hooks/use-session";
import { useGetBaker, useUpdateBaker, getGetBakerQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export default function DashboardSettings() {
  const { bakerId } = useBuyerSession();
  const queryClient = useQueryClient();
  const { data: baker, isLoading } = useGetBaker(bakerId);
  const updateBaker = useUpdateBaker();

  const [businessName, setBusinessName] = useState("");
  const [tagline, setTagline] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [codPolicy, setCodPolicy] = useState("");
  const [requireAdvance, setRequireAdvance] = useState(false);
  const [advanceThresholdPkr, setAdvanceThresholdPkr] = useState(2000);
  const [advancePercentage, setAdvancePercentage] = useState(50);
  const [paymentDetails, setPaymentDetails] = useState("");

  useEffect(() => {
    if (baker) {
      setBusinessName(baker.businessName ?? "");
      setTagline(baker.tagline ?? "");
      setWhatsappNumber(baker.whatsappNumber ?? "");
      setCodPolicy(baker.codPolicy ?? "");
      setRequireAdvance(baker.requireAdvance ?? false);
      setAdvanceThresholdPkr(baker.advanceThresholdPkr ?? 2000);
      setAdvancePercentage(baker.advancePercentage ?? 50);
      setPaymentDetails(baker.paymentDetails ?? "");
    }
  }, [baker]);

  const handleSave = () => {
    updateBaker.mutate({
      bakerId,
      data: {
        businessName,
        tagline,
        codPolicy,
        requireAdvance,
        advanceThresholdPkr,
        advancePercentage,
        paymentDetails,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBakerQueryKey(bakerId) });
        alert("Settings saved successfully!");
      },
      onError: (err) => {
        alert("Failed to save settings: " + (err as any).message);
      }
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-8 text-muted-foreground">Loading settings...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl">
        <h1 className="text-4xl font-bold mb-2 font-serif text-primary">Your kitchen, your rules.</h1>
        <p className="text-muted-foreground mb-8">Manage your profile, delivery areas, and policies.</p>
        
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <h3 className="font-serif text-xl font-bold">Kitchen Details</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Business Name</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" 
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Tagline</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" 
                value={tagline}
                onChange={e => setTagline(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">WhatsApp Number</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" 
                value={whatsappNumber}
                onChange={e => setWhatsappNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <h3 className="font-serif text-xl font-bold">Advance Deposit Policy</h3>
            
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                id="requireAdvance"
                checked={requireAdvance}
                onChange={e => setRequireAdvance(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
              />
              <label htmlFor="requireAdvance" className="text-sm font-medium text-foreground cursor-pointer">
                Require advance deposit for high-value orders
              </label>
            </div>

            {requireAdvance && (
              <div className="space-y-4 pt-2 border-t border-border/50 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Minimum Order (PKR) for Deposit</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" 
                      value={advanceThresholdPkr}
                      onChange={e => setAdvanceThresholdPkr(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Deposit Percentage (%)</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" 
                      value={advancePercentage}
                      onChange={e => setAdvancePercentage(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Payment Account Information</label>
                  <textarea 
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px]" 
                    placeholder="e.g. Easypaisa Account: 0300-1234567 (Sana Asghar)"
                    value={paymentDetails}
                    onChange={e => setPaymentDetails(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This account information will be printed directly in the buyer's checkout window.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <h3 className="font-serif text-xl font-bold">Policies</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Cash on Delivery (COD) Policy Description</label>
              <textarea 
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[100px]" 
                value={codPolicy}
                onChange={e => setCodPolicy(e.target.value)}
              />
            </div>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={updateBaker.isPending}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors w-full sm:w-auto disabled:opacity-50"
          >
            {updateBaker.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
