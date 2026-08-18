import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  customFetch,
  getListOrdersQueryKey,
  useListOrders,
  useMarkOrderPaid,
} from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  useMemo,
  useState,
  type ComponentType,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  DollarSign,
  FileCheck2,
  ReceiptText,
  ScanLine,
  Search,
  ShieldCheck,
  UploadCloud,
  WalletCards,
} from "lucide-react";

type OcrResult = {
  verified: boolean;
  message: string;
  decision?: string;
  confidence?: number;
};

type PaymentView = "outstanding" | "collected";

const inputClass =
  "min-h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10";

function orderStatusLabel(status: string): string {
  return status
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function formatOrderDate(
  value?: string | null,
  pattern = "dd MMM yyyy",
): string {
  if (!value) {
    return "Date not set";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Date not set";
  }

  return format(parsed, pattern);
}

export default function DashboardPayments() {
  const { bakerId } = useBuyerSession();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useListOrders(
    { bakerId },
    {
      query: {
        enabled: Boolean(bakerId),
        queryKey: getListOrdersQueryKey({ bakerId }),
      },
    },
  );

  const markPaid = useMarkOrderPaid();
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [unmarkingId, setUnmarkingId] = useState<number | null>(null);

  const [activeView, setActiveView] =
    useState<PaymentView>("outstanding");

  const [searchQuery, setSearchQuery] = useState("");

  const [screenshotUrls, setScreenshotUrls] =
    useState<Record<number, string>>({});

  const [receiptFiles, setReceiptFiles] = useState<
    Record<
      number,
      {
        base64: string;
        contentType:
          | "image/jpeg"
          | "image/png"
          | "image/webp";
      }
    >
  >({});

  const [ocrResults, setOcrResults] = useState<
    Record<number, OcrResult | null>
  >({});

  const [ocrErrors, setOcrErrors] = useState<
    Record<number, string | null>
  >({});

  const [verifyingId, setVerifyingId] = useState<
    number | null
  >(null);

  const allOrders = orders ?? [];

  const pendingOrders = useMemo(
    () =>
      allOrders.filter(
        (order) =>
          order.paymentStatus === "pending" &&
          order.status !== "cancelled",
      ),
    [allOrders],
  );

  const paidOrders = useMemo(
    () =>
      allOrders.filter(
        (order) => order.paymentStatus === "paid",
      ),
    [allOrders],
  );

  const filteredPendingOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return pendingOrders;
    }

    return pendingOrders.filter((order) =>
      [
        order.id,
        order.buyerName,
        order.buyerWhatsapp,
        order.buyerArea,
        order.buyerAddress,
        order.status,
        order.totalPkr,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [pendingOrders, searchQuery]);

  const filteredPaidOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return paidOrders;
    }

    return paidOrders.filter((order) =>
      [
        order.id,
        order.buyerName,
        order.buyerWhatsapp,
        order.buyerArea,
        order.buyerAddress,
        order.totalPkr,
        order.paymentAmountReceived,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [paidOrders, searchQuery]);

  const totalOutstanding = pendingOrders.reduce(
    (total, order) => total + order.totalPkr,
    0,
  );

  const totalCollected = paidOrders.reduce(
    (total, order) =>
      total +
      (order.paymentAmountReceived ?? order.totalPkr),
    0,
  );

  const receiptsOnFile = allOrders.filter(
    (order) => Boolean(order.paymentScreenshotUrl),
  ).length;

  const handleMarkPaid = (
    orderId: number,
    totalPkr: number,
  ) => {
    setMarkingId(orderId);
    markPaid.mutate(
      {
        orderId,
        data: {
          amountReceived: totalPkr,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListOrdersQueryKey({
              bakerId,
            }),
          });
        },
        onError: (cause) => {
          window.alert(
            (cause instanceof Error ? cause.message : "Could not confirm this payment.").replace(
              /^HTTP \d+\s*[^:]*:\s*/,
              "",
            ),
          );
        },
        onSettled: () => setMarkingId(null),
      },
    );
  };

  const handleUnmarkPaid = async (orderId: number) => {
    if (!window.confirm("Move this payment back to outstanding? Use this if you confirmed by mistake.")) {
      return;
    }
    setUnmarkingId(orderId);
    try {
      await customFetch(`/api/orders/${orderId}/unmark-paid`, {
        method: "PATCH",
        responseType: "json",
      });
      await queryClient.invalidateQueries({
        queryKey: getListOrdersQueryKey({ bakerId }),
      });
    } catch (cause) {
      window.alert(
        (cause instanceof Error ? cause.message : "Could not undo this payment.").replace(
          /^HTTP \d+\s*[^:]*:\s*/,
          "",
        ),
      );
    } finally {
      setUnmarkingId(null);
    }
  };

  const handleCheckReceipt = async (
    orderId: number,
    existingUrl?: string | null,
  ) => {
    const url = (
      screenshotUrls[orderId] ??
      existingUrl ??
      ""
    ).trim();

    const fileData = receiptFiles[orderId];

    if (!url && !fileData) {
      setOcrErrors((current) => ({
        ...current,
        [orderId]:
          "Upload a receipt photo or paste an HTTPS image URL first.",
      }));

      return;
    }

    setVerifyingId(orderId);

    setOcrErrors((current) => ({
      ...current,
      [orderId]: null,
    }));

    setOcrResults((current) => ({
      ...current,
      [orderId]: null,
    }));

    try {
      if (fileData) {
        const result = await customFetch<OcrResult>(
          `/api/orders/${orderId}/verify-payment`,
          {
            method: "POST",
            responseType: "json",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              imageBase64: fileData.base64,
              contentType: fileData.contentType,
            }),
          },
        );

        setOcrResults((current) => ({
          ...current,
          [orderId]: result,
        }));
      } else {
        if (url !== existingUrl) {
          await customFetch(
            `/api/orders/${orderId}/payment-screenshot`,
            {
              method: "PATCH",
              responseType: "json",
              body: JSON.stringify({
                paymentScreenshotUrl: url,
              }),
            },
          );
        }

        const result = await customFetch<OcrResult>(
          `/api/orders/${orderId}/verify-payment`,
          {
            method: "POST",
            responseType: "json",
          },
        );

        setOcrResults((current) => ({
          ...current,
          [orderId]: result,
        }));
      }

      queryClient.invalidateQueries({
        queryKey: getListOrdersQueryKey({
          bakerId,
        }),
      });
    } catch (cause) {
      setOcrErrors((current) => ({
        ...current,
        [orderId]:
          cause instanceof Error
            ? cause.message
            : "Receipt check failed.",
      }));
    } finally {
      setVerifyingId(null);
    }
  };

  const onReceiptFile = (
    orderId: number,
    file: File | null,
  ) => {
    if (!file) {
      setReceiptFiles((current) => {
        const next = { ...current };
        delete next[orderId];
        return next;
      });

      return;
    }

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      setOcrErrors((current) => ({
        ...current,
        [orderId]:
          "Use a JPEG, PNG or WebP receipt photo.",
      }));

      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setOcrErrors((current) => ({
        ...current,
        [orderId]:
          "The receipt photo must be under 4 MB.",
      }));

      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");

      const base64 = dataUrl.replace(
        /^data:image\/\w+;base64,/,
        "",
      );

      setReceiptFiles((current) => ({
        ...current,
        [orderId]: {
          base64,
          contentType: file.type as
            | "image/jpeg"
            | "image/png"
            | "image/webp",
        },
      }));

      setOcrErrors((current) => ({
        ...current,
        [orderId]: null,
      }));
    };

    reader.readAsDataURL(file);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-7">
        <div className="mx-auto max-w-[1480px]">
          <header className="flex flex-col gap-5 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                Financial operations
              </p>

              <h1 className="mt-2 font-serif text-[2.8rem] font-semibold leading-none tracking-[-0.045em] sm:text-[3.35rem]">
                Payments
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Review outstanding balances, inspect
                customer receipts and confirm collected
                payments without giving automation control
                over your financial records.
              </p>
            </div>

            <div className="flex rounded-xl border border-border bg-[#f4eae1] p-1">
              <button
                type="button"
                onClick={() =>
                  setActiveView("outstanding")
                }
                className={`min-h-10 rounded-lg px-4 text-xs font-semibold transition ${
                  activeView === "outstanding"
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                Outstanding
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveView("collected")
                }
                className={`min-h-10 rounded-lg px-4 text-xs font-semibold transition ${
                  activeView === "collected"
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                Collected
              </button>
            </div>
          </header>

          <section className="grid border-b border-border sm:grid-cols-2 xl:grid-cols-4">
            <PaymentMetric
              icon={AlertCircle}
              label="Outstanding"
              value={`PKR ${totalOutstanding.toLocaleString()}`}
              valueClass="text-[#b86a24]"
            />

            <PaymentMetric
              icon={Clock3}
              label="Awaiting payment"
              value={pendingOrders.length
                .toString()
                .padStart(2, "0")}
            />

            <PaymentMetric
              icon={CheckCircle2}
              label="Collected"
              value={`PKR ${totalCollected.toLocaleString()}`}
              valueClass="text-[#168a55]"
            />

            <PaymentMetric
              icon={ReceiptText}
              label="Receipts on file"
              value={receiptsOnFile
                .toString()
                .padStart(2, "0")}
            />
          </section>

          <div
            role="note"
            className="mt-5 flex gap-3 rounded-2xl border border-[#e7c98e] bg-[#fff8e9] px-4 py-4"
          >
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#b86a24]" />

            <div>
              <p className="text-sm font-semibold text-[#754813]">
                Receipt scanning is advisory only
              </p>

              <p className="mt-1 text-xs leading-5 text-[#8f672f]">
                Always verify the amount and transaction
                reference inside Easypaisa, JazzCash or
                your bank account before confirming that a
                payment was received.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
            <main className="min-w-0">
              <section className="overflow-hidden rounded-2xl border border-border bg-white/45">
                <div className="border-b border-border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative min-w-0 flex-1 lg:max-w-md">
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b8d9c]" />

                      <input
                        value={searchQuery}
                        onChange={(event) =>
                          setSearchQuery(
                            event.target.value,
                          )
                        }
                        placeholder="Search orders or customers"
                        className={`${inputClass} pl-10`}
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {activeView === "outstanding"
                        ? `${filteredPendingOrders.length} payments awaiting review`
                        : `${filteredPaidOrders.length} collected payments`}
                    </p>
                  </div>
                </div>

                {isLoading && !orders ? (
                  <div className="space-y-3 p-4">
                    {[1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="h-40 animate-pulse rounded-2xl bg-muted"
                      />
                    ))}
                  </div>
                ) : activeView === "outstanding" ? (
                  filteredPendingOrders.length > 0 ? (
                    <div className="divide-y divide-[#eadfd5]">
                      {filteredPendingOrders.map(
                        (order) => {
                          const existingUrl =
                            order.paymentScreenshotUrl ??
                            null;

                          const inputValue =
                            screenshotUrls[order.id] ??
                            existingUrl ??
                            "";

                          const receiptReady = Boolean(
                            receiptFiles[order.id],
                          );

                          const ocr =
                            ocrResults[order.id];

                          const ocrError =
                            ocrErrors[order.id];

                          return (
                            <article
                              key={order.id}
                              data-testid={`row-payment-${order.id}`}
                              className="p-4 transition hover:bg-[#fff8f3] sm:p-5"
                            >
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-xs font-semibold text-secondary">
                                      #{order.id}
                                    </span>

                                    <span className="rounded-lg bg-accent px-2 py-1 text-[9px] font-semibold text-[#8e345c]">
                                      {orderStatusLabel(
                                        order.status,
                                      )}
                                    </span>
                                  </div>

                                  <h2 className="mt-2 font-serif text-2xl font-semibold">
                                    {order.buyerName}
                                  </h2>

                                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                    {order.buyerArea ??
                                      order.buyerAddress ??
                                      "Location not recorded"}

                                    {" · "}

                                    {formatOrderDate(
                                      order.deliveryDate,
                                      "dd MMM",
                                    )}
                                  </p>
                                </div>

                                <div className="shrink-0 lg:text-right">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    Amount due
                                  </p>

                                  <p className="mt-1 font-mono text-2xl font-semibold">
                                    PKR{" "}
                                    {order.totalPkr.toLocaleString()}
                                  </p>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleMarkPaid(
                                        order.id,
                                        order.totalPkr,
                                      )
                                    }
                                    disabled={
                                      markingId === order.id
                                    }
                                    data-testid={`button-mark-paid-${order.id}`}
                                    className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#168a55] px-4 text-xs font-semibold text-white transition hover:bg-[#117347] disabled:opacity-50"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />

                                    {markingId === order.id
                                      ? "Confirming…"
                                      : "Confirm received"}
                                  </button>
                                </div>
                              </div>

                              <div className="mt-5 rounded-2xl border border-border bg-card p-4">
                                <div className="flex items-start gap-3">
                                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-secondary">
                                    <UploadCloud className="h-5 w-5" />
                                  </span>

                                  <div>
                                    <p className="text-sm font-semibold">
                                      Customer receipt
                                    </p>

                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                      Upload a JPEG, PNG or
                                      WebP screenshot under
                                      4 MB.
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-accent bg-white/65 px-3 text-xs font-semibold text-primary transition hover:bg-white">
                                    <UploadCloud className="h-4 w-4 shrink-0" />

                                    <span className="min-w-0 truncate">
                                      {receiptReady
                                        ? "Receipt ready for review"
                                        : "Choose receipt photo"}
                                    </span>

                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp"
                                      onChange={(event) =>
                                        onReceiptFile(
                                          order.id,
                                          event.target
                                            .files?.[0] ??
                                            null,
                                        )
                                      }
                                      className="sr-only"
                                    />
                                  </label>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCheckReceipt(
                                        order.id,
                                        existingUrl,
                                      )
                                    }
                                    disabled={
                                      verifyingId ===
                                      order.id
                                    }
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-xs font-semibold text-primary transition hover:bg-muted disabled:opacity-50"
                                  >
                                    <ScanLine className="h-4 w-4" />

                                    {verifyingId === order.id
                                      ? "Checking receipt…"
                                      : "Check receipt"}
                                  </button>
                                </div>

                                <details className="mt-3">
                                  <summary className="cursor-pointer text-xs font-semibold text-secondary">
                                    Use an HTTPS image URL instead
                                  </summary>

                                  <input
                                    type="url"
                                    value={inputValue}
                                    onChange={(event) =>
                                      setScreenshotUrls(
                                        (current) => ({
                                          ...current,
                                          [order.id]:
                                            event.target
                                              .value,
                                        }),
                                      )
                                    }
                                    placeholder="https://example.com/receipt.png"
                                    className={`${inputClass} mt-3`}
                                  />
                                </details>

                                {existingUrl &&
                                !screenshotUrls[order.id] &&
                                !receiptReady ? (
                                  <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                                    <FileCheck2 className="h-4 w-4 text-[#168a55]" />
                                    A saved receipt is already
                                    attached to this order.
                                  </p>
                                ) : null}

                                {ocrError ? (
                                  <p
                                    role="alert"
                                    className="mt-3 rounded-xl bg-[#f8dddd] px-4 py-3 text-sm font-semibold text-[#a7313b]"
                                  >
                                    {ocrError}
                                  </p>
                                ) : null}

                                {ocr ? (
                                  <div
                                    className={`mt-3 rounded-xl border px-4 py-3 ${
                                      ocr.verified
                                        ? "border-[#e7c98e] bg-[#fff8e9]"
                                        : "border-border bg-muted"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <ScanLine
                                        className={`h-4 w-4 ${
                                          ocr.verified
                                            ? "text-[#b86a24]"
                                            : "text-muted-foreground"
                                        }`}
                                      />

                                      <p className="text-xs font-semibold">
                                        OCR review
                                      </p>
                                    </div>

                                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                      {ocr.message}
                                    </p>

                                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#b86a24]">
                                      Advisory only — payment
                                      remains unconfirmed
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                            </article>
                          );
                        },
                      )}
                    </div>
                  ) : (
                    <PaymentEmptyState
                      icon={WalletCards}
                      title={
                        pendingOrders.length === 0
                          ? "No outstanding payments"
                          : "No matching payments"
                      }
                      description={
                        pendingOrders.length === 0
                          ? "Orders waiting for payment confirmation will appear here."
                          : "Try a different customer name, order number or search term."
                      }
                    />
                  )
                ) : filteredPaidOrders.length > 0 ? (
                  <>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full min-w-[720px] text-left text-xs">
                        <thead className="border-b border-border text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3">
                              Order
                            </th>

                            <th className="px-4 py-3">
                              Customer
                            </th>

                            <th className="px-4 py-3">
                              Delivery date
                            </th>

                            <th className="px-4 py-3">
                              Status
                            </th>

                            <th className="px-4 py-3 text-right">
                              Amount received
                            </th>
                            <th className="px-4 py-3 text-right">
                              Undo
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-[#eadfd5]">
                          {filteredPaidOrders.map(
                            (order) => (
                              <tr
                                key={order.id}
                                className="transition hover:bg-[#fff8f3]"
                              >
                                <td className="px-4 py-4 font-mono font-semibold text-secondary">
                                  #{order.id}
                                </td>

                                <td className="px-4 py-4">
                                  <p className="text-sm font-semibold">
                                    {order.buyerName}
                                  </p>

                                  <p className="mt-1 text-[10px] text-muted-foreground">
                                    {order.buyerWhatsapp}
                                  </p>
                                </td>

                                <td className="px-4 py-4 text-muted-foreground">
                                  {formatOrderDate(
                                    order.deliveryDate,
                                  )}
                                </td>

                                <td className="px-4 py-4">
                                  <span className="rounded-lg bg-[#e4f3e8] px-2.5 py-1 text-[10px] font-semibold text-[#168a55]">
                                    Paid
                                  </span>
                                </td>

                                <td className="px-4 py-4 text-right font-mono text-sm font-semibold text-[#168a55]">
                                  PKR{" "}
                                  {(
                                    order.paymentAmountReceived ??
                                    order.totalPkr
                                  ).toLocaleString()}
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => void handleUnmarkPaid(order.id)}
                                    disabled={unmarkingId === order.id}
                                    className="min-h-9 rounded-lg border border-border bg-white px-3 text-[10px] font-semibold text-primary disabled:opacity-50"
                                  >
                                    {unmarkingId === order.id ? "Undoing…" : "Undo"}
                                  </button>
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="divide-y divide-[#eadfd5] md:hidden">
                      {filteredPaidOrders.map(
                        (order) => (
                          <article
                            key={order.id}
                            className="p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-mono text-xs font-semibold text-secondary">
                                  #{order.id}
                                </p>

                                <h2 className="mt-1 text-base font-semibold">
                                  {order.buyerName}
                                </h2>

                                <p className="mt-1 text-xs text-muted-foreground">
                                  {formatOrderDate(
                                    order.deliveryDate,
                                  )}
                                </p>
                              </div>

                              <span className="rounded-lg bg-[#e4f3e8] px-2.5 py-1 text-[10px] font-semibold text-[#168a55]">
                                Paid
                              </span>
                            </div>

                            <div className="mt-4 rounded-xl bg-card p-3">
                              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9b8d9c]">
                                Amount received
                              </p>

                              <p className="mt-1 font-mono text-lg font-semibold text-[#168a55]">
                                PKR{" "}
                                {(
                                  order.paymentAmountReceived ??
                                  order.totalPkr
                                ).toLocaleString()}
                              </p>
                              <button
                                type="button"
                                onClick={() => void handleUnmarkPaid(order.id)}
                                disabled={unmarkingId === order.id}
                                className="mt-3 min-h-9 w-full rounded-lg border border-border bg-white text-xs font-semibold text-primary disabled:opacity-50"
                              >
                                {unmarkingId === order.id ? "Undoing…" : "Undo confirmation"}
                              </button>
                            </div>
                          </article>
                        ),
                      )}
                    </div>
                  </>
                ) : (
                  <PaymentEmptyState
                    icon={CheckCircle2}
                    title={
                      paidOrders.length === 0
                        ? "No collected payments yet"
                        : "No matching collected payments"
                    }
                    description={
                      paidOrders.length === 0
                        ? "Confirmed payments will appear here as a permanent financial record."
                        : "Try a different customer name or order number."
                    }
                  />
                )}
              </section>
            </main>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-border bg-white/45 p-4">
                <ShieldCheck className="h-5 w-5 text-secondary" />

                <h2 className="mt-3 font-serif text-xl font-semibold">
                  Confirmation checklist
                </h2>

                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Check these details before confirming
                  any payment as received.
                </p>

                <div className="mt-5 space-y-4">
                  <SafetyItem
                    number="01"
                    title="Open your payment account"
                    description="Check Easypaisa, JazzCash or your bank directly."
                  />

                  <SafetyItem
                    number="02"
                    title="Match the amount"
                    description="Confirm that the received amount matches the order."
                  />

                  <SafetyItem
                    number="03"
                    title="Match the reference"
                    description="Compare the transaction reference and customer details."
                  />

                  <SafetyItem
                    number="04"
                    title="Confirm received"
                    description="Only then mark the order payment as collected."
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-[#e5cfd9] bg-accent p-4">
                <ScanLine className="h-5 w-5 text-secondary" />

                <h2 className="mt-3 font-serif text-xl font-semibold">
                  About receipt OCR
                </h2>

                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  OCR can help identify visible text, but
                  screenshots can be edited or reused. It
                  will never confirm payment automatically.
                </p>
              </section>

              <section className="rounded-2xl border border-border bg-white/45 p-4">
                <h2 className="font-serif text-xl font-semibold">
                  Payment activity
                </h2>

                <div className="mt-4 space-y-4">
                  <ActivityRow
                    label="Orders awaiting payment"
                    value={pendingOrders.length}
                  />

                  <ActivityRow
                    label="Orders paid"
                    value={paidOrders.length}
                  />

                  <ActivityRow
                    label="Receipts stored"
                    value={receiptsOnFile}
                  />
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function PaymentMetric({
  icon: Icon,
  label,
  value,
  valueClass = "",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="border-border px-4 py-5 sm:border-r sm:last:border-r-0 lg:px-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-5 w-5 text-secondary" />

        <span className="text-[11px] font-medium">
          {label}
        </span>
      </div>

      <p
        className={`mt-2 whitespace-nowrap font-mono text-2xl font-semibold tracking-[-0.03em] ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function PaymentEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-[390px] place-items-center p-6 text-center">
      <div>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-secondary">
          <Icon className="h-6 w-6" />
        </span>

        <h2 className="mt-4 font-serif text-2xl font-semibold">
          {title}
        </h2>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

function SafetyItem({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 border-b border-border pb-4 last:border-0 last:pb-0">
      <span className="font-mono text-[10px] font-semibold text-secondary">
        {number}
      </span>

      <div>
        <p className="text-xs font-semibold">{title}</p>

        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

function ActivityRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">
        {label}
      </span>

      <span className="rounded-lg bg-muted px-2.5 py-1 font-mono text-[10px] font-semibold text-primary">
        {value.toString().padStart(2, "0")}
      </span>
    </div>
  );
}