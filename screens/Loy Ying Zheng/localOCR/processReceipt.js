// processReceipt.js
import { ReceiptImagePreprocessor } from "./imagePreprocessor";
import { runMLKitOCR } from "./runMLKitOCR";
import { runMindeeOCR } from "./runMindeeOCR";
import { EnhancedReceiptParser } from "./enhancedReceiptParser";

export async function processReceipt(originalImageUri) {
  try {
    console.log("📸 Starting receipt processing.");

    const preprocessed = await ReceiptImagePreprocessor.preprocessForReceipt(
      originalImageUri,
      { returnBase64: true }
    );

    console.log("✅ Preprocess OK:", preprocessed.uri);

    // ------------------------------
    //  MLKIT OCR
    // ------------------------------
    const mlkitResult = await runMLKitOCR(preprocessed.uri);

    if (mlkitResult.success && mlkitResult.text?.trim()?.length > 5) {
      console.log("🟢 MLKit result OK");

      const parsed = EnhancedReceiptParser.parseReceiptText(mlkitResult.text);


      return {
        success: true,
        provider: "mlkit",

        // unify field names for ScanReceipt + AddExpensesOrIncome
        text: parsed.raw_text,
        merchant_name: parsed.merchant || null,
        total_amount: parsed.total || null,
        transaction_date: parsed.date || null,

        // parser metadata
        quality_score: parsed.quality_score || null,
        confidence_level: parsed.confidence_level || null,
        is_receipt_like: parsed.is_receipt_like,
        validation_message: parsed.validation_message,
      };
    }

    // ------------------------------
    // MINDEE FALLBACK
    // ------------------------------
    console.warn("⚠️ MLKit failed, switching to Mindee...");
    const mindeeResult = await runMindeeOCR(preprocessed);

    if (!mindeeResult.success || !mindeeResult.text) {
      return {
        success: false,
        provider: "none",
        text: "",
        merchant_name: null,
        total_amount: null,
        transaction_date: null,
        error: "All OCR failed",
      };
    }

    const parsed = enhancedReceiptParser(mindeeResult.text);

    return {
      success: true,
      provider: "mindee",

      text: parsed.raw_text,
      merchant_name: parsed.merchant || null,
      total_amount: parsed.total || null,
      transaction_date: parsed.date || null,

      quality_score: parsed.quality_score || null,
      confidence_level: parsed.confidence_level || null,
      is_receipt_like: parsed.is_receipt_like,
      validation_message: parsed.validation_message,
    };

  } catch (err) {
    console.error("❌ processReceipt Error:", err);
    return {
      success: false,
      provider: "error",
      text: "",
      merchant_name: null,
      total_amount: null,
      transaction_date: null,
      error: err.message,
    };
  }
}
