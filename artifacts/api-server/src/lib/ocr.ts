import { db, ordersTable, bakersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createWorker } from "tesseract.js";
import {
  verifyReceiptText,
  type OCRVerificationResult,
} from "./receipt-analyzer.js";
import { downloadReceiptImage } from "./receipt-image.js";

export { verifyReceiptText } from "./receipt-analyzer.js";

/**
 * Extract text with the free, local Tesseract engine. The URL is downloaded
 * only from explicitly approved receipt-storage hosts and validated by bytes.
 *
 * This function intentionally has no mock receipt fallback. Payment evidence must
 * never be fabricated or treated as proof that a transfer happened.
 */
async function recognizeReceiptBytes(image: Buffer): Promise<string> {
  const langPath = process.env.TESSERACT_LANG_PATH?.trim();
  const worker = await createWorker(
    "eng",
    undefined,
    langPath ? { langPath, cacheMethod: "readOnly" } : undefined,
  );
  try {
    const result = await worker.recognize(image, { rotateAuto: true });
    const text = result.data.text?.trim() ?? "";
    if (text.length < 20 || result.data.confidence < 35) {
      throw new Error("No sufficiently readable receipt text was found.");
    }
    return text.slice(0, 12_000);
  } finally {
    await worker.terminate();
  }
}

export async function performReceiptOCR(imageUrl: string): Promise<string> {
  return recognizeReceiptBytes(await downloadReceiptImage(imageUrl));
}

export async function performReceiptOCRFromBytes(image: Buffer): Promise<string> {
  return recognizeReceiptBytes(image);
}

/**
 * Triggers OCR receipt processing for a baker's review. OCR is advisory only:
 * it must never update an order to paid or set an advance as paid.
 */
export async function triggerPaymentOCRVerification(orderId: number): Promise<OCRVerificationResult | null> {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order || !order.paymentScreenshotUrl) {
    return null;
  }

  const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, order.bakerId));
  if (!baker) {
    return null;
  }

  // Perform OCR extraction
  const rawText = await performReceiptOCR(order.paymentScreenshotUrl);

  // Run verification heuristics
  const result = verifyReceiptText(
    rawText,
    order.totalPkr,
    baker.advancePercentage ?? 50,
    baker.whatsappNumber,
    baker.businessName
  );

  console.log(`[Receipt review] Order #${orderId}: ${result.message}`);

  return result;
}
