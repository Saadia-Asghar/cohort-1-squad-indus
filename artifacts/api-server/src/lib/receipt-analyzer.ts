export type ReceiptDecision = "rejected" | "manual_review";

export interface OCRVerificationResult {
  /**
   * This means the evidence is eligible for a baker's manual review. It never
   * means that the bank transfer itself has been confirmed.
   */
  verified: boolean;
  receiptLike: boolean;
  recipientMatches: boolean;
  amountMatches: boolean;
  extractedAmount: number;
  extractedTrxId: string | null;
  rawText: string;
  confidence: number;
  decision: ReceiptDecision;
  message: string;
}

function normalizeComparable(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseAmount(value: string): number | null {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function extractAmounts(text: string): number[] {
  const values: number[] = [];
  const patterns = [
    /(?:amount|total|paid|sent|transferred)\s*:?\s*(?:pkr|rs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/gi,
    /(?:pkr|rs\.?)\s*:?\s*([\d,]+(?:\.\d{1,2})?)/gi,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:pkr|rs\.?)/gi,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const amount = parseAmount(match[1]);
      if (amount !== null) values.push(amount);
    }
  }

  return [...new Set(values)];
}

function selectLikelyAmount(amounts: number[], expectedDeposit: number, expectedTotal: number): number {
  if (amounts.length === 0) return 0;
  return amounts.sort((a, b) => {
    const aDistance = Math.min(Math.abs(a - expectedDeposit), Math.abs(a - expectedTotal));
    const bDistance = Math.min(Math.abs(b - expectedDeposit), Math.abs(b - expectedTotal));
    return aDistance - bDistance;
  })[0];
}

function extractTransactionId(text: string): string | null {
  const patterns = [
    /(?:transaction|trx|reference|ref|tx)\s*(?:id|no|number|#)?\s*:?\s*([a-z0-9][a-z0-9-]{5,39})/i,
    /(?:receipt|payment)\s*(?:id|no|number|#)\s*:?\s*([a-z0-9][a-z0-9-]{5,39})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].toUpperCase();
  }
  return null;
}

export function verifyReceiptText(
  rawText: string,
  expectedTotal: number,
  advancePercentage: number,
  bakerWhatsapp: string,
  bakerBusinessName: string,
): OCRVerificationResult {
  const text = rawText.toLowerCase().replace(/\s+/g, " ").trim();
  const expectedDeposit = Math.round((expectedTotal * advancePercentage) / 100);
  const amounts = extractAmounts(text);
  const extractedAmount = selectLikelyAmount(amounts, expectedDeposit, expectedTotal);
  const extractedTrxId = extractTransactionId(text);

  const phoneDigits = bakerWhatsapp.replace(/\D/g, "");
  const localPhone = phoneDigits.slice(-10);
  const normalizedText = normalizeComparable(text);
  const normalizedBusinessName = normalizeComparable(bakerBusinessName);
  const recipientMatches =
    (localPhone.length === 10 && normalizedText.includes(localPhone)) ||
    (normalizedBusinessName.length >= 5 && normalizedText.includes(normalizedBusinessName));

  // Do not allow a tolerance below the requested deposit. Transfer fees are
  // paid separately and are not evidence that the bakery received enough.
  const amountMatches =
    extractedAmount >= expectedDeposit &&
    extractedAmount <= Math.max(expectedTotal, expectedDeposit) * 1.02;

  const signals = [
    /\b(easypaisa|jazzcash|bank|wallet|iban|raast)\b/i.test(text),
    /\b(success(?:ful|fully)?|completed|paid|transferred|payment received)\b/i.test(text),
    /\b(transaction|trx|reference|ref|tx)\s*(?:id|no|number|#)?\b/i.test(text),
    extractedTrxId !== null,
    amounts.length > 0,
    /\b(date|time)\b/i.test(text),
    /\b(sent to|receiver|recipient|beneficiary|account)\b/i.test(text),
  ];
  const signalCount = signals.filter(Boolean).length;
  const hasPaymentLanguage = /\b(payment|paid|transfer(?:red)?|transaction|receipt)\b/i.test(text);
  const receiptLike =
    text.length >= 30 &&
    signalCount >= 4 &&
    hasPaymentLanguage &&
    extractedTrxId !== null &&
    amounts.length > 0;

  const verified = receiptLike && recipientMatches && amountMatches;
  const decision: ReceiptDecision = verified ? "manual_review" : "rejected";
  const confidence = Math.min(
    99,
    signalCount * 10 + (recipientMatches ? 15 : 0) + (amountMatches ? 15 : 0),
  );

  return {
    verified,
    receiptLike,
    recipientMatches,
    amountMatches,
    extractedAmount,
    extractedTrxId,
    rawText,
    confidence,
    decision,
    message: verified
      ? "This looks like a payment receipt and is ready for manual baker review. Payment is still pending until the baker confirms the transaction in their account."
      : "This upload could not be accepted as matching payment evidence. Please upload a clear, complete transfer receipt showing the amount, recipient, status, date, and transaction reference.",
  };
}
