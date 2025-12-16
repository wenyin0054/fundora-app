// AIPredictionEngine.js — Final integrated version
// - uses normalize from ./normalize
// - uses getUserTag, saveUserTag, getUserPredictions from your SQLite
// - Intelligent User Memory v3 integrated (exact/prefix/substring/fuzzy)
// - Feature / Semantic / Statistical / Ensemble preserved and used

import Fuse from "fuse.js";
import {
  getUserTag,
  getUserPredictions
} from "../../../../database/SQLite"; // Keep your original path
import { normalize } from "./normalize";

// ---------------------------
// CONSTANTS
// ---------------------------
export const DEFAULT_TAGS = [
  { name: "Food & Drinks", keywords: ["food", "restaurant", "cafe", "coffee", "mcdonald", "kfc", "burger", "bubble", "tea"] },
  { name: "Groceries", keywords: ["supermarket", "grocer", "tesco", "giant", "lotus", "jaya grocer"] },
  { name: "Transport", keywords: ["parking", "toll", "grab", "bus", "train", "uber", "taxi"] },
  { name: "Fuel", keywords: ["petrol", "shell", "ron95", "ron97", "diesel", "petronas"] },
  { name: "Shopping", keywords: ["mall", "store", "shop", "uniqlo", "mr diy", "shopee", "lazada"] },
  { name: "Telco", keywords: ["digi", "maxis", "umobile", "celcom", "hotlink"] },
  { name: "Utilities", keywords: ["bill", "electric", "water", "tenaga", "tm", "internet"] },
  { name: "Entertainment", keywords: ["cinema", "movie", "game", "karaoke", "amusement"] },
  { name: "Pharmacy", keywords: ["watsons", "guardian", "pharmacy", "medicine", "clinic"] },
  { name: "Healthcare", keywords: ["hospital", "clinic", "dental", "medical"] },
  { name: "Bills", keywords: ["invoice", "bill payment", "subscription"] },
  { name: "E-Wallet", keywords: ["tng", "boost", "grabpay", "ewallet", "topup", "reload"] },
  { name: "Miscellaneous", keywords: [] },
];

export const THRESHOLDS = {
  USER_MEMORY_CONFIDENCE: 0.95,
  AI_ENSEMBLE_AUTO_ASSIGN: 0.85,
  FUZZY_THRESHOLD: 0.38
};

const COMMON_BRANDS = ['starbucks', 'mcdonald', 'kfc', 'grab', 'uber', 'lazada', 'shopee', 'tesco', 'giant', 'guardian', 'watsons', 'shell', 'petronas'];

// Pure JS Levenshtein distance (RN-safe version)
function levenshtein(a, b) {
  if (!a || !b) return 0;
  const matrix = [];

  const aLen = a.length;
  const bLen = b.length;

  for (let i = 0; i <= aLen; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= bLen; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= aLen; i++) {
    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[aLen][bLen];
}


// ---------------------------
// FEATURE-BASED MODEL
// ---------------------------
class FeatureBasedModel {
  extractFeatures(payee) {
    const features = {};
    const p = (payee || "").toLowerCase();

    // tag keyword flags
    DEFAULT_TAGS.forEach(tag => {
      const key = tag.name.replace(/\s+/g, '_').toLowerCase();
      features[`tag_${key}`] = tag.keywords.some(kw => p.includes(kw)) ? 1 : 0;
    });

    // extra features
    features.length = Math.min((p.length || 0) / 20, 1.0);
    features.has_numbers = /\d/.test(p) ? 1 : 0;
    features.has_special = /[^a-z0-9\s]/.test(p) ? 1 : 0;
    const firstWord = (p.split(/\s+/)[0] || "");
    features.first_word_common = COMMON_BRANDS.includes(firstWord) ? 1 : 0;

    return features;
  }

  calculateTagScore(features, tagName) {
    let score = 0;
    const tagKey = tagName.replace(/\s+/g, '_').toLowerCase();
    if (features[`tag_${tagKey}`]) score += 30;

    // simple rules mapping for categories
    if (tagName === "Food & Drinks" && features.first_word_common) score += 10;
    score += features.length * 10;
    if (features.has_numbers) score += 2;
    if (features.has_special) score += 1;

    return Math.min(100, score);
  }

  async predict(payeeNorm) {
    const features = this.extractFeatures(payeeNorm);
    const scores = {};
    DEFAULT_TAGS.forEach(tag => {
      scores[tag.name] = this.calculateTagScore(features, tag.name);
    });
    let bestTag = null;
    let bestScore = 0;
    for (const [tag, sc] of Object.entries(scores)) {
      if (sc > bestScore) { bestScore = sc; bestTag = tag; }
    }
    if (!bestTag) return null;
    return { tag: bestTag, confidence: Math.min(1.0, bestScore / 100), source: "feature_model", features, allScores: scores };
  }
}

// ---------------------------
// SEMANTIC MODEL (Fuse over DEFAULT_TAGS.keywords)
// ---------------------------
class SemanticModel {
  constructor() {
    this.fuse = new Fuse(
      DEFAULT_TAGS.map(t => ({ name: t.name, keywords: t.keywords.join(" ") })),
      { keys: ["keywords"], threshold: 0.35, includeScore: true }
    );
  }

  async predict(payeeNorm) {
    const res = this.fuse.search(payeeNorm);
    if (!res || res.length === 0) return null;
    const top = res[0];
    return { tag: top.item.name, confidence: Math.min(1.0, 1 - top.score), source: "semantic_model", score: top.score };
  }
}

// ---------------------------
// STATISTICAL MODEL (user history frequency)
// ---------------------------
class StatisticalModel {
  constructor() { this.tagFreq = {}; this.total = 0; }
  async load(userId) {
    try {
      const rows = await getUserPredictions(userId) || [];
      rows.forEach(r => { this.tagFreq[r.tag] = (this.tagFreq[r.tag] || 0) + (r.count || 1); this.total += (r.count || 1); });
    } catch (e) { /* ignore */ }
  }
  async predict(userId) {
    if (!this.total) await this.load(userId);
    if (this.total === 0) return null;
    const best = Object.entries(this.tagFreq).sort((a,b)=>b[1]-a[1])[0];
    if (!best) return null;
    const [tag, cnt] = best;
    return { tag, confidence: Math.min(0.8, cnt / Math.max(5, this.total)), source: "statistical_model", frequency: cnt };
  }
}

// ---------------------------
// ENSEMBLE (combine feature + semantic + statistical)
// ---------------------------
class EnsembleExpenseTagger {
  constructor() {
    this.feature = new FeatureBasedModel();
    this.semantic = new SemanticModel();
    this.statistical = new StatisticalModel();
  }

  async predict(userId, payeeNorm) {
    // run models
    const results = [];
    const f = await this.feature.predict(payeeNorm);
    if (f) results.push(f);
    const s = await this.semantic.predict(payeeNorm);
    if (s) results.push(s);
    const st = await this.statistical.predict(userId);
    if (st) results.push(st);

    if (results.length === 0) return null;

    // score aggregation (simple sum of confidences per tag)
    const agg = {};
    results.forEach(r => { agg[r.tag] = (agg[r.tag] || 0) + (r.confidence || 0); });
    const best = Object.entries(agg).sort((a,b)=>b[1]-a[1])[0];
    if (!best) return null;
    const tag = best[0], score = Math.min(1.0, best[1]);
    return { tag, confidence: score, source: "ai_ensemble", subModels: results };
  }
}

const ENSEMBLE = new EnsembleExpenseTagger();

function jaroWinkler(s1, s2) {
  if (!s1 || !s2) return 0;

  const m = getJaroMatches(s1, s2);
  if (m.matches === 0) return 0;

  const jaro =
    (m.matches / s1.length +
     m.matches / s2.length +
     (m.matches - m.transpositions / 2) / m.matches) / 3;

  const prefix = getPrefixLength(s1, s2);
  return jaro + Math.min(0.1, 0.1 * prefix) * (1 - jaro);
}

function getJaroMatches(s1, s2) {
  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  let matches = 0;
  let transpositions = 0;

  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  // Count matches
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  // Count transpositions
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return { matches, transpositions };
}

function getPrefixLength(s1, s2) {
  let prefix = 0;
  for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  return prefix;
}

function longestCommonSubstring(a, b) {
  if (!a || !b) return "";

  const dp = Array(a.length + 1)
    .fill(null)
    .map(() => Array(b.length + 1).fill(0));

  let maxLen = 0;
  let endIndex = 0;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > maxLen) {
          maxLen = dp[i][j];
          endIndex = i;
        }
      }
    }
  }

  return a.slice(endIndex - maxLen, endIndex);
}


// ---------------------------
// USER MEMORY INTELLIGENCE V3
// - Uses getUserTag (exact) and getUserPredictions (to fuzzy/prefix/substring)
// ---------------------------
async function getSmartUserMemory(userId, payeeNorm) {
  if (!userId || !payeeNorm) return null;

  // EXACT MATCH FIRST
  const exact = await getUserTag(userId, payeeNorm);
  if (exact && exact.tag) {
    return { type: "exact", ...exact };
  }

  // LOAD ALL MEMORY
  let rows = await getUserPredictions(userId) || [];
  if (!rows.length) return null;

  // Normalize
  const memories = rows.map(m => ({
    ...m,
    key: normalize(m.payee_normalized || "")
  }));

  let bestMatch = null;
  let bestScore = 0;

  for (const m of memories) {
    const key = m.key;
    if (!key || key.length === 0) continue;

    // ---- 1) String similarity (0–1) ----
    const distance = levenshtein(payeeNorm, key)
    const maxLen = Math.max(payeeNorm.length, key.length);
    const charSim = 1 - (distance / maxLen);

    // ---- 2) Jaro-Winkler similarity ----
    const jwSim = jaroWinkler(payeeNorm, key);

    // ---- 3) Substring ratio similarity ----
    const commonLength = longestCommonSubstring(payeeNorm, key).length;
    const subSim = commonLength / maxLen;

    // ---- 4) User usage frequency weight ----
    const freqWeight = Math.min(1, (m.count || 1) / 5);

    // ---- 5) Final intelligent scoring ----
    const finalScore =
      (charSim * 0.4) +
      (jwSim * 0.3) +
      (subSim * 0.2) +
      (freqWeight * 0.1);

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestMatch = m;
    }
  }

  // ---- Dynamic threshold: automatically adjust based on input length ----
  const dynamicThreshold =
    payeeNorm.length <= 3 ? 0.92 :
    payeeNorm.length <= 5 ? 0.85 : 0.75;

  if (bestScore >= dynamicThreshold) {
    return {
      type: "smart",
      confidence: bestScore,
      ...bestMatch
    };
  }

  return null;
}

// ---------------------------
// SIMPLE RULES / KEYWORD MATCH
// ---------------------------
function keywordMatch(payeeNorm) {
  if (!payeeNorm) return null;
  for (const tag of DEFAULT_TAGS) {
    for (const kw of tag.keywords) {
      if (payeeNorm.includes(kw)) return { category: tag.name, confidence: 0.6, source: "keyword_match" };
    }
  }
  return null;
}

// ---------------------------
// Main predictCategory
// ---------------------------
export async function predictCategory(userId, payeeRaw) {
  try {
    const payeeNorm = normalize(payeeRaw || "");

    // 1) Memory
    const mem = await getSmartUserMemory(userId, payeeNorm);
    if (mem) {
      return {
        category: mem.tag || mem.category,
        confidence: THRESHOLDS.USER_MEMORY_CONFIDENCE || 0.95,
        source: "user_memory_" + mem.type,
        memoryDetails: mem
      };
    }

    // 2) Ensemble AI
    const aiRes = await ENSEMBLE.predict(userId, payeeNorm);
    if (aiRes && aiRes.confidence >= THRESHOLDS.AI_ENSEMBLE_AUTO_ASSIGN) {
      return {
        category: aiRes.tag,
        confidence: aiRes.confidence,
        source: aiRes.source,
        details: aiRes.subModels
      };
    }

    // 3) Keyword / rule fallback
    const kw = keywordMatch(payeeNorm);
    if (kw && kw.category) {
      return { category: kw.category, confidence: kw.confidence, source: kw.source };
    }

    // 4) final fallback
    return { category: "Miscellaneous", confidence: 0.3, source: "fallback" };

  } catch (err) {
    console.error("predictCategory error:", err);
    return { category: "Miscellaneous", confidence: 0.1, source: "error" };
  }
}

// ---------------------------
// Export default for compatibility
// ---------------------------
export default {
  predictCategory
};
