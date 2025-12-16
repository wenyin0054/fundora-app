// imagePreprocessor.js —— Final Stable Version (Android + iOS Safe)
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";

export class ReceiptImagePreprocessor {

  // =====================================================================
  // MAIN FUNCTION — preprocessForReceipt
  // =====================================================================
  static async preprocessForReceipt(imageUri, options = { returnBase64: false }) {
    console.log("🖼️ [Preprocessor] START preprocessForReceipt", {
      imageUri,
      returnBase64: !!options.returnBase64,
    });

    try {
      // ---------------------------------------------------------------
      // 1) Get original size
      // ---------------------------------------------------------------
      const original = await this._getImageSize(imageUri);
      console.log("📏 [Preprocessor] originalSize", original);

      if (!original.width || !original.height) {
        console.warn("⚠️ invalid original image → fallback");
        return this._createFallback(imageUri, options.returnBase64);
      }

      // ---------------------------------------------------------------
      // 2) Normalize EXIF rotation
      // ---------------------------------------------------------------
      const normalized = await manipulateAsync(
        imageUri,
        [{ rotate: 0 }],
        { compress: 1, format: SaveFormat.JPEG, base64: false }
      );

      const workingUri = normalized.uri;
      const normW = normalized.width;
      const normH = normalized.height;

      console.log("🔄 [Preprocessor] normalized:", { workingUri, normW, normH });

      if (!normW || !normH) {
        return this._createFallback(imageUri, options.returnBase64);
      }

      // ---------------------------------------------------------------
      // 3) Resize ONLY by width (Android-safe)
      // ---------------------------------------------------------------
      const TARGET_WIDTH = 600;
      console.log("🔧 [Preprocessor] resizing…");

      const resized = await manipulateAsync(
        workingUri,
        [{ resize: { width: TARGET_WIDTH } }],  // ← ✔ Android-safe
        { compress: 1, format: SaveFormat.JPEG, base64: true }
      );

      const smallW = resized.width;
      const smallH = resized.height;

      console.log("📐 [Preprocessor] resized small image:", {
        smallW,
        smallH,
        hasBase64: !!resized.base64,
      });

      if (!smallW || !smallH || smallW < 50 || smallH < 50) {
        console.warn("⚠️ small resize invalid → fallback");
        return this._createFallback(workingUri, options.returnBase64);
      }

      // ---------------------------------------------------------------
      // 4) Simple "80% center area" edge detection
      // ---------------------------------------------------------------
      const edges = this._detectEdgesSimple(smallW, smallH);
      console.log("🔍 [Preprocessor] detected edges:", edges);

      const detectedWidth = edges.right - edges.left;
      const detectedHeight = edges.bottom - edges.top;

      if (detectedWidth < 50 || detectedHeight < 50) {
        console.warn("⚠️ detected too small → fallback");
        return this._createFallback(workingUri, options.returnBase64);
      }

      // ---------------------------------------------------------------
      // 5) Map edges back to normalized original image
      // ---------------------------------------------------------------
      const scaleX = normW / smallW;
      const scaleY = normH / smallH;

      const margin = 10;

      let cropX = Math.max(0, Math.floor(edges.left * scaleX) - margin);
      let cropY = Math.max(0, Math.floor(edges.top * scaleY) - margin);
      let cropW = Math.min(normW - cropX, Math.floor(detectedWidth * scaleX) + margin * 2);
      let cropH = Math.min(normH - cropY, Math.floor(detectedHeight * scaleY) + margin * 2);

      console.log("✂️ [Preprocessor] mapped crop:", {
        cropX,
        cropY,
        cropW,
        cropH,
      });

      if (cropW <= 0 || cropH <= 0) {
        return this._createFallback(workingUri, options.returnBase64);
      }

      // ---------------------------------------------------------------
      // 6) CROP THE IMAGE
      // ---------------------------------------------------------------
      let cropped;
      try {
        cropped = await manipulateAsync(
          workingUri,
          [{
            crop: {
              originX: cropX,
              originY: cropY,
              width: cropW,
              height: cropH,
            }
          }],
          { compress: 0.95, format: SaveFormat.JPEG, base64: options.returnBase64 }
        );
      } catch (e) {
        console.error("❌ [Preprocessor] Native crop error:", e);
        return this._createFallback(workingUri, options.returnBase64);
      }

      console.log("📸 [Preprocessor] cropped:", {
        width: cropped.width,
        height: cropped.height,
        uri: cropped.uri,
      });

      // ---------------------------------------------------------------
      // 7) Save cropped image for MLKit
      // ---------------------------------------------------------------
      const dir = FileSystem.cacheDirectory + "mlkit/";
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

      const finalUri = `${dir}processed_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: cropped.uri, to: finalUri });

      console.log("✅ [Preprocessor] DONE:", finalUri);

      return {
        uri: finalUri,
        base64: cropped.base64 ?? null,
        width: cropped.width,
        height: cropped.height,
      };

    } catch (e) {
      console.error("❌ [Preprocessor] Error:", e);
      return this._createFallback(imageUri, options.returnBase64);
    }
  }

  // =====================================================================
  // SIMPLE EDGE DETECTION
  // =====================================================================
  static _detectEdgesSimple(w, h) {
    const marginW = Math.floor(w * 0.1);
    const marginH = Math.floor(h * 0.1);

    return {
      left: marginW,
      right: w - marginW,
      top: marginH,
      bottom: h - marginH,
    };
  }

  // =====================================================================
  // GET IMAGE SIZE
  // =====================================================================
  static async _getImageSize(uri) {
    try {
      const result = await manipulateAsync(uri, [], { base64: false });
      return { width: result.width, height: result.height };
    } catch (e) {
      return { width: 0, height: 0 };
    }
  }

  // =====================================================================
  // FALLBACK IMAGE GENERATION
  // =====================================================================
  static async _createFallback(uri, returnBase64) {
    console.log("🔄 [Preprocessor] fallback for:", uri);

    try {
      const result = await manipulateAsync(
        uri,
        [{ rotate: 0 }],
        { compress: 0.9, format: SaveFormat.JPEG, base64: returnBase64 }
      );

      const dir = FileSystem.cacheDirectory + "mlkit/";
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

      const safeUri = `${dir}fallback_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: result.uri, to: safeUri });

      return {
        uri: safeUri,
        base64: result.base64 ?? null,
        width: result.width,
        height: result.height,
      };

    } catch (e) {
      console.error("❌ [Preprocessor] fallback failed:", e);
      return { uri, base64: null, width: 0, height: 0 };
    }
  }
}
