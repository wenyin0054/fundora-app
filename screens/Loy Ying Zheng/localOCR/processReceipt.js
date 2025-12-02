import { runMLKitOCR } from "./runMLKitOCR";
import { EnhancedReceiptParser } from "./enhancedReceiptParser";
import { RECEIPT_CONFIG } from "./receiptConfig";
import { runMindeeOCR } from "./runMindeeOCR";
import { ReceiptImagePreprocessor } from "./imagePreprocessor";

export async function processReceipt(imageUri) {
  console.log("🔍 Starting hybrid receipt processing...");

  // 1️⃣ 预处理（增强亮度、对比、锐化等）
  let imageForOCR = imageUri;
  try {
    const processedImg = await ReceiptImagePreprocessor.preprocessForReceipt(imageUri);
    if (processedImg?.uri) imageForOCR = processedImg.uri;
  } catch (err) {
    console.warn("⚠️ Image preprocessing failed, using original image");
  }

  // 2️⃣ 本地 ML KIT OCR
  const local = await runMLKitOCR(imageForOCR);
  let finalText = local.text || "";
  let source = "mlkit_local";

  // 3️⃣ 第一次解析（用本地 OCR 结果）
  let parsed = EnhancedReceiptParser.parseReceiptText(finalText);

  // 4️⃣ Fallback 条件：
  const requireFallback =
    !local.success ||
    local.confidence < RECEIPT_CONFIG.CONFIDENCE.MEDIUM ||
    parsed.total_amount === "" ||
    parsed.merchant_name === "";

  if (requireFallback) {
    console.log("⚠️ Triggering fallback → Mindee Cloud OCR");

    const cloud = await runMindeeOCR(imageUri); // 原图用于 Mindee

    if (cloud?.text) {
      finalText = cloud.text;
      source = "mindee_cloud";

      // 使用云端结果重新解析
      parsed = EnhancedReceiptParser.parseReceiptText(finalText);
    }
  }

  // 5️⃣ 输出统一结构
  return {
    ...parsed,
    raw_text: finalText,
    source,
    local_confidence: local.confidence,
    success: true,
  };
}
