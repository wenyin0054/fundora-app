// receiptConfig.js 
export const RECEIPT_CONFIG = {
  // OCR confidence threshold 
  CONFIDENCE: { HIGH: 0.55, MEDIUM: 0.35, LOW: 0.2 },
  // Image processing settings 
  IMAGE: { MAX_WIDTH: 1200, QUALITY: 0.8, CONTRAST: 1.4, BRIGHTNESS: 1.1 },
  // Receipt feature detection 
  FEATURES: { MIN_CURRENCY_COUNT: 1, MIN_BLOCK_COUNT: 2, REQUIRED_FIELDS: ['total_amount', 'merchant_name'] }
};
export const RECEIPT_ERRORS = {
  LOW_CONFIDENCE: 'OCR confidence too low for reliable scanning',
  NO_CURRENCY: 'No currency symbols detected in receipt',
  INSUFFICIENT_TEXT: 'Insufficient text found for parsing',
  INVALID_RECEIPT: 'Text does not appear to be a valid receipt'
};