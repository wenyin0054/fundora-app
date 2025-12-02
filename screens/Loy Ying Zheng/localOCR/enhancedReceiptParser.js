export class EnhancedReceiptParser {

  // Text normalization function
  static normalizeText(text) {
    return text
      .replace(/(RM|rm)(\d)/g, "RM $2")   // RM12.50 → RM 12.50
      .replace(/(\d+\.\d{2})([A-Za-z])/g, "$1\n$2")  // Add newline if letters follow an amount
      .replace(/([A-Za-z])(\d+\.\d{2})/g, "$1\n$2") // Add newline if text is immediately before an amount
      .replace(/(\d+\.\d{2})(Total|TOTAL|total)/g, "$1\n$2") // Add newline if amount is before "Total"
      .replace(/(Total|TOTAL|total):?\s*RM?\s?(\d)/gi, "Total: RM $2"); // Normalize Total format
  }

  // Extract merchant name from receipt text
  static extractMerchant(text) {
    const lines = text.split("\n").map(line => line.trim()).filter(line => line);
    if (!lines.length) return "";

    const blacklist = ["receipt", "invoice", "summary", "tax", "subtotal", "total", "balance", "change"];

    for (let i = 0; i < Math.min(6, lines.length); i++) {
      const line = lines[i].toLowerCase();

      // Exclude lines containing numbers or currency symbols
      const hasNumbers = /\d/.test(lines[i]);
      const hasCurrency = /[$£€¥RM]/.test(lines[i]);

      // Check if line is all uppercase (common for merchant names in Malaysia)
      const isAllCaps = /^[A-Z\s]{4,}$/.test(lines[i]);

      // Exclude obvious address lines
      const isAddressLine = /(jalan|taman|persiaran|lot|no\.|ssm|gst)/i.test(line);

      if (!blacklist.some(b => line.includes(b)) &&
          !hasNumbers &&
          !hasCurrency &&
          !isAddressLine) {

        // Prefer returning all-uppercase merchant names
        if (isAllCaps) {
          return lines[i];
        }

        // Otherwise return one of the first few lines if valid
        if (i < 3) {
          return lines[i];
        }
      }
    }

    // Fallback: return first non-empty line
    return lines[0] || "";
  }

  // Extract address from receipt text
  static extractAddress(text) {
    const patterns = [
      /\d{3,5}\s+[A-Za-z0-9\s,.-]+?(?=\n|$)/,  // House number + street
      /(\d{1,5}\s+)?[A-Za-z\s]+\s+(Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Lane|Ln|Jalan|Jl|Taman|Persiaran)\b/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[0].trim();
    }
    return "";
  }

  // Extract phone number from receipt
  static extractPhone(text) {
    const patterns = [
      /(\+?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/,
      /(\d{3}[\s.-]\d{3}[\s.-]\d{4})/,
      /(\(\d{3}\)\s?\d{3}[\s.-]\d{4})/,
      /(\+?6?0?\d{1,2}[\s.-]?\d{3,4}[\s.-]?\d{4})/ // Malaysia format
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    return "";
  }

  // Extract date from receipt
  static extractDate(text) {
    const patterns = [
      /\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/,
      /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/,
      /\b(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/i,
      /\b((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          return this._normalizeDate(match[1]);
        } catch (e) {
          continue;
        }
      }
    }
    return "";
  }

  // Normalize date into YYYY-MM-DD
  static _normalizeDate(dateStr) {
    const monthNames = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };

    const monthMatch = dateStr.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
    if (monthMatch) {
      const parts = dateStr.split(/[\s,]+/);
      let month, day, year;

      if (parts[0].length <= 2) { // numeric day first
        month = monthNames[parts[1].toLowerCase().substring(0, 3)];
        day = parts[0].padStart(2, '0');
        year = parts[2];
      } else { // month name first
        month = monthNames[parts[0].toLowerCase().substring(0, 3)];
        day = parts[1].replace(',', '').padStart(2, '0');
        year = parts[2];
      }

      if (year.length === 2) year = '20' + year;
      return `${year}-${month}-${day}`;
    }

    // Numeric dates
    dateStr = dateStr.replace(/\//g, '-');
    const parts = dateStr.split('-');

    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else {
      let year = parts[2];
      if (year.length === 2) year = '20' + year;
      if (parseInt(parts[0]) > 12) {
        return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else {
        return `${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
    }
  }

  // Extract time from receipt
  static extractTime(text) {
    const patterns = [
      /\b(\d{1,2}:\d{2}\s?[APMapm]{2})\b/,
      /\b(\d{1,2}:\d{2}:\d{2}\s?[APMapm]{2})\b/,
      /\b(\d{1,2}:\d{2})\b/,
      /\b(\d{1,2}\s?[APMapm]{2})\b/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return "";
  }

  // Extract total amount from receipt
  static extractTotal(text) {
    const explicitPatterns = [
      /(?:total|grand total|amount due|balance due)[\s:]*RM?\s?(\d{1,6}[.,]\d{2})/i,
      /(?:total|grand total|amount due)[^\d]*?RM?\s?(\d{1,6}[.,]\d{2})/i,
      /RM\s?(\d{1,6}[.,]\d{2})/i,
      /(?:total|grand total)\s*:\s*RM?\s?(\d{1,6}[.,]\d{2})/i
    ];

    for (const pattern of explicitPatterns) {
      const match = text.match(pattern);
      if (match) {
        const amount = match[1] || match[2];
        if (amount) return amount.replace(',', '.');
      }
    }

    // fallback: take largest RM amount
    const rmAmounts = text.match(/RM\s?(\d{1,6}[.,]\d{2})/gi) || [];
    if (rmAmounts.length > 0) {
      const amounts = rmAmounts.map(amt => {
        const numMatch = amt.match(/(\d{1,6}[.,]\d{2})/);
        return numMatch ? parseFloat(numMatch[1].replace(',', '.')) : 0;
      });
      return Math.max(...amounts).toFixed(2);
    }

    // fallback: take largest numeric amount
    const allAmounts = text.match(/\d{1,6}[.,]\d{2}/g) || [];
    if (allAmounts.length > 0) {
      const amounts = allAmounts.map(amt => parseFloat(amt.replace(',', '.')));
      return Math.max(...amounts).toFixed(2);
    }

    return "";
  }

  // Extract line items
  static extractLineItems(text) {
    const items = [];
    const lines = text.split("\n");

    const linePatterns = [
      /^(.+?)\s+RM?\s?(\d{1,6}[.,]\d{2})$/,
      /^(.+?)\s+x\s*(\d+)\s+[@]?\s*RM?\s*(\d{1,6}[.,]\d{2})/i,
      /^(.+?)\s+RM?\s?(\d{1,6}[.,]\d{2})/,
      /^(\d+)\s+x\s*(.+?)\s+RM?\s?(\d{1,6}[.,]\d{2})/i,
      /^(.+?)\s+(\d{1,6}[.,]\d{2})$/
    ];

    for (const line of lines) {
      const trimmedLine = line.trim();

      for (const pattern of linePatterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          let description, price;

          if (pattern.source.includes('x')) {
            description = match[2] ? match[2].trim() : match[1].trim();
            price = match[3] || match[2];
          } else {
            description = match[1].trim();
            price = match[2];
          }

          if (price && !this._isNonItemLine(description)) {
            items.push({
              item: description,
              price: price.replace(',', '.')
            });
          }
          break;
        }
      }
    }

    return items;
  }

  // Filter out lines that are not actual items
  static _isNonItemLine(description) {
    const nonItemKeywords = [
      'subtotal', 'total', 'tax', 'vat', 'discount', 'tip', 'balance',
      'change', 'amount', 'cash', 'credit', 'debit', 'card', 'thank',
      'gst', 'service', 'charge'
    ];

    const descLower = description.toLowerCase();
    return nonItemKeywords.some(keyword => descLower.includes(keyword));
  }

  // Main parser function
  static parseReceiptText(text) {
    const normalizedText = this.normalizeText(text);

    return {
      merchant_name: this.extractMerchant(normalizedText),
      merchant_address: this.extractAddress(normalizedText),
      phone: this.extractPhone(normalizedText),
      transaction_date: this.extractDate(normalizedText),
      transaction_time: this.extractTime(normalizedText),
      total_amount: this.extractTotal(normalizedText),
      line_items: this.extractLineItems(normalizedText),
      // Optional: normalized text for debugging
      _normalized_text: normalizedText
    };
  }
}
