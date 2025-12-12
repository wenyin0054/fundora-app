// ===============================================================
// Enhanced Receipt Parser V5
// Merchant V5 + Total V5 + ItemsSum Method A/B
// ===============================================================

export class EnhancedReceiptParser {

  // =====================================================================
  // MAIN ENTRY
  // =====================================================================
  static parseReceiptText(rawText) {
    console.log("🔍 [Parser V5] START");

    if (!rawText) return this._emptyResult();

    const lines = rawText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    console.log("📝 lines:", lines.length);

    // ---- MERCHANT -----------------------------------------
    const merchant = this._extractMerchant_V5(lines);

    // ---- DATE ---------------------------------------------
    const date = this._extractDate(lines);

    // ---- TABLE REGION -------------------------------------
    const { tableStart, tableEnd } = this._findTable(lines);

    // ---- NUMBERS ------------------------------------------
    const allNums = this._extractNumbersWithContext(lines);

    // ---- TOTALS -------------------------------------------
    const explicitTotals = this._extractExplicitTotals_V5(lines, allNums);

    // ---- ITEM AMOUNTS -------------------------------------
    const itemAmounts = this._extractItemAmounts(lines, tableStart, tableEnd, allNums);

    const itemsSum = itemAmounts.length > 0
      ? itemAmounts.reduce((a, b) => a + b, 0)
      : null;

    // ---- CANDIDATES ---------------------------------------
    const candidates = this._buildCandidates_V5(
      lines,
      allNums,
      explicitTotals,
      itemAmounts,
      itemsSum,
      tableStart,
      tableEnd
    );

    console.log("📊 V5 candidates:", candidates.slice(0, 8));

    const best = candidates.length > 0 ? candidates[0] : null;
    const finalTotal = best ? best.value : null;
    const score = best ? best.score : 0;
    const confidence =
      score >= 0.75 ? "high" :
      score >= 0.45 ? "medium" : "low";

    console.log("🎯 chosen:", best);
    console.log("📌 finalTotal:", finalTotal, confidence);

    return {
      success: true,
      merchant,
      date,
      total: finalTotal,
      confidence_score: score,
      confidence_level: confidence,
      items: itemAmounts,
      itemsSum,
      candidates,
      raw_text: rawText,
      tableStart,
      tableEnd
    };
  }

  // =====================================================================
  // MERCHANT DETECTION V5
  // =====================================================================
  static _extractMerchant_V5(lines) {
    if (!lines || lines.length === 0) return null;

    const header = lines.slice(0, 10);

    const skipKeywords = /(bill|invoice|receipt|no\.?|date|terminal|merchant id|trans|vat|pan|cashier|payment|mode)/i;

    const businessKeywords = /(mart|store|market|trading|enterprise|sdn bhd|bhd|grocer|supermarket|convenience|minimart)/i;

    const restaurantKeywords = /(restaurant|cafe|coffee|grill|bar|diner|food|kitchen|eatery)/i;

    const streetKeywords = /(street|st\.|road|rd\.|avenue|ave\.|drive|dr\.|blvd|lane|ln\.|suite|ste)/i;

    const domainKeywords = /\.(com|my|net|biz|store|co)$/i;

    const knownBrands = [
      "tesco","lotus","giant","mydin","jaya","aeon","7 eleven","familymart",
      "burger king","mcdonald","subway","kfc","starbucks","papajohn","dominos"
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

    for (let i = 0; i < header.length; i++) {
      const line = header[i];
      const l = line.toLowerCase();

      // ignore junk
      if (skipKeywords.test(l)) continue;
      if (/^\d+$/.test(l)) continue;

      // compute score
      let score = 0;

      if (businessKeywords.test(l)) score += 1.2;        // mart, store
      if (restaurantKeywords.test(l)) score += 1.2;      // restaurant, cafe
      if (domainKeywords.test(l)) score += 1.0;          // *.com
      if (streetKeywords.test(l)) score += 0.4;          // address-like line → low weight
      if (line.split(/\s+/).length <= 5) score += 0.2;

      // uppercase density
      const upper = (line.match(/[A-Z]/g) || []).length;
      if (upper >= 3) score += 0.3;

      // similarity with known brands
      for (let b of knownBrands) {
        if (sim(line, b) > 0.65) score += 0.8;
      }

      // bonus for top lines
      score += Math.max(0, (6 - i) * 0.05);

      candidates.push({ line, score, idx: i });
    }

    candidates.sort((a, b) => b.score - a.score);

    console.log("🏪 [Merchant V5] shortlisted:", candidates.slice(0, 5));

    if (candidates.length === 0) return null;

    // Final validation: reject if line is address ONLY
    const chosen = candidates[0].line;
    const isPureAddress = streetKeywords.test(chosen.toLowerCase()) && !businessKeywords.test(chosen);
    if (isPureAddress) {
      // merchant likely above address → try previous line
      if (candidates.length > 1) return candidates[1].line;
    }

    return chosen;
  }

  // =====================================================================
  // DATE extraction
  // =====================================================================
  static _extractDate(lines) {
    const re = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
    for (let l of lines) {
      const m = l.match(re);
      if (m) {
        let [_, d, mn, y] = m;
        if (y.length === 2) y = "20" + y;
        return `${y}-${mn.padStart(2, "0")}-${d.padStart(2, "0")}`;
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
  // NUMBER extraction
  // =====================================================================
  static _extractNumbersWithContext(lines) {
    const result = [];
    const re = /[0-9]+(?:\.[0-9]+|,[0-9]+)?/g;

    for (let i = 0; i < lines.length; i++) {
      const found = lines[i].match(re);
      if (!found) continue;
      for (let f of found) {
        const val = parseFloat(f.replace(",", "."));
        if (!isNaN(val)) {
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
  // TOTAL V5 extractions
  // =====================================================================
  static _extractExplicitTotals_V5(lines, allNums) {
    const kw = /(total|amount due|grand total|balance|payable|rm|usd|\$)/i;

    const results = [];

    for (let n of allNums) {
      if (kw.test(n.line)) {
        results.push(n);
      }
    }

    return results;
  }

  // =====================================================================
  // ITEM amount extraction
  // =====================================================================
  static _extractItemAmounts(lines, tableStart, tableEnd, allNums) {
    if (tableStart < 0) return [];

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
  // CANDIDATE BUILDER V5
  // =====================================================================
  static _buildCandidates_V5(
    lines,
    allNums,
    explicitTotals,
    itemAmounts,
    itemsSum,
    tableStart,
    tableEnd
  ) {
    const candidates = [];
    const bottomStart = Math.floor(lines.length * 0.65);

    // ----------------------------------------------------------
    // Explicit totals — now highest priority
    // ----------------------------------------------------------
    for (let e of explicitTotals) {
      let score = 1.0; // strong weight

      if (e.idxLine >= bottomStart) score += 0.2; // totals usually below
      if (/total/i.test(e.line)) score += 0.4;    // contains TOTAL specifically
      if (/grand|balance/i.test(e.line)) score += 0.2;

      const rep = allNums.filter(x => x.val === e.val).length;
      if (rep >= 2) score += rep * 0.05;

      candidates.push({
        source: "explicit_total",
        value: e.val,
        score,
        info: { idxLine: e.idxLine, repeats: rep }
      });
    }

    // ----------------------------------------------------------
    // ItemsSum candidate
    // ----------------------------------------------------------
    if (itemsSum != null) {
      candidates.push({
        source: "items_sum",
        value: itemsSum,
        score: 0.55,
        info: { count: itemAmounts.length }
      });
    }

    // ----------------------------------------------------------
    // Adaptive fallback scoring
    // ----------------------------------------------------------
    for (let n of allNums) {
      let score = 0.1;

      if (n.token.includes(".")) score += 0.15;
      if (n.idxLine >= bottomStart) score += 0.1;
      const rep = allNums.filter(x => x.val === n.val).length;
      if (rep >= 2) score += 0.15;

      candidates.push({
        source: "adaptive",
        value: n.val,
        score,
        info: { idxLine: n.idxLine, rep, token: n.token }
      });
    }

    // ----------------------------------------------------------
    // METHOD A – Hard Reject (total < itemsSum)
    // ----------------------------------------------------------
    if (itemsSum != null) {
      for (let c of candidates) {
        if (c.value < itemsSum) {
          c.score = 0;
          c.info.hardRejected = true;
        }
      }
    }

    // ----------------------------------------------------------
    // METHOD B – Bonus if > itemsSum
    // ----------------------------------------------------------
    if (itemsSum != null) {
      for (let c of candidates) {
        if (c.value >= itemsSum) {
          const diff = (c.value - itemsSum) / itemsSum;
          const bonus = Math.min(diff, 0.25);
          c.score += bonus;
          c.info.bonus = bonus;
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }

  // =====================================================================
  // EMPTY RESULT
  // =====================================================================
  static _emptyResult() {
    return {
      success: false,
      merchant: null,
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

