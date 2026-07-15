import { useState, useRef, useEffect } from "react";
import { BuyerLayout } from "@/components/layout/buyer-layout";
import { 
  useGetBaker, 
  useGetBakerProducts, 
  useGetBakerReviews,
  useSendChatMessage,
  useAddToCart,
  getGetBakerQueryKey, 
  getGetBakerProductsQueryKey,
  getGetBakerReviewsQueryKey,
  getGetCartQueryKey
} from "@workspace/api-client-react";
import { useParams } from "wouter";
import { Link } from "wouter";
import { useBuyerSession } from "@/hooks/use-session";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle, X, Send, User, Star, Phone, Sparkles, Facebook, Instagram } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type PublicChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function BakerProfile() {
  const { id } = useParams<{ id: string }>();
  const bakerId = parseInt(id, 10);
  const { buyerId } = useBuyerSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: baker, isLoading: loadingBaker } = useGetBaker(bakerId, { query: { enabled: !!bakerId, queryKey: getGetBakerQueryKey(bakerId) } });
  const { data: products, isLoading: loadingProducts } = useGetBakerProducts(bakerId, { query: { enabled: !!bakerId, queryKey: getGetBakerProductsQueryKey(bakerId) } });
  const { data: reviews } = useGetBakerReviews(bakerId, { query: { enabled: !!bakerId, queryKey: getGetBakerReviewsQueryKey(bakerId) } });

  const addToCart = useAddToCart();
  const [selectedSizes, setSelectedSizes] = useState<Record<number, string>>({});

  const handleAddToCart = (product: any) => {
    const sizeLabel = selectedSizes[product.id] || (product.sizes?.[0]?.label || "Standard");
    const sizeOpt = product.sizes?.find((s: any) => s.label === sizeLabel);
    const price = sizeOpt ? sizeOpt.pricePkr : product.basePricePkr;

    addToCart.mutate({
      data: {
        buyerId,
        bakerId,
        productId: product.id,
        productName: product.name,
        sizeLabel,
        quantity: 1,
        unitPricePkr: price,
        photoUrl: product.photoUrl
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey({ buyerId }) });
        toast({ title: "Added to cart", description: `${product.name} added to your cart.` });
      }
    });
  };

  // Chat Widget State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [publicMessages, setPublicMessages] = useState<PublicChatMessage[]>([]);
  const [chatSessionId, setChatSessionId] = useState(() => {
    const storageKey = `sweet-tooth-public-chat-${bakerId}`;
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;
    const randomId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const created = `web-${bakerId}-${randomId}`;
    localStorage.setItem(storageKey, created);
    return created;
  });
  const sendMessage = useSendChatMessage();
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [publicMessages, isChatOpen]);

  const sendPublicMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sendMessage.isPending) return;

    const messageId = `user-${Date.now()}`;
    setPublicMessages((current) => [...current, { id: messageId, role: "user", content: trimmed }]);
    sendMessage.mutate({
      data: { bakerId, message: trimmed, sessionId: chatSessionId },
    }, {
      onSuccess: (response) => {
        const storageKey = `sweet-tooth-public-chat-${bakerId}`;
        setChatSessionId(response.sessionId);
        localStorage.setItem(storageKey, response.sessionId);
        setPublicMessages((current) => [...current, {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.reply,
        }]);
      },
      onError: () => {
        setPublicMessages((current) => [...current, {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: "The bakery assistant is temporarily unavailable. Please contact the baker directly.",
        }]);
      },
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendPublicMessage(message);
    setMessage("");
  };

  const handleQuickMessage = (text: string) => {
    sendPublicMessage(text);
  };

  const askAboutProduct = (productName: string) => {
    setIsChatOpen(true);
    handleQuickMessage(`Tell me about ${productName}. Is it available, and can I order it today?`);
  };

  const whatsappChatUrl = (baker as { whatsappChatUrl?: string | null } | undefined)?.whatsappChatUrl;
  const shopSettings = (baker as { publicShopSettings?: { menuAccent?: string; availabilityHours?: string; dietaryPolicy?: string; preferredCustomerChannel?: "web" | "whatsapp" | "instagram" } } | undefined)?.publicShopSettings;
  const socialLinks = (baker as { socialLinks?: { instagram?: string; facebook?: string } } | undefined)?.socialLinks;
  const menuAccent = /^#[0-9a-fA-F]{6}$/.test(shopSettings?.menuAccent ?? "") ? shopSettings!.menuAccent! : "#7c3aed";
  const preferredCustomerChannel = shopSettings?.preferredCustomerChannel ?? "web";
  const instagramUrl = socialLinks?.instagram;
  const useWebAssistant = preferredCustomerChannel === "web" ||
    (preferredCustomerChannel === "whatsapp" && !whatsappChatUrl) ||
    (preferredCustomerChannel === "instagram" && !instagramUrl);
  const channelHandoff = preferredCustomerChannel === "whatsapp" && whatsappChatUrl
    ? { href: whatsappChatUrl, label: "Chat with the bakery agent on WhatsApp", icon: "whatsapp" as const }
    : preferredCustomerChannel === "instagram" && instagramUrl
      ? { href: instagramUrl, label: "Message the bakery on Instagram", icon: "instagram" as const }
      : null;

  return (
    <BuyerLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl relative">
        {loadingBaker ? (
          <div className="animate-pulse space-y-8">
            <div className="h-64 bg-muted rounded-xl w-full"></div>
          </div>
        ) : baker ? (
          <>
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden mb-12">
              <div className="h-48 relative" style={{ backgroundColor: `${menuAccent}1a` }}>
                {baker.photoUrl ? (
                   <img src={baker.photoUrl} alt={baker.businessName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-primary/20">
                     <span className="font-serif text-6xl">{baker.businessName[0]}</span>
                  </div>
                )}
              </div>
              <div className="p-8 relative">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div>
                    <h1 className="text-4xl font-bold font-serif mb-2" style={{ color: menuAccent }}>{baker.businessName}</h1>
                    <p className="text-xl text-muted-foreground">{baker.tagline}</p>
                    <p className="text-sm mt-4 max-w-2xl">{baker.bio}</p>
                    
                    <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="bg-muted px-3 py-1.5 rounded-md">
                        <span className="font-bold text-foreground">Delivery Areas:</span> {baker.deliveryAreas?.join(", ") || baker.area || baker.city}
                      </div>
                      <div className="bg-muted px-3 py-1.5 rounded-md">
                        <span className="font-bold text-foreground">COD Policy:</span> {baker.codPolicy || "Standard"}
                      </div>
                      {shopSettings?.availabilityHours && <div className="bg-muted px-3 py-1.5 rounded-md"><span className="font-bold text-foreground">Order hours:</span> {shopSettings.availabilityHours}</div>}
                    </div>
                    {(socialLinks?.instagram || socialLinks?.facebook) && <div className="mt-4 flex flex-wrap gap-2">
                      {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"><Instagram className="h-4 w-4" /> Instagram</a>}
                      {socialLinks.facebook && <a href={socialLinks.facebook} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"><Facebook className="h-4 w-4" /> Facebook</a>}
                    </div>}
                  </div>
                  <div className="text-right flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-lg font-medium bg-secondary/10 text-secondary-foreground px-3 py-1 rounded-full">
                      <Star className="w-4 h-4 fill-secondary text-secondary" /> 
                      {baker.ratingAvg?.toFixed(1) || 'New'} 
                      <span className="text-sm text-muted-foreground ml-1">({baker.totalOrders} orders)</span>
                    </div>
                    {baker.agentActive && (
                      <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium border border-green-200">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Active today
                      </span>
                    )}
                    {channelHandoff && (
                      <a
                        href={channelHandoff.href}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold border transition-colors ${channelHandoff.icon === "whatsapp" ? "text-green-700 bg-green-50 border-green-200 hover:bg-green-100" : "text-pink-700 bg-pink-50 border-pink-200 hover:bg-pink-100"}`}
                      >
                        {channelHandoff.icon === "whatsapp" ? <Phone className="w-4 h-4" /> : <Instagram className="w-4 h-4" />}
                        {channelHandoff.label}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8 flex flex-wrap items-center justify-between gap-3"><h2 className="text-3xl font-bold font-serif">Menu</h2><Link href="/cart" className="rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-bold text-primary hover:bg-primary hover:text-primary-foreground">View my order</Link></div>
            
            {loadingProducts ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                <div className="h-40 bg-muted rounded-xl"></div>
                <div className="h-40 bg-muted rounded-xl"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                {products?.map(product => {
                  const currentSizeLabel = selectedSizes[product.id] || (product.sizes?.[0]?.label || "Standard");
                  const currentSizeOpt = product.sizes?.find(s => s.label === currentSizeLabel);
                  const displayPrice = currentSizeOpt ? currentSizeOpt.pricePkr : product.basePricePkr;

                  return (
                    <div key={product.id} className="flex gap-4 p-4 border border-border bg-card rounded-xl shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-32 h-32 bg-muted rounded-md shrink-0 overflow-hidden">
                        {product.photoUrl ? (
                          <img src={product.photoUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex justify-center items-center bg-primary/5 text-primary text-2xl font-serif">
                            {product.name[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-lg font-serif leading-tight">{product.name}</h3>
                            {product.isEgglessAvailable && <span className="text-[10px] uppercase font-bold tracking-wider bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200 ml-2 shrink-0">Eggless</span>}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                          {(product.dietaryTags ?? []).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1" aria-label={`Dietary and allergen labels for ${product.name}`}>
                              {(product.dietaryTags ?? []).map((label) => (
                                <span key={label} className="rounded-full border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary">{label}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-4 flex flex-col gap-2">
                          {product.sizes && product.sizes.length > 0 && (
                            <select 
                              className="text-sm border border-border rounded-md px-2 py-1 bg-background"
                              value={currentSizeLabel}
                              onChange={(e) => setSelectedSizes({...selectedSizes, [product.id]: e.target.value})}
                            >
                              {product.sizes.map((s, i) => (
                                <option key={i} value={s.label}>{s.label}</option>
                              ))}
                            </select>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="font-mono font-bold text-primary">PKR {displayPrice.toLocaleString()}</span>
                            <div className="flex gap-2">
                              {baker.agentActive && useWebAssistant && product.isAvailable && (
                                <button
                                  onClick={() => askAboutProduct(product.name)}
                                  className="p-1.5 rounded-md text-primary border border-primary/20 hover:bg-primary/10"
                                  aria-label={`Ask the assistant about ${product.name}`}
                                  title="Ask the assistant"
                                >
                                  <Sparkles className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleAddToCart(product)}
                                disabled={addToCart.isPending || !product.isAvailable}
                                className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-4 py-1.5 rounded-md text-sm font-bold transition-colors disabled:opacity-50"
                              >
                                {product.isAvailable ? 'Add +' : 'Out'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Reviews Section */}
            {reviews && reviews.length > 0 && (
              <div className="mb-16">
                <h2 className="text-3xl font-bold font-serif mb-8">Customer Reviews</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reviews.map(review => (
                    <div key={review.id} className="p-6 border border-border bg-card rounded-xl shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {review.buyerName[0]}
                          </div>
                          <span className="font-bold">{review.buyerName}</span>
                        </div>
                        <div className="flex text-secondary text-sm">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-secondary' : 'text-muted-foreground fill-none'}`} />
                          ))}
                        </div>
                      </div>
                      {review.productName && <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{review.productName}</p>}
                      <p className="text-foreground">{review.reviewText}</p>
                      <p className="text-xs text-muted-foreground mt-4">{format(new Date(review.createdAt), "MMM d, yyyy")}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-muted-foreground font-serif text-xl">Baker not found.</div>
        )}
      </div>
      
      {/* The baker chooses whether the web assistant or a social channel handles conversations. */}
      {baker?.agentActive && useWebAssistant && <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all z-50"
      >
        {isChatOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>}

      {/* Chat Widget Panel */}
      {baker?.agentActive && useWebAssistant && isChatOpen && (
        <div className="fixed bottom-28 right-8 w-80 md:w-96 h-[500px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
          <div className="bg-primary p-4 text-primary-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold font-serif leading-tight">{baker?.businessName ?? "Baker"}'s Assistant</h3>
              <p className="text-xs text-primary-foreground/80">Typically replies instantly</p>
            </div>
          </div>
          
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
            <div className="text-center text-xs text-muted-foreground my-4">Today</div>
            
            {/* Initial Welcome */}
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 shrink-0 flex items-center justify-center text-primary">
                <User className="w-4 h-4" />
              </div>
              <div className="bg-card border border-border p-3 rounded-2xl rounded-tl-sm shadow-sm text-sm">
                Hi! Welcome to {baker?.businessName}. I'm their assistant. How can I help you today?
              </div>
            </div>

            {publicMessages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role !== 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 shrink-0 flex items-center justify-center text-primary">
                    <User className="w-4 h-4" />
                  </div>
                )}
                <div className={`p-3 rounded-2xl shadow-sm text-sm max-w-[80%] ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                    : 'bg-card border border-border rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {sendMessage.isPending && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 shrink-0 flex items-center justify-center text-primary">
                  <User className="w-4 h-4" />
                </div>
                <div className="bg-card border border-border p-3 rounded-2xl rounded-tl-sm shadow-sm text-sm flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce delay-75"></div>
                  <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            )}
          </div>
          
          <div className="px-3 pt-2 bg-card border-t border-border flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none py-1">
            <button
              onClick={() => handleQuickMessage("Show Menu")}
              disabled={sendMessage.isPending}
              className="text-[11px] px-2.5 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary font-medium hover:bg-primary/10 transition-all cursor-pointer disabled:opacity-50"
            >
              ❓ Show Menu
            </button>
            <button
              onClick={() => handleQuickMessage("Where do you deliver?")}
              disabled={sendMessage.isPending}
              className="text-[11px] px-2.5 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary font-medium hover:bg-primary/10 transition-all cursor-pointer disabled:opacity-50"
            >
              🚚 Delivery Info
            </button>
            <button
              onClick={() => handleQuickMessage("What is your payment policy?")}
              disabled={sendMessage.isPending}
              className="text-[11px] px-2.5 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary font-medium hover:bg-primary/10 transition-all cursor-pointer disabled:opacity-50"
            >
              💳 Payment Policy
            </button>
            <button
              onClick={() => handleQuickMessage("What is my order status?")}
              disabled={sendMessage.isPending}
              className="text-[11px] px-2.5 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary font-medium hover:bg-primary/10 transition-all cursor-pointer disabled:opacity-50"
            >
              📦 Order Status
            </button>
          </div>

          <div className="p-3 border-t border-border bg-card">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input 
                type="text" 
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Ask about ingredients or delivery..." 
                className="flex-1 px-3 py-2 rounded-full border border-border bg-muted/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={sendMessage.isPending}
              />
              <button 
                type="submit"
                disabled={!message.trim() || sendMessage.isPending}
                className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 transition-colors hover:bg-primary/90"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </BuyerLayout>
  );
}
