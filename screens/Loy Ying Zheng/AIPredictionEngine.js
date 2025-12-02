// AIPredictionEngine.js
import Fuse from "fuse.js";
import { getUserTag, saveUserTag, getUserPredictions } from "../../database/SQLite";


//DEFAULT_TAGS
const DEFAULT_TAGS = [
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


// 配置
const THRESHOLDS = {
    USER_MEMORY: 0.90,
    AI_ENSEMBLE: { AUTO_ASSIGN: 0.85, SUGGESTION: 0.65 },
    FUZZY_MATCH: { AUTO_ASSIGN: 0.80, SUGGESTION: 0.60 },
    KEYWORD: { AUTO_ASSIGN: 0.75, SUGGESTION: 0.55 }
};

// 特徵關鍵字擴展
const FEATURE_KEYWORDS = {
    food: ["food", "restaurant", "cafe", "coffee", "meal", "dining", "eat", "bistro"],
    transport: ["grab", "uber", "taxi", "bus", "train", "lrt", "mrt", "transport", "commute"],
    shopping: ["shop", "store", "mall", "buy", "purchase", "retail", "market"],
    bills: ["bill", "invoice", "payment", "subscription", "utility", "tenaga", "tm"],
    groceries: ["grocery", "supermarket", "market", "fresh", "produce", "vegetable"],
    entertainment: ["movie", "cinema", "game", "fun", "entertain", "leisure"],
    healthcare: ["hospital", "clinic", "medical", "health", "doctor", "pharmacy"],
    fuel: ["petrol", "gas", "fuel", "shell", "petronas", "caltex"]
};

class FeatureBasedModel {
    constructor() {
        this.featureWeights = {};
        this.isTrained = false;
    }

    extractFeatures(payee) {
        const words = payee.toLowerCase().split(/\s+/);
        const features = {};

        // 1. 標籤關鍵字特徵
        DEFAULT_TAGS.forEach(tag => {
            const tagKey = tag.name.replace(/\s+/g, '_').toLowerCase();
            features[`tag_${tagKey}`] = tag.keywords.some(kw =>
                payee.includes(kw)
            ) ? 1 : 0;
        });

        // 2. 語義類別特徵
        Object.keys(FEATURE_KEYWORDS).forEach(category => {
            features[`cat_${category}`] = FEATURE_KEYWORDS[category].some(kw =>
                payee.includes(kw)
            ) ? 1 : 0;
        });

        // 3. 文本特徵
        features.length = Math.min(payee.length / 20, 1.0); // 歸一化
        features.word_count = Math.min(words.length / 5, 1.0);
        features.has_numbers = /\d/.test(payee) ? 1 : 0;
        features.has_special = /[^a-z0-9\s]/.test(payee) ? 1 : 0;

        // 4. 位置特徵 (商標詞通常在開頭)
        const firstWord = words[0] || '';
        features.first_word_common = COMMON_BRANDS.includes(firstWord) ? 1 : 0;

        return features;
    }

    calculateTagScore(features, tagName) {
        let score = 0;
        const tagKey = tagName.replace(/\s+/g, '_').toLowerCase();

        // 基於特徵計算分數
        if (features[`tag_${tagKey}`]) score += 30;

        // 語義類別加分
        if (tagName === "Food & Drinks" && features.cat_food) score += 25;
        if (tagName === "Transport" && features.cat_transport) score += 25;
        if (tagName === "Shopping" && features.cat_shopping) score += 25;
        if (tagName === "Bills" && features.cat_bills) score += 25;
        if (tagName === "Groceries" && features.cat_groceries) score += 25;
        if (tagName === "Entertainment" && features.cat_entertainment) score += 25;
        if (tagName === "Healthcare" && features.cat_healthcare) score += 25;
        if (tagName === "Fuel" && features.cat_fuel) score += 25;

        // 文本特徵調整
        score += features.length * 5;
        score += features.word_count * 8;

        return Math.min(100, score);
    }

    async predict(payee) {
        const features = this.extractFeatures(payee);
        const scores = {};

        DEFAULT_TAGS.forEach(tag => {
            scores[tag.name] = this.calculateTagScore(features, tag.name);
        });

        let bestTag = null;
        let bestScore = 0;

        for (const [tag, score] of Object.entries(scores)) {
            if (score > bestScore) {
                bestScore = score;
                bestTag = tag;
            }
        }

        const confidence = Math.min(1.0, bestScore / 100);

        return {
            tag: bestTag,
            confidence: confidence,
            source: "feature_model",
            features: features,
            allScores: scores
        };
    }
}

class SemanticModel {
    constructor() {
        this.fuse = new Fuse(
            DEFAULT_TAGS.map(t => ({
                name: t.name,
                keywords: t.keywords.join(" "),
                rawKeywords: t.keywords
            })),
            {
                keys: ["keywords"],
                threshold: 0.3,
                includeScore: true
            }
        );
    }

    async predict(payee) {
        const results = this.fuse.search(payee);

        if (results.length > 0) {
            const bestMatch = results[0];
            const similarity = 1 - bestMatch.score;
            const lengthBonus = Math.min(0.15, payee.length * 0.03);
            const confidence = Math.min(1.0, similarity + lengthBonus);

            return {
                tag: bestMatch.item.name,
                confidence: confidence,
                source: "semantic_model",
                similarity: similarity
            };
        }

        return { tag: null, confidence: 0, source: "semantic_no_match" };
    }
}

class StatisticalModel {
    constructor() {
        this.tagFrequencies = {};
        this.totalPredictions = 0;
    }

    async loadUserStatistics(userId) {
        try {
            const userData = await getUserPredictions(userId);
            userData.forEach(item => {
                this.tagFrequencies[item.tag] = (this.tagFrequencies[item.tag] || 0) + item.count;
                this.totalPredictions += item.count;
            });
        } catch (error) {
            console.log("No user statistics available");
        }
    }

    async predict(payee) {
        if (this.totalPredictions === 0) {
            return { tag: null, confidence: 0, source: "statistical_no_data" };
        }

        // 簡單的基於頻率的預測
        let bestTag = null;
        let bestFrequency = 0;

        for (const [tag, freq] of Object.entries(this.tagFrequencies)) {
            const frequencyScore = freq / this.totalPredictions;
            if (frequencyScore > bestFrequency) {
                bestFrequency = frequencyScore;
                bestTag = tag;
            }
        }

        return {
            tag: bestTag,
            confidence: Math.min(0.7, bestFrequency * 1.5), // 限制最高置信度
            source: "statistical_model",
            frequency: bestFrequency
        };
    }
}

class EnsembleExpenseTagger {
    constructor() {
        this.models = {
            feature: new FeatureBasedModel(),
            semantic: new SemanticModel(),
            statistical: new StatisticalModel()
        };
        this.weights = {
            feature: 0.4,
            semantic: 0.35,
            statistical: 0.25
        };
        this.isInitialized = false;
    }

    async initialize(userId) {
        if (!this.isInitialized) {
            await this.models.statistical.loadUserStatistics(userId);
            this.isInitialized = true;
        }
    }

    async predict(userId, payee) {
        await this.initialize(userId);

        const predictions = await Promise.all([
            this.models.feature.predict(payee),
            this.models.semantic.predict(payee),
            this.models.statistical.predict(payee)
        ]);

        // 加權投票
        const weightedScores = {};
        const modelDetails = {};

        predictions.forEach((pred, index) => {
            const modelName = Object.keys(this.models)[index];
            const weight = this.weights[modelName];
            modelDetails[modelName] = pred;

            if (pred.tag && pred.confidence > 0.1) {
                weightedScores[pred.tag] = (weightedScores[pred.tag] || 0) + (pred.confidence * weight);
            }
        });

        let bestTag = null;
        let bestScore = 0;

        for (const [tag, score] of Object.entries(weightedScores)) {
            if (score > bestScore) {
                bestScore = score;
                bestTag = tag;
            }
        }

        return {
            tag: bestTag,
            confidence: Math.min(1.0, bestScore),
            source: "ai_ensemble",
            modelDetails: modelDetails,
            weightedScores: weightedScores
        };
    }
}

// 全局 AI 引擎實例
let aiEngine = null;

function getAIEngine() {
    if (!aiEngine) {
        aiEngine = new EnsembleExpenseTagger();
    }
    return aiEngine;
}

// 主預測函數
export async function predictCategory(userId, payeeRaw) {
    try {
        console.log("🎯 PREDICT: Starting prediction for:", payeeRaw);

        if (!payeeRaw || payeeRaw.trim().length < 1) {
            return { category: null, confidence: 0, source: "empty" };
        }

        const payee = normalize(payeeRaw);

        // 1. 🏆 USER MEMORY (最高優先級)
        const userRec = await getUserTag(userId, payee);
        if (userRec && userRec.tag) {
            console.log("✅ USER MEMORY FOUND:", userRec.tag);
            return {
                category: userRec.tag,
                confidence: Math.max(THRESHOLDS.USER_MEMORY, userRec.confidence || 0.9),
                source: "user_memory",
                usageCount: userRec.count
            };
        }

        // 2. 🤖 AI ENSEMBLE PREDICTION
        const aiResult = await getAIEngine().predict(userId, payee);

        if (aiResult.tag && aiResult.confidence >= THRESHOLDS.AI_ENSEMBLE.AUTO_ASSIGN) {
            console.log("✅ AI ENSEMBLE AUTO ASSIGN:", aiResult.tag, "confidence:", aiResult.confidence);
            return {
                category: aiResult.tag,
                confidence: aiResult.confidence,
                source: "ai_auto",
                modelDetails: aiResult.modelDetails
            };
        }

        // 3. 🔍 INDIVIDUAL MODEL PREDICTIONS (當集成信心不足時)
        const individualResults = [];

        // 特徵模型
        const featureResult = await getAIEngine().models.feature.predict(payee);
        if (featureResult.confidence >= THRESHOLDS.FUZZY_MATCH.AUTO_ASSIGN) {
            individualResults.push({
                ...featureResult,
                category: featureResult.tag,
                source: "feature_auto"
            });
        }

        // 語義模型
        const semanticResult = await getAIEngine().models.semantic.predict(payee);
        if (semanticResult.confidence >= THRESHOLDS.FUZZY_MATCH.AUTO_ASSIGN) {
            individualResults.push({
                ...semanticResult,
                category: semanticResult.tag,
                source: "semantic_auto"
            });
        }

        // 選擇最好的單模型結果
        if (individualResults.length > 0) {
            const bestIndividual = individualResults.reduce((best, current) =>
                current.confidence > best.confidence ? current : best
            );
            console.log("✅ INDIVIDUAL MODEL AUTO ASSIGN:", bestIndividual.category);
            return bestIndividual;
        }

        // 4. 💡 SUGGESTIONS
        const suggestions = [];

        if (aiResult.tag && aiResult.confidence >= THRESHOLDS.AI_ENSEMBLE.SUGGESTION) {
            suggestions.push({
                category: aiResult.tag,
                confidence: aiResult.confidence,
                source: "ai_suggestion"
            });
        }

        if (featureResult.tag && featureResult.confidence >= THRESHOLDS.FUZZY_MATCH.SUGGESTION) {
            suggestions.push({
                category: featureResult.tag,
                confidence: featureResult.confidence,
                source: "feature_suggestion"
            });
        }

        if (semanticResult.tag && semanticResult.confidence >= THRESHOLDS.FUZZY_MATCH.SUGGESTION) {
            suggestions.push({
                category: semanticResult.tag,
                confidence: semanticResult.confidence,
                source: "semantic_suggestion"
            });
        }

        // 關鍵字匹配作為最後的建議
        const keywordResult = keywordMatch(payee);
        if (keywordResult.confidence >= THRESHOLDS.KEYWORD.SUGGESTION) {
            suggestions.push({
                category: keywordResult.category,
                confidence: keywordResult.confidence,
                source: "keyword_suggestion"
            });
        }

        if (suggestions.length > 0) {
            const bestSuggestion = suggestions.reduce((best, current) =>
                current.confidence > best.confidence ? current : best
            );
            console.log("💡 SUGGESTIONS AVAILABLE:", suggestions.map(s => s.category));
            return {
                category: null,
                confidence: bestSuggestion.confidence,
                source: "suggestions",
                suggestions: suggestions.sort((a, b) => b.confidence - a.confidence)
            };
        }

        // 5. ❌ NO CONFIDENT PREDICTION
        console.log("❌ NO CONFIDENT PREDICTION");
        return { category: null, confidence: 0, source: "no_suggestion" };

    } catch (error) {
        console.error("❌ PREDICT CATEGORY CRITICAL ERROR:", error);
        return { category: null, confidence: 0, source: "error" };
    }
}

// 關鍵字匹配函數
function keywordMatch(payee) {
    let bestTag = null;
    let bestConfidence = 0;

    for (const tag of DEFAULT_TAGS) {
        for (const keyword of tag.keywords) {
            if (payee.includes(keyword)) {
                const keywordLength = keyword.length;
                const payeeLength = payee.length;
                const lengthRatio = keywordLength / Math.max(payeeLength, 1);
                const confidence = 0.6 + (lengthRatio * 0.3);

                if (confidence > bestConfidence) {
                    bestConfidence = confidence;
                    bestTag = tag.name;
                }
            }
        }
    }

    return {
        category: bestTag,
        confidence: bestConfidence,
        source: "keyword_match"
    };
}

// 工具函數
function normalize(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9\u00C0-\u024F\u4e00-\u9fff\s]/gi, '').trim();
}

// 常見品牌詞
const COMMON_BRANDS = [
    'starbucks', 'mcdonald', 'kfc', 'grab', 'uber', 'lazada', 'shopee',
    'tesco', 'giant', 'guardian', 'watsons', 'shell', 'petronas'
];

export { DEFAULT_TAGS, THRESHOLDS };