import { MINDDEE_API_KEY } from "@env"; // 如果你使用 dotenv
// 如果没有 dotenv，你可以手动写 const MINDDEE_API_KEY = "你的 API Key";

export async function runMindeeOCR(imageUri) {
    console.log("Mindee Key:", MINDDEE_API_KEY);

  console.log("☁️ Running Mindee Cloud OCR...");

  try {
    // 1️⃣ 读取图片为 base64（Mindee 接受 base64）
    let base64img = "";

    if (imageUri.startsWith("file://")) {
      const fs = require("expo-file-system");
      base64img = await fs.readAsStringAsync(imageUri, {
        encoding: fs.EncodingType.Base64,
      });
    } else if (!imageUri.includes("base64")) {
      throw new Error("Invalid image URI for Mindee.");
    }

    // 2️⃣ 发送到 Mindee Receipt OCR API
    const response = await fetch("https://api.mindee.net/v1/products/mindee/receipt/v1/predict", {
      method: "POST",
      headers: {
        "Authorization": `Token ${MINDDEE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        document: base64img,
        format: "native",
        cropper: true,
      }),
    });

    const json = await response.json();

    if (!json?.document) {
      console.error("❌ Mindee response:", json);
      return { success: false, text: "" };
    }

    // 3️⃣ Mindee 的文本在 json.document.inference.pages[0].prediction
    const prediction = json.document.inference.pages[0].prediction;

    let finalText = "";

    if (prediction?.ocr_text) {
      finalText = prediction.ocr_text;
    } else if (json?.document?.inference?.pages?.[0]?.extras?.raw_text) {
      finalText = json.document.inference.pages[0].extras.raw_text;
    }

    console.log("☁️ Mindee text length:", finalText.length);

    return {
      success: true,
      text: finalText,
      raw: prediction,
      source: "mindee_cloud",
    };

  } catch (error) {
    console.error("❌ Mindee OCR Error:", error);
    return {
      success: false,
      text: "",
      error: error.message,
      source: "mindee_cloud",
    };
  }
}
