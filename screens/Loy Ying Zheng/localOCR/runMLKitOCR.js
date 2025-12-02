import { TextRecognition } from '@react-native-ml-kit/text-recognition';
import { Platform } from "react-native";

export async function runMLKitOCR(imageUri) {
  try {
    console.log("📄 Running ML Kit OCR...");

    // Android sometimes includes file:// prefix — ML Kit 不接受 file://
    const filePath =
      Platform.OS === "android"
        ? imageUri.replace("file://", "")
        : imageUri;

    const result = await TextRecognition.recognize(filePath);

    const text = result?.text || "";
    const blocks = result?.blocks || [];

    const blockCount = blocks.length;
    const wordCount = text.trim().split(/\s+/).length;

    // 简单信心评分（你之后可以增强）
    const confidence = Math.min(1, (blockCount + wordCount / 20) / 10);

    return {
      success: true,
      text,
      blocks,
      blockCount,
      wordCount,
      confidence // 0–1
    };

  } catch (err) {
    console.error("❌ ML Kit OCR Error:", err);
    return {
      success: false,
      text: "",
      blocks: [],
      confidence: 0,
      reason: err.message
    };
  }
}
