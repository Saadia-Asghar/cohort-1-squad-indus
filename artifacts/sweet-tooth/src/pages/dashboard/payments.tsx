import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  useListOrders,
  useMarkOrderPaid,
  getListOrdersQueryKey,
  customFetch,
} from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { CheckCircle, Clock, DollarSign, AlertCircle, ScanLine } from "lucide-react";

type OcrResult = {
  verified: boolean;
  message: string;
  decision?: string;
  confidence?: number;
};

export default function DashboardPayments() {
  const { bakerId } = useBuyerSession();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useListOrders(
    { bakerId },
    { query: { enabled: !!bakerId, queryKey: getListOrdersQueryKey({ bakerId }) } }
  );

  const markPaid = useMarkOrderPaid();
  const [screenshotUrls, setScreenshotUrls] = useState<Record<number, string>>({});
  const [receiptFiles, setReceiptFiles] = useState<
    Record<number, { base64: string; contentType: "image/jpeg" | "image/png" | "image/webp" }>
  >({});
  const [ocrResults, setOcrResults] = useState<Record<number, OcrResult | null>>({});
  const [ocrErrors, setOcrErrors] = useState<Record<number, string | null>>({});
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  const handleMarkPaid = (orderId: number, totalPkr: number) => {
    markPaid.mutate(
      { orderId, data: { amountReceived: totalPkr } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ bakerId }) });
        },
      }
    );
  };

  const handleCheckReceipt = async (orderId: number, existingUrl?: string | null) => {
    const url = (screenshotUrls[orderId] ?? existingUrl ?? "").trim();
    const fileData = receiptFiles[orderId];
    if (!url && !fileData) {
      setOcrErrors((prev) => ({
        ...prev,
        [orderId]: "Upload a receipt photo or paste an HTTPS image URL first.",
      }));
      return;
    }
    setVerifyingId(orderId);
    setOcrErrors((prev) => ({ ...prev, [orderId]: null }));
    setOcrResults((prev) => ({ ...prev, [orderId]: null }));
    try {
      if (fileData) {
        const result = await customFetch<OcrResult>(`/api/orders/${orderId}/verify-payment`, {
          method: "POST",
          responseType: "json",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: fileData.base64,
            contentType: fileData.contentType,
          }),
        });
        setOcrResults((prev) => ({ ...prev, [orderId]: result }));
      } else {
        if (url !== existingUrl) {
          await customFetch(`/api/orders/${orderId}/payment-screenshot`, {
            method: "PATCH",
            responseType: "json",
            body: JSON.stringify({ paymentScreenshotUrl: url }),
          });
        }
        const result = await customFetch<OcrResult>(`/api/orders/${orderId}/verify-payment`, {
          method: "POST",
          responseType: "json",
        });
        setOcrResults((prev) => ({ ...prev, [orderId]: result }));
      }
      queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ bakerId }) });
    } catch (cause) {
      setOcrErrors((prev) => ({
        ...prev,
        [orderId]: cause instanceof Error ? cause.message : "Receipt check failed.",
      }));
    } finally {
      setVerifyingId(null);
    }
  };

  const onReceiptFile = (orderId: number, file: File | null) => {
    if (!file) {
      setReceiptFiles((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setOcrErrors((prev) => ({ ...prev, [orderId]: "Use a JPEG, PNG, or WebP receipt photo." }));
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setOcrErrors((prev) => ({ ...prev, [orderId]: "Receipt must be under 4 MB." }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
      setReceiptFiles((prev) => ({
        ...prev,
        [orderId]: { base64, contentType: file.type as "image/jpeg" | "image/png" | "image/webp" },
      }));
      setOcrErrors((prev) => ({ ...prev, [orderId]: null }));
    };
    reader.readAsDataURL(file);
  };

  // Pending payments: delivered COD plus any other pending order that can attach a screenshot
  const pendingOrders = orders?.filter((o) => o.paymentStatus === "pending") ?? [];

  const paidOrders = orders?.filter((o) => o.paymentStatus === "paid") ?? [];

  const totalOutstanding = pendingOrders.reduce((s, o) => s + o.totalPkr, 0);
  const totalCollected = paidOrders.reduce((s, o) => s + (o.paymentAmountReceived ?? o.totalPkr), 0);

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-2 font-serif text-primary">Payments & receipts</h1>
        <p className="text-muted-foreground mb-8">
          Track outstanding and paid orders. Upload a JazzCash / Easypaisa screenshot for advisory OCR — it never marks
          paid automatically.
        </p>
        <div className="mb-6 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Prefer <strong className="text-foreground">Upload receipt</strong> — no Cloudinary or image host setup needed.
          HTTPS URL paste still works if you already host the image.
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <div className="p-6 rounded-xl border border-orange-200 bg-orange-50">
            <div className="flex items-center gap-2 text-orange-700 mb-2">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium uppercase tracking-wider">Outstanding</span>
            </div>
            <p className="text-3xl font-bold tabular-nums text-orange-800">
              PKR {totalOutstanding.toLocaleString()}
            </p>
            <p className="text-sm text-orange-600 mt-1">{pendingOrders.length} orders awaiting payment</p>
          </div>
          <div className="p-6 rounded-xl border border-green-200 bg-green-50">
            <div className="flex items-center gap-2 text-green-700 mb-2">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium uppercase tracking-wider">Collected</span>
            </div>
            <p className="text-3xl font-bold tabular-nums text-green-800">
              PKR {totalCollected.toLocaleString()}
            </p>
            <p className="text-sm text-green-600 mt-1">{paidOrders.length} orders paid</p>
          </div>
        </div>

        {/* Outstanding payments */}
        {isLoading && !orders ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {pendingOrders.length > 0 && (
              <div className="mb-10">
                <h2 className="text-lg font-bold font-serif mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  Awaiting Collection
                </h2>
                <div className="space-y-3">
                  {pendingOrders.map((order) => {
                    const existingUrl = order.paymentScreenshotUrl ?? null;
                    const inputValue = screenshotUrls[order.id] ?? existingUrl ?? "";
                    const ocr = ocrResults[order.id];
                    const ocrError = ocrErrors[order.id];

                    return (
                      <div
                        key={order.id}
                        data-testid={`row-payment-${order.id}`}
                        className="flex flex-col gap-3 p-4 rounded-xl border border-orange-200 bg-card shadow-sm"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm text-muted-foreground">#{order.id}</span>
                              <span className="font-bold text-foreground">{order.buyerName}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                                {order.status.replace(/_/g, " ")}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {order.buyerArea ?? order.buyerAddress}
                              {order.deliveryDate
                                ? ` · ${format(new Date(order.deliveryDate), "MMM d")}`
                                : ""}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-mono font-bold text-lg tabular-nums text-foreground">
                              PKR {order.totalPkr.toLocaleString()}
                            </span>
                            <button
                              onClick={() => handleMarkPaid(order.id, order.totalPkr)}
                              disabled={markPaid.isPending}
                              data-testid={`button-mark-paid-${order.id}`}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Handled
                            </button>
                          </div>
                        </div>

                        <div className="border-t border-orange-100 pt-3 space-y-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Receipt photo
                          </label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) => onReceiptFile(order.id, e.target.files?.[0] ?? null)}
                              className="flex-1 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground"
                            />
                            <button
                              type="button"
                              onClick={() => handleCheckReceipt(order.id, existingUrl)}
                              disabled={verifyingId === order.id}
                              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50"
                            >
                              <ScanLine className="w-4 h-4" />
                              {verifyingId === order.id ? "Checking…" : "Check receipt"}
                            </button>
                          </div>
                          {receiptFiles[order.id] && (
                            <p className="text-xs text-muted-foreground">Photo ready — tap Check receipt.</p>
                          )}
                          <details className="text-xs text-muted-foreground">
                            <summary className="cursor-pointer font-medium">Or paste HTTPS image URL</summary>
                            <input
                              type="url"
                              value={inputValue}
                              onChange={(e) =>
                                setScreenshotUrls((prev) => ({ ...prev, [order.id]: e.target.value }))
                              }
                              placeholder="https://…"
                              className="mt-2 w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          </details>
                          {existingUrl && !screenshotUrls[order.id] && !receiptFiles[order.id] && (
                            <p className="text-xs text-muted-foreground truncate">
                              Saved screenshot on file — you can re-check without uploading again.
                            </p>
                          )}
                          {ocrError && (
                            <p role="alert" className="text-sm text-destructive">{ocrError}</p>
                          )}
                          {ocr && (
                            <div
                              className={`rounded-lg border px-3 py-2 text-sm ${
                                ocr.verified
                                  ? "border-amber-200 bg-amber-50 text-amber-900"
                                  : "border-border bg-muted/40 text-muted-foreground"
                              }`}
                            >
                              <p className="font-medium">OCR review (advisory — does not mark paid)</p>
                              <p className="mt-0.5">{ocr.message}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Paid orders log */}
            {paidOrders.length > 0 && (
              <div>
                <h2 className="text-lg font-bold font-serif mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Collected
                </h2>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left">Order</th>
                        <th className="px-4 py-3 text-left">Customer</th>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paidOrders.map((order) => (
                        <tr key={order.id} className="border-t border-border hover:bg-muted/20">
                          <td className="px-4 py-3 font-mono text-muted-foreground">#{order.id}</td>
                          <td className="px-4 py-3 font-medium">{order.buyerName}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {order.deliveryDate ? format(new Date(order.deliveryDate), "MMM d, yyyy") : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-green-700">
                            PKR {(order.paymentAmountReceived ?? order.totalPkr).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {orders?.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-serif text-lg">No orders yet</p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
