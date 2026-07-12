import { useState } from "react";
import { useLocation } from "wouter";
import { BuyerLayout } from "@/components/layout/buyer-layout";
import {
  useGetCart,
  useRemoveFromCart,
  useCreateOrder,
  useClearCart,
  getGetCartQueryKey,
  useGetBaker,
} from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, X } from "lucide-react";

export default function Cart() {
  const { buyerId } = useBuyerSession();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerWhatsapp, setBuyerWhatsapp] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerArea, setBuyerArea] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [flavour, setFlavour] = useState("");
  const [textOnCake, setTextOnCake] = useState("");
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const { data: cartItems, isLoading } = useGetCart(
    { buyerId },
    { query: { enabled: !!buyerId, queryKey: getGetCartQueryKey({ buyerId }) } },
  );
  const removeFromCart = useRemoveFromCart();
  const createOrder = useCreateOrder();
  const clearCart = useClearCart();

  const handleRemove = (cartItemId: number) => {
    removeFromCart.mutate({ cartItemId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey({ buyerId }) });
      },
    });
  };

  const total = cartItems?.reduce((sum, item) => sum + item.unitPricePkr * item.quantity, 0) || 0;
  const bakerIds = [...new Set(cartItems?.map((item) => item.bakerId) ?? [])];
  const bakerId = bakerIds[0];
  const { data: baker } = useGetBaker(bakerId ?? 1, {
    query: { 
      enabled: !!bakerId,
      queryKey: ['getBaker', bakerId ?? 1]
    }
  });
  const requireAdvance = baker?.requireAdvance
    ? total >= (baker.advanceThresholdPkr ?? 2000)
    : false;
  const advancePercentage = baker?.advancePercentage ?? 50;
  const advanceAmount = Math.round((total * advancePercentage) / 100);

  const handleCheckout = () => {
    setCheckoutError(null);
    if (!cartItems?.length) return;
    if (bakerIds.length > 1) {
      setCheckoutError("Please checkout one baker at a time. Remove items from other bakers first.");
      return;
    }
    if (!buyerName.trim() || !buyerWhatsapp.trim() || !buyerAddress.trim()) {
      setCheckoutError("Name, WhatsApp number, and address are required.");
      return;
    }
    if (requireAdvance && !paymentScreenshotUrl.trim()) {
      setCheckoutError(`An advance payment proof is required for this order. Please transfer PKR ${advanceAmount.toLocaleString()} (${advancePercentage}%) and enter the Transaction ID or payment receipt URL.`);
      return;
    }

    const bakerId = bakerIds[0]!;
    createOrder.mutate({
      data: {
        bakerId,
        buyerId,
        buyerName: buyerName.trim(),
        buyerWhatsapp: buyerWhatsapp.trim(),
        buyerAddress: buyerAddress.trim(),
        buyerArea: buyerArea.trim() || undefined,
        totalPkr: total,
        source: "marketplace",
        specialInstructions: specialInstructions.trim() || undefined,
        flavour: flavour.trim() || undefined,
        textOnCake: textOnCake.trim() || undefined,
        paymentScreenshotUrl: paymentScreenshotUrl.trim() || undefined,
        requireAdvance,
        advancePaid: requireAdvance ? !!paymentScreenshotUrl.trim() : false,
        items: cartItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          sizeLabel: item.sizeLabel,
          quantity: item.quantity,
          unitPricePkr: item.unitPricePkr,
        })),
      },
    }, {
      onSuccess: () => {
        clearCart.mutate({ params: { buyerId } }, {
          onSettled: () => {
            queryClient.invalidateQueries({ queryKey: getGetCartQueryKey({ buyerId }) });
            setCheckoutOpen(false);
            setLocation("/orders");
          },
        });
      },
      onError: (err) => setCheckoutError(err.message ?? "Checkout failed"),
    });
  };

  return (
    <BuyerLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 font-serif text-primary">Your Cart</h1>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-muted rounded-xl w-full" />
            <div className="h-24 bg-muted rounded-xl w-full" />
          </div>
        ) : !cartItems || cartItems.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl shadow-sm">
            <p className="text-xl font-serif text-muted-foreground mb-4">Your cart is empty.</p>
            <p className="text-muted-foreground mb-6">Let's find some delicious home-baked treats.</p>
            <a href="/bakers" className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
              Explore Bakers
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-4 p-4 border border-border bg-card rounded-xl shadow-sm">
                  <div className="w-24 h-24 bg-muted rounded-md shrink-0 overflow-hidden">
                    {item.photoUrl && <img src={item.photoUrl} alt={item.productName} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-lg">{item.productName}</h3>
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          disabled={removeFromCart.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground">Size: {item.sizeLabel}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-mono font-bold text-primary">PKR {(item.unitPricePkr * item.quantity).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-fit sticky top-24">
              <h3 className="font-serif text-xl font-bold mb-4">Order Summary</h3>
              <div className="space-y-2 mb-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono font-medium">PKR {total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="text-sm text-muted-foreground italic">COD — pay on delivery</span>
                </div>
                <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="font-mono text-primary">PKR {total.toLocaleString()}</span>
                </div>
              </div>
              <button
                onClick={() => setCheckoutOpen(true)}
                className="w-full bg-primary text-primary-foreground py-3 rounded-md font-bold hover:bg-primary/90 transition-colors shadow-sm"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>

      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-serif text-xl font-bold text-primary">Checkout & Customization</h2>
              <button onClick={() => setCheckoutOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact & Delivery Info</h3>
              <input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Your Full Name"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-muted/20 focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <input
                value={buyerWhatsapp}
                onChange={(e) => setBuyerWhatsapp(e.target.value)}
                placeholder="WhatsApp Number (e.g. +923001234567)"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-muted/20 focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <input
                value={buyerArea}
                onChange={(e) => setBuyerArea(e.target.value)}
                placeholder="Area (e.g. Gulberg, DHA Phase 5, F-7)"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-muted/20 focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <textarea
                value={buyerAddress}
                onChange={(e) => setBuyerAddress(e.target.value)}
                placeholder="Complete House Address"
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-muted/20 resize-none focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cake Customization (Optional)</h3>
              <input
                value={flavour}
                onChange={(e) => setFlavour(e.target.value)}
                placeholder="Preferred Flavour (e.g. Chocolate Fudge, Red Velvet)"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-muted/20 focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <input
                value={textOnCake}
                onChange={(e) => setTextOnCake(e.target.value)}
                placeholder="Text on Cake (e.g. 'Happy 5th Birthday Ayan!')"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-muted/20 focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Any special design requests or allergy warnings..."
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-muted/20 resize-none focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            {requireAdvance && (
              <div className="space-y-3 border-t border-border pt-4 bg-yellow-50/50 dark:bg-yellow-950/20 p-3 rounded-lg border border-yellow-200/50">
                <h3 className="text-xs font-semibold text-yellow-800 dark:text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                  ⚠️ Advance Payment Required
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  To prevent ghost orders, this baker requires a {advancePercentage}% advance deposit (<strong>PKR {advanceAmount.toLocaleString()}</strong>) for orders exceeding PKR {(baker?.advanceThresholdPkr ?? 2000).toLocaleString()}.
                </p>
                <div className="text-xs p-2 bg-card rounded border border-border space-y-1 font-mono text-foreground whitespace-pre-wrap">
                  {baker?.paymentDetails || "Easypaisa Account: 0300-1234567 (Sana Asghar)"}
                </div>
                <input
                  value={paymentScreenshotUrl}
                  onChange={(e) => setPaymentScreenshotUrl(e.target.value)}
                  placeholder="Enter Transaction ID or Receipt Image Link"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                />
              </div>
            )}

            {checkoutError && <p className="text-sm text-destructive font-medium">{checkoutError}</p>}
            <button
              onClick={handleCheckout}
              disabled={createOrder.isPending || clearCart.isPending}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
            >
              {createOrder.isPending ? "Placing order..." : `Place Order — PKR ${total.toLocaleString()}`}
            </button>
          </div>
        </div>
      )}
    </BuyerLayout>
  );
}
