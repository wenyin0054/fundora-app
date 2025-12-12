// runMLKitOCR.js — Final Stable Version
import TextRecognition from "@react-native-ml-kit/text-recognition";

export async function runMLKitOCR(imageUri) {
  try {
    console.log("📄 [MLKit] OCR start");
    console.log("📄 [MLKit] input:", imageUri);

    if (!imageUri) {
      return { success: false, text: "", reason: "Empty imageUri" };
    }

    // DO NOT REMOVE file://
    const filePath = imageUri;
    console.log("📄 [MLKit] using file path:", filePath);

    const result = await TextRecognition.recognize(filePath);

    const text = result?.text ?? "";
    const blocks = result?.blocks ?? [];

    const wordCount = text.trim().split(/\s+/).length;
    const blockCount = blocks.length;

    return {
      success: true,
      text,
      blocks,
      blockCount,
      wordCount,
      confidence: Math.min(1, (blockCount + wordCount / 20) / 10),
    };
  } catch (e) {
    console.error("❌ [MLKit] OCR Error:", e);
    return { success: false, text: "", reason: e.message };
  }
}
