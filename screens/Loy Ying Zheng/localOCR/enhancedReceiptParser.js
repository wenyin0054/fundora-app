// ===============================================================
// Enhanced Receipt Parser V7 - Semantic Zones + Confidence
// Header → Merchant (with invalid detection), Footer → Total
// OCR normalization + Month-name support
// ===============================================================

export class EnhancedReceiptParser {

  // =====================================================================
  // MAIN ENTRY - Refactored into Semantic Zones
  // =====================================================================
  static parseReceiptText(rawText) {
    console.log("🔍 [Parser V7] START");

    if (!rawText) return this._emptyResult();

    const lines = rawText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    console.log("📝 lines:", lines.length);

    // =================================================================
    // SEMANTIC ZONES: Header (Merchant) and Footer (Total)
    // =================================================================
    const zones = this._identifySemanticZones(lines);
    console.log("🏗️ [Zones] Identified:", zones);

    // ---- HEADER ZONE: Merchant Detection ---------------------------
    const merchantResult = this._extractMerchantFromHeader(lines, zones.header);
    const merchant = merchantResult ? merchantResult.name : null;
    const merchantConfidence = merchantResult ? merchantResult.confidence : 0;

    // ---- DATE: Search across all zones -----------------------------
    const date = this._extractDate(lines);

    // ---- FOOTER ZONE: Total Detection ------------------------------
    const total = this._extractTotalFromFooter(lines, zones.footer);

    // ---- TABLE REGION: Item amounts ---------------------------------
    const { tableStart, tableEnd } = this._findTable(lines);

    // ---- ITEM AMOUNTS ----------------------------------------------
    const itemAmounts = this._extractItemAmounts(lines, tableStart, tableEnd);
    const itemsSum = itemAmounts.length > 0
      ? itemAmounts.reduce((a, b) => a + b, 0)
      : null;

    // ---- VALIDATION & QUALITY --------------------------------------
    const hasMerchant = !!merchant && merchantConfidence >= 0.6; // Only count high-confidence merchants
    const hasTotal = !!total;
    const hasDate = !!date;
    const quality_score = (hasMerchant ? 0.4 : 0) + (hasTotal ? 0.4 : 0) + (hasDate ? 0.2 : 0);

    const is_receipt_like = hasMerchant && hasTotal;
    const validation_message = !hasMerchant ? "Merchant name not detected" :
      !hasTotal ? "Total amount not found" :
        !hasDate ? "Date not detected" : "Receipt parsed successfully";

    console.log("📊 Quality:", { hasMerchant, hasTotal, hasDate, quality_score, merchantConfidence });

    return {
      success: true,
      merchant,
      merchant_confidence: merchantConfidence,
      date,
      total: total ? total.value : null,
      confidence_score: total ? total.score : 0,
      confidence_level: total ? (total.score >= 0.75 ? "high" : total.score >= 0.45 ? "medium" : "low") : "low",
      items: itemAmounts,
      itemsSum,
      raw_text: rawText,
      tableStart,
      tableEnd,
      quality_score,
      is_receipt_like,
      validation_message
    };
  }

  // =====================================================================
  // SEMANTIC ZONES IDENTIFICATION
  // =====================================================================
  static _identifySemanticZones(lines) {
    const zones = {
      header: { start: 0, end: 15 }, // Default header zone
      footer: { start: Math.floor(lines.length * 0.7), end: lines.length - 1 } // Default footer zone
    };

    // Find "RECEIPT" marker to define header boundary
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      if (/receipt/i.test(lines[i])) {
        zones.header.end = Math.max(5, i - 1); // Header ends before RECEIPT
        break;
      }
    }

    // Find footer markers (total, payment, etc.)
    const footerMarkers = /(total|payment|cash|change|thank you|terima kasih)/i;
    for (let i = Math.floor(lines.length * 0.5); i < lines.length; i++) {
      if (footerMarkers.test(lines[i])) {
        zones.footer.start = Math.max(Math.floor(lines.length * 0.5), i - 3);
        break;
      }
    }

    return zones;
  }
  // =====================================================================
  // MERCHANT DETECTION FROM HEADER ZONE
  // =====================================================================
  static _extractMerchantFromHeader(lines, headerZone) {
    if (!lines || lines.length === 0) return null;

    const headerLines = lines.slice(headerZone.start, headerZone.end + 1);

    // Invalid merchant patterns to reject
    const invalidPatterns = [
      /^tel\s*:/i,           // TEL: 0123456789
      /^phone\s*:/i,         // PHONE: 0123456789
      /^fax\s*:/i,           // FAX: 0123456789
      /^invoice/i,           // Invoice, Invoice No, etc.
      /^bill/i,              // Bill, Billing, etc.
      /^receipt/i,           // Receipt, Receipt No, etc.
      /^no\s*:/i,            // NO: 12345
      /^trans\s*:/i,         // TRANS: 12345
      /^terminal/i,          // Terminal ID, etc.
      /^merchant\s*id/i,     // Merchant ID
      /^date/i,              // Date, Date:
      /^time/i,              // Time, Time:
      /^\d{8,}$/,            // Long numbers (TIN, etc.)
      /^.{1,2}$/             // Very short lines
    ];

    const skipKeywords = /(bill|invoice|receipt|no\.?|date|terminal|merchant id|trans|vat|pan|cashier|payment|mode|total|jumlah|subtotal|change|cash|tin|msic)/i;

    const businessKeywords = /(mart|store|market|trading|enterprise|sdn bhd|bhd|sdn\. bhd\.|s\/b|sendirian berhad|berhad|enterprise|trading|supermarket|minimart|convenience|restaurant|cafe|food|kitchen|grill|bar|diner|eatery|shop|stall|kiosk|outlet)/i;

    const restaurantKeywords = /(restaurant|cafe|coffee|grill|bar|diner|food|kitchen|eatery|mamak|nasi|roti|mee|chicken rice|wantan mee|char kway teow|hokkien mee|laksa|satay|curry)/i;

    const streetKeywords = /(street|st\.|road|rd\.|avenue|ave\.|drive|dr\.|blvd|lane|ln\.|suite|ste\.|floor|level|lot|no\.|jalan|lorong|kampung|taman)/i;

    const domainKeywords = /\.(com|my|net|biz|store|co|org)$/i;

    // Malaysia-specific company suffixes
    const companySuffixes = /(sdn bhd|sdn\. bhd\.|bhd|berhad|sendirian berhad|s\/b|enterprise|trading co|trading|corp|corporation|llc|ltd|limited|plaza|mall|centre|center|hypermarket|supermarket|minimart|convenience)/i;

    const knownBrands = [
      "tesco", "lotus", "giant", "mydin", "jaya", "aeon", "7 eleven", "familymart",
      "burger king", "mcdonald", "subway", "kfc", "starbucks", "papajohn", "dominos",
      "secret recipe", "marrybrown", "nandos", "pizza hut", "texas chicken",
      "old town", "killiney", "dunkin", "the chicken rice shop", "ipoh hor fun",
      "restoran", "kedai", "gerai", "warung", "mamak", "nasi kandar", "roti canai"
    ];

    const sim = (a, b) => {
      if (!a || !b) return 0;
      a = a.toLowerCase();
      b = b.toLowerCase();
      let same = 0;
      for (let c of a) if (b.includes(c)) same++;
      return same / Math.max(a.length, b.length);
    };

    const candidates = [];

    for (let i = 0; i < headerLines.length; i++) {
      const line = headerLines[i];
      const l = line.toLowerCase();
      const globalIdx = headerZone.start + i;

      // Check for invalid merchant patterns
      const isInvalid = invalidPatterns.some(pattern => pattern.test(l));
      if (isInvalid) {
        console.log("🏪 [Merchant] Rejected invalid pattern:", line);
        continue;
      }

      // Skip obvious non-merchant lines
      if (skipKeywords.test(l)) continue;
      if (/^\d+$/.test(l)) continue; // Skip pure numbers
      if (l.length < 3) continue; // Skip very short lines

      // Skip non-monetary numeric tokens (TIN, MSIC, postal codes)
      if (/\b\d{5,}\b/.test(l) && !/\b\d+\.\d{2}\b/.test(l)) continue; // Skip long numbers that aren't currency

      // Compute score
      let score = 0;

      // Position bonus - earlier lines in header more likely to be merchant
      score += Math.max(0, (headerLines.length - i) * 0.15);

      // Massive bonus for first line in header
      if (globalIdx === 0) score += 2.0;

      if (businessKeywords.test(l)) score += 1.5;        // Business indicators
      if (restaurantKeywords.test(l)) score += 1.5;      // Restaurant indicators
      if (companySuffixes.test(l)) score += 2.0;         // Company suffixes (high priority)
      if (domainKeywords.test(l)) score += 1.0;          // Domain names
      if (streetKeywords.test(l)) score -= 1.0;          // Address-like (strong penalty)

      // Length considerations
      if (line.split(/\s+/).length <= 8) score += 0.3;   // Reasonable name length

      // Uppercase density (merchant names often capitalized)
      const upper = (line.match(/[A-Z]/g) || []).length;
      const totalChars = line.replace(/\s/g, '').length;
      if (totalChars > 0) {
        const upperRatio = upper / totalChars;
        if (upperRatio > 0.3) score += 0.4; // Mostly uppercase
      }

      // Similarity with known brands
      for (let b of knownBrands) {
        const similarity = sim(line, b);
        if (similarity > 0.65) score += 1.0; // High similarity bonus
        else if (similarity > 0.4) score += 0.3; // Partial match
      }

      // Malaysia-specific patterns
      if (l.includes('plaza') || l.includes('mall') || l.includes('centre')) score += 0.5;
      if (l.includes('kedai') || l.includes('gerai') || l.includes('restoran')) score += 0.8;

      candidates.push({ line, score, idx: globalIdx });
    }

    candidates.sort((a, b) => b.score - a.score);

    console.log("🏪 [Merchant Header] top candidates:", candidates.slice(0, 5));

    if (candidates.length === 0) {
      return { name: null, confidence: 0 }; // Unknown merchant
    }

    // Final validation - stricter address rejection
    const chosen = candidates[0].line;
    const score = candidates[0].score;

    // Reject if it looks like an address (contains street keywords)
    const addressIndicators = (chosen.match(streetKeywords) || []).length;
    const hasPostalCode = /\d{5}/.test(chosen.toLowerCase());
    const isLikelyAddress = addressIndicators >= 1 || hasPostalCode;

    if (isLikelyAddress && score < 3.0 && candidates[0].idx !== 0) {  // Allow first line even if address-like
      console.log("🏪 [Merchant] Rejected address-like:", chosen);
      if (candidates.length > 1) {
        const fallback = candidates[1].line;
        const fallbackScore = candidates[1].score;
        // Calculate confidence based on score (0-1 scale)
        const confidence = Math.min(fallbackScore / 5.0, 1.0);
        return { name: fallback, confidence };
      } else {
        return { name: null, confidence: 0 }; // Unknown merchant
      }
    }

    // Calculate confidence based on score (0-1 scale)
    const confidence = Math.min(score / 5.0, 1.0);
    return { name: chosen, confidence };
  }

  // =====================================================================
  // DATE extraction - Enhanced for multiple formats with OCR normalization
  // =====================================================================
  static _extractDate(lines) {
    // Month name mappings
    const monthMap = {
      'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
      'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
      'january': 1, 'february': 2, 'march': 3, 'april': 4, 'june': 6,
      'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
    };

    // 2-digit year normalization: 00-49 → 2000-2049, 50-99 → 1950-1999
    const normalizeYear = (yearStr) => {
      const year = parseInt(yearStr);
      if (year >= 0 && year <= 49) {
        return 2000 + year;
      } else if (year >= 50 && year <= 99) {
        return 1900 + year;
      }
      return year; // Already 4-digit
    };

    // Normalize OCR text: handle extra spaces, remove date prefix
    const normalizeLine = (line) => {
      return line
        .toLowerCase()
        .replace(/date\s*:\s*/i, '')  // remove "DATE : " prefix
        .replace(/\s*\/\s*/g, '/')    // normalize slashes with spaces
        .replace(/\s*\-\s*/g, '-')    // normalize dashes with spaces
        .replace(/\s+/g, ' ')         // collapse multiple spaces
        .trim();
    };

    // Helper to format date as ISO string (YYYY-MM-DD)
    const formatISODate = (year, month, day) => {
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    };

    for (let line of lines) {
      const normalized = normalizeLine(line);

      // Try DD/MMM/YYYY pattern (most common for Malaysia)
      const monthDatePattern = /(\d{1,2})\/([a-z]{3,4})\/(\d{4})/;
      let match = normalized.match(monthDatePattern);
      if (match) {
        const [, day, monthStr, year] = match;
        const month = monthMap[monthStr];
        if (month) {
          const d = parseInt(day);
          const y = parseInt(year);
          if (d >= 1 && d <= 31 && y >= 1950 && y <= 2049) {
            return formatISODate(y, month, d);
          }
        }
      }

      // Try DD/MMM/YY pattern (2-digit year)
      const monthDateYYPattern = /(\d{1,2})\/([a-z]{3,4})\/(\d{2})/;
      match = normalized.match(monthDateYYPattern);
      if (match) {
        const [, day, monthStr, year] = match;
        const month = monthMap[monthStr];
        if (month) {
          const d = parseInt(day);
          const y = normalizeYear(year);
          if (d >= 1 && d <= 31 && y >= 1950 && y <= 2049) {
            return formatISODate(y, month, d);
          }
        }
      }

      // Try DD MMM YYYY pattern
      const spaceDatePattern = /(\d{1,2})\s+([a-z]{3,4})\s+(\d{4})/;
      match = normalized.match(spaceDatePattern);
      if (match) {
        const [, day, monthStr, year] = match;
        const month = monthMap[monthStr];
        if (month) {
          const d = parseInt(day);
          const y = parseInt(year);
          if (d >= 1 && d <= 31 && y >= 1950 && y <= 2049) {
            return formatISODate(y, month, d);
          }
        }
      }

      // Try DD/MM/YYYY pattern (assuming DD/MM for Malaysia)
      const slashDatePattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
      match = normalized.match(slashDatePattern);
      if (match) {
        const [, day, month, year] = match;
        const d = parseInt(day);
        const m = parseInt(month);
        const y = parseInt(year);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1950 && y <= 2049) {
          return formatISODate(y, m, d);
        }
      }

      // Try DD/MM/YY pattern (2-digit year)
      const slashDateYYPattern = /(\d{1,2})\/(\d{1,2})\/(\d{2})/;
      match = normalized.match(slashDateYYPattern);
      if (match) {
        const [, day, month, year] = match;
        const d = parseInt(day);
        const m = parseInt(month);
        const y = normalizeYear(year);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1950 && y <= 2049) {
          return formatISODate(y, m, d);
        }
      }

      // Try D/M/YY pattern (single digit day/month)
      const shortDateYYPattern = /(\d{1,2})\/(\d{1,2})\/(\d{2})/;
      match = normalized.match(shortDateYYPattern);
      if (match) {
        const [, day, month, year] = match;
        const d = parseInt(day);
        const m = parseInt(month);
        const y = normalizeYear(year);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1950 && y <= 2049) {
          return formatISODate(y, m, d);
        }
      }

      // Try YY/MM/DD pattern
      const yyMMDDPattern = /(\d{2})\/(\d{1,2})\/(\d{1,2})/;
      match = normalized.match(yyMMDDPattern);
      if (match) {
        const [, year, month, day] = match;
        const d = parseInt(day);
        const m = parseInt(month);
        const y = normalizeYear(year);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1950 && y <= 2049) {
          return formatISODate(y, m, d);
        }
      }

      // Try YY-MM-DD pattern
      const yyDashMMDDPattern = /(\d{2})\-(\d{1,2})\-(\d{1,2})/;
      match = normalized.match(yyDashMMDDPattern);
      if (match) {
        const [, year, month, day] = match;
        const d = parseInt(day);
        const m = parseInt(month);
        const y = normalizeYear(year);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1950 && y <= 2049) {
          return formatISODate(y, m, d);
        }
      }
    }

    return null;
  }

  // =====================================================================
  // Table detection (simple heuristic)
  // =====================================================================
  static _findTable(lines) {
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/qty|rate|amount|price/i.test(lines[i])) {
        start = i;
        break;
      }
    }
    let end = start >= 0 ? Math.min(start + 6, lines.length - 1) : -1;
    return { tableStart: start, tableEnd: end };
  }

  // =====================================================================
  // NUMBER extraction with non-monetary filtering
  // =====================================================================
  static _extractNumbersWithContext(lines) {
    const result = [];
    const re = /[0-9]+(?:\.[0-9]+|,[0-9]+)?/g;

    // Non-monetary patterns to skip
    const skipPatterns = [
      /\btin\s*:\s*\d+/i,      // TIN: 123456789
      /\bmsic\s*:\s*\d+/i,     // MSIC: 12345
      /\d{5,}/,                // Long numbers (postal codes, TIN, etc.)
      /\b\d{10,}\b/            // Very long numbers (phone, TIN)
    ];

    for (let i = 0; i < lines.length; i++) {
      const found = lines[i].match(re);
      if (!found) continue;

      for (let f of found) {
        const val = parseFloat(f.replace(",", "."));

        // Skip non-monetary numbers
        const lineLower = lines[i].toLowerCase();
        const shouldSkip = skipPatterns.some(pattern => pattern.test(lineLower));

        if (!isNaN(val) && !shouldSkip) {
          result.push({
            line: lines[i],
            idxLine: i,
            token: f,
            val
          });
        }
      }
    }
    return result;
  }

  // =====================================================================
  // TOTAL DETECTION FROM FOOTER ZONE
  // =====================================================================
  static _extractTotalFromFooter(lines, footerZone) {
    const footerLines = lines.slice(footerZone.start, footerZone.end + 1);
    const allNums = this._extractNumbersWithContext(lines); // Get all numbers first

    // Enhanced semantic total keywords (prioritized)
    const semanticKeywords = [
      // High priority semantic totals
      /\brounded\s+total\b/i,
      /\bfinal\s+total\b/i,
      /\btotal\s*\(\s*rm\s*\)\b/i,
      /\btotal\s*\(\s*myr\s*\)\b/i,
      /\bgrand\s+total\b/i,
      /\bnet\s+total\b/i,
      /\bamount\s+due\b/i,
      /\bbalance\s+due\b/i,
      /\btotal\s+amount\b/i,
      /\btotal\s+payable\b/i,
      /\btotal\s+to\s+pay\b/i,
      /\btotal\b/i,
      /\bamount\b/i,
      /\bbalance\b/i
    ];

    const candidates = [];

    // First pass: semantic keyword matching in footer
    for (let i = 0; i < footerLines.length; i++) {
      const line = footerLines[i];
      const globalIdx = footerZone.start + i;
      const lineLower = line.toLowerCase();

      // Find numbers in this line
      const lineNums = allNums.filter(n => n.idxLine === globalIdx);

      for (let num of lineNums) {
        let score = 0.5; // Base score for being in footer

        // Check semantic keywords (highest priority)
        for (let j = 0; j < semanticKeywords.length; j++) {
          if (semanticKeywords[j].test(lineLower)) {
            score += (semanticKeywords.length - j) * 0.2; // Earlier in array = higher priority
            break; // Take the first matching keyword
          }
        }

        // Currency indicators
        if (/\b(rm|myr|\$)\b/i.test(lineLower)) score += 0.3;

        // Position bonus (later in footer = higher chance of being total)
        const positionRatio = i / footerLines.length;
        score += positionRatio * 0.2;

        // Decimal numbers (more likely to be monetary)
        if (num.token.includes('.')) score += 0.1;

        // Reasonable total range
        if (num.val >= 1 && num.val <= 10000) score += 0.1;

        candidates.push({
          value: num.val,
          score,
          line: line,
          idxLine: globalIdx,
          source: 'semantic_total'
        });
      }
    }

    // Second pass: fallback to any numbers in footer (lower priority)
    if (candidates.length === 0) {
      for (let num of allNums) {
        if (num.idxLine >= footerZone.start && num.idxLine <= footerZone.end) {
          candidates.push({
            value: num.val,
            score: 0.1, // Low base score for fallback
            line: num.line,
            idxLine: num.idxLine,
            source: 'footer_fallback'
          });
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score);

    console.log("💰 [Total Footer] candidates:", candidates.slice(0, 5));

    return candidates.length > 0 ? candidates[0] : null;
  }

  // =====================================================================
  // ITEM amount extraction
  // =====================================================================
  static _extractItemAmounts(lines, tableStart, tableEnd) {
    if (tableStart < 0) return [];

    const allNums = this._extractNumbersWithContext(lines);
    const forward = [];
    const start = tableEnd + 1;
    const end = Math.min(start + 6, lines.length - 1);

    for (let n of allNums) {
      if (n.idxLine >= start && n.idxLine <= end) {
        if (n.val > 0 && n.val < 100000) forward.push(n.val);
      }
    }

    return forward;
  }

  // =====================================================================
  // EMPTY RESULT
  // =====================================================================
  static _emptyResult() {
    return {
      success: false,
      merchant: null,
      merchant_confidence: 0,
      date: null,
      total: null,
      items: [],
      itemsSum: null,
      candidates: [],
      confidence_score: 0,
      confidence_level: "low"
    };
  }
}

