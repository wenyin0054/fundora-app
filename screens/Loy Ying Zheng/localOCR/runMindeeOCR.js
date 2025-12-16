// runMindeeOCR.js
import { MINDDEE_API_KEY } from "@env";
import * as FileSystem from "expo-file-system";

export async function runMindeeOCR(imageInput) {
  console.log("☁️ Running Mindee Cloud OCR...");

  try {
    if (!MINDDEE_API_KEY) {
      console.warn("⚠️ MINDDEE_API_KEY is missing.");
    }

    let base64img = "";

    // 1) If manipulateAsync product is passed (containing base64)
    if (typeof imageInput === "object" && imageInput?.base64) {
      base64img = imageInput.base64;
    } 
    // 2) If it's data URI
    else if (typeof imageInput === "string" && imageInput.startsWith("data:")) {
      base64img = imageInput.split("base64,")[1];
    } 
    // 3) If it's file://
    else if (typeof imageInput === "string" && imageInput.startsWith("file://")) {
      base64img = await FileSystem.readAsStringAsync(imageInput, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }

    if (!base64img) {
      console.error("❌ Mindee OCR: base64 missing.");
      return { success: false, text: "", error: "base64_missing" };
    }

    // 4) Assemble multipart/form-data
    const formData = new FormData();
    formData.append("document", {
      uri: "data:image/jpeg;base64," + base64img,
      name: "receipt.jpg",
      type: "image/jpeg",
    });

    // 5) Correct Mindee API call (do not set Content-Type, let fetch generate automatically)
    const response = await fetch(
      "https://api.mindee.net/v1/products/mindee/receipt/v1/predict",
      {
        method: "POST",
        headers: {
          "Authorization": `Token ${MINDDEE_API_KEY}`,
        },
        body: formData,
      }
    );

    const json = await response.json();

    if (!json?.document) {
      console.error("❌ Mindee response invalid:", json);
      return { success: false, text: "", raw: json };
    }

    const prediction = json.document.inference?.pages?.[0]?.prediction;
    let finalText = "";

    if (prediction?.ocr_text) {
      finalText = prediction.ocr_text;
    } else if (json.document.inference.pages?.[0]?.extras?.raw_text) {
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
      error: error.message || String(error),
      source: "mindee_cloud",
    };
  }
}
