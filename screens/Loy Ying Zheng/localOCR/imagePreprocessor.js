// imagePreprocessor.js
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export class ReceiptImagePreprocessor {
  /**
   * 針對收據掃描優化的圖片預處理
   */
  static async preprocessForReceipt(imageUri) {
    console.log("🖼️ Preprocessing receipt image...");
    
    try {
      const processed = await manipulateAsync(
        imageUri,
        [
          // 1. 尺寸優化
          { resize: { width: RECEIPT_CONFIG.IMAGE.MAX_WIDTH } },
          
          // 2. 增強可讀性
          { contrast: RECEIPT_CONFIG.IMAGE.CONTRAST },
          { brightness: RECEIPT_CONFIG.IMAGE.BRIGHTNESS },
          
          // 3. 輕微銳利化
          { resize: { width: 1000 } },
        ],
        {
          compress: RECEIPT_CONFIG.IMAGE.QUALITY,
          format: SaveFormat.JPEG,
          base64: false
        }
      );

      console.log("✅ Image preprocessing completed");
      return processed;
      
    } catch (error) {
      console.error("❌ Image preprocessing failed:", error);
      throw new Error(`Image processing error: ${error.message}`);
    }
  }

  /**
   * 驗證圖片是否適合 OCR
   */
  static validateImageForOCR(imageInfo) {
    const { width, height } = imageInfo;
    
    if (width < 200 || height < 200) {
      throw new Error('Image too small for OCR processing');
    }
    
    if (width > 4000 || height > 4000) {
      console.warn('⚠️ Image very large, may impact OCR performance');
    }
    
    return true;
  }
}