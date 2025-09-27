const express = require("express");
const { createServer } = require("http");
const { WebSocketServer } = require("ws");
const cors = require("cors");
const path = require("path");

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Setup
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Portfolio System Integration
class PortfolioManager {
    constructor(initialBalance = 10000) {
        this.startingBalance = initialBalance;
        this.currentBalance = initialBalance;
        this.portfolioHistory = [];
        this.trades = [];
        this.positions = {
            BNB: 0,
            CAKE: 0,
            BTCB: 0,
            BUSD: initialBalance * 0.6, // 60% in Stablecoin
            USDT: initialBalance * 0.4, // 40% in Stablecoin
        };
        this.totalPortfolioValue = initialBalance;
        this.dailyReturns = [];
        this.riskMetrics = {};

        this.portfolioHistory.push({
            timestamp: Date.now(),
            totalValue: this.totalPortfolioValue,
            balance: this.currentBalance,
            positions: { ...this.positions },
            dailyReturn: 0,
        });

        console.log(
            `💰 Portfolio initialized with $${initialBalance.toLocaleString()}`,
        );
    }

    // Ersetze die executeTrade Methode in der PortfolioManager Klasse (server.js)

    executeTrade(tradeData) {
        const {
            pair,
            buyExchange,
            sellExchange,
            profit,
            tradeAmount = 1000,
            success,
            realPrice,
            source,
        } = tradeData;

        // Sichere Werte-Validierung
        const safeProfit = isNaN(profit) ? 0 : profit || 0;
        const safeTradeAmount = isNaN(tradeAmount) ? 1000 : tradeAmount || 1000;
        const safeRealPrice = isNaN(parseFloat(realPrice))
            ? 280
            : parseFloat(realPrice);

        console.log("🔍 ExecuteTrade Debug:", {
            safeProfit,
            safeTradeAmount,
            safeRealPrice,
            success,
            pair: pair || "BNB/BUSD",
        });

        if (!success) {
            const gasCost = 2 + Math.random() * 3;
            this.currentBalance = Math.max(0, this.currentBalance - gasCost);

            this.recordTrade({
                ...tradeData,
                gasCost,
                netProfit: -gasCost,
                portfolioImpact: -gasCost,
                timestamp: Date.now(),
                success: false,
            });

            this.updatePortfolioValue();
            return {
                success: false,
                netProfit: -gasCost,
                gasCost: gasCost,
            };
        }

        // Erfolgreicher Trade
        const [baseToken, quoteToken] = (pair || "BNB/BUSD").split("/");
        const tradingFee = safeTradeAmount * 0.001; // 0.1% Trading Fee
        const gasCost = 1.5 + Math.random() * 2;
        const netProfit = safeProfit - tradingFee - gasCost;

        // Portfolio-Update
        this.currentBalance += netProfit;

        // Position-Update (simuliert kleine Holdings)
        if (baseToken && baseToken !== "BUSD" && baseToken !== "USDT") {
            const tokenAmount = (safeTradeAmount * 0.01) / safeRealPrice; // 1% wird als Position gehalten
            this.positions[baseToken] =
                (this.positions[baseToken] || 0) + tokenAmount;

            // Entsprechend weniger BUSD (aber nicht unter 0)
            if (
                this.positions["BUSD"] &&
                this.positions["BUSD"] > safeTradeAmount * 0.01
            ) {
                this.positions["BUSD"] -= safeTradeAmount * 0.01;
            }
        }

        const tradeRecord = {
            id: `trade_${Date.now()}`,
            timestamp: Date.now(),
            pair: pair || "BNB/BUSD",
            buyExchange: buyExchange || "PancakeSwap",
            sellExchange: sellExchange || "Biswap",
            tradeAmount: safeTradeAmount,
            realPrice: safeRealPrice,
            grossProfit: safeProfit,
            netProfit: netProfit,
            gasCost: gasCost,
            tradingFees: tradingFee,
            portfolioValueBefore: this.totalPortfolioValue,
            portfolioValueAfter: 0, // Wird nach Update gesetzt
            portfolioImpact: netProfit,
            source: source || "Simulation",
            success: true,
        };

        this.recordTrade(tradeRecord);
        this.updatePortfolioValue();

        // Portfolio-Wert nach Trade setzen
        tradeRecord.portfolioValueAfter = this.totalPortfolioValue;

        console.log(
            `💰 Trade: ${pair || "BNB/BUSD"} | Net: $${netProfit.toFixed(2)} | Portfolio: $${this.totalPortfolioValue.toLocaleString()}`,
        );
        return tradeRecord;
    }

    recordTrade(tradeRecord) {
        this.trades.push(tradeRecord);
        if (this.trades.length > 500) {
            this.trades = this.trades.slice(-500);
        }
    }

    updatePortfolioValue() {
        // Portfolio-Wert neu berechnen (vereinfacht)
        this.totalPortfolioValue = this.currentBalance;

        // Token-Positionen hinzuaddieren (mit aktuellen Preisen würde das realistischer)
        Object.keys(this.positions).forEach((token) => {
            if (token === "BUSD" || token === "USDT") {
                this.totalPortfolioValue += this.positions[token];
            } else if (this.positions[token] > 0) {
                // Vereinfachte Bewertung mit Standardpreisen
                const prices = { BNB: 280, CAKE: 2.1, BTCB: 43000 };
                this.totalPortfolioValue +=
                    this.positions[token] * (prices[token] || 0);
            }
        });

        this.updatePortfolioHistory();
        this.calculateMetrics();
    }

    updatePortfolioHistory() {
        const now = Date.now();
        const lastEntry =
            this.portfolioHistory[this.portfolioHistory.length - 1];
        const timeDiff = now - lastEntry.timestamp;

        // Alle 5 Minuten oder bei größeren Änderungen
        if (
            timeDiff > 300000 ||
            Math.abs(this.totalPortfolioValue - lastEntry.totalValue) > 50
        ) {
            const dailyReturn =
                ((this.totalPortfolioValue - lastEntry.totalValue) /
                    lastEntry.totalValue) *
                100;

            this.portfolioHistory.push({
                timestamp: now,
                totalValue: this.totalPortfolioValue,
                balance: this.currentBalance,
                positions: { ...this.positions },
                dailyReturn,
                tradesCount: this.trades.length,
            });

            this.dailyReturns.push(dailyReturn);

            if (this.portfolioHistory.length > 200) {
                this.portfolioHistory = this.portfolioHistory.slice(-200);
            }
        }
    }

    calculateMetrics() {
        if (this.dailyReturns.length < 2) return;

        const returns = this.dailyReturns;
        const totalReturn =
            ((this.totalPortfolioValue - this.startingBalance) /
                this.startingBalance) *
            100;

        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance =
            returns.reduce(
                (sum, ret) => sum + Math.pow(ret - avgReturn, 2),
                0,
            ) / returns.length;
        const volatility = Math.sqrt(variance);
        const sharpeRatio = volatility > 0 ? (avgReturn - 0.1) / volatility : 0;

        let peak = this.startingBalance;
        let maxDrawdown = 0;

        this.portfolioHistory.forEach((entry) => {
            if (entry.totalValue > peak) peak = entry.totalValue;
            const drawdown = ((peak - entry.totalValue) / peak) * 100;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        });

        const successfulTrades = this.trades.filter(
            (t) => t.success && t.netProfit > 0,
        ).length;
        const winRate =
            this.trades.length > 0
                ? (successfulTrades / this.trades.length) * 100
                : 0;

        const profits = this.trades.map((t) => t.netProfit || 0);
        const bestTrade = profits.length > 0 ? Math.max(...profits) : 0;
        const worstTrade = profits.length > 0 ? Math.min(...profits) : 0;

        this.riskMetrics = {
            totalReturn: totalReturn,
            avgDailyReturn: avgReturn,
            volatility: volatility,
            sharpeRatio: sharpeRatio,
            maxDrawdown: maxDrawdown,
            winRate: winRate,
            bestTrade: bestTrade,
            worstTrade: worstTrade,
            totalTrades: this.trades.length,
        };
    }

    getPortfolioStatus() {
        const totalReturn =
            ((this.totalPortfolioValue - this.startingBalance) /
                this.startingBalance) *
            100;
        const todayReturn =
            this.dailyReturns.length > 0
                ? this.dailyReturns[this.dailyReturns.length - 1]
                : 0;

        return {
            startingBalance: this.startingBalance,
            currentBalance: this.currentBalance,
            totalPortfolioValue: this.totalPortfolioValue,
            totalReturn: totalReturn,
            todayReturn: todayReturn,
            positions: this.positions,
            metrics: this.riskMetrics,
            recentTrades: this.trades.slice(-15).reverse(),
            portfolioHistory: this.portfolioHistory.slice(-50),
            lastUpdated: Date.now(),
        };
    }

    reset(newBalance = 10000) {
        this.startingBalance = newBalance;
        this.currentBalance = newBalance;
        this.totalPortfolioValue = newBalance;
        this.trades = [];
        this.portfolioHistory = [
            {
                timestamp: Date.now(),
                totalValue: newBalance,
                balance: newBalance,
                positions: {
                    BNB: 0,
                    CAKE: 0,
                    BTCB: 0,
                    BUSD: newBalance * 0.6,
                    USDT: newBalance * 0.4,
                },
                dailyReturn: 0,
            },
        ];
        this.positions = {
            BNB: 0,
            CAKE: 0,
            BTCB: 0,
            BUSD: newBalance * 0.6,
            USDT: newBalance * 0.4,
        };
        this.dailyReturns = [];
        this.riskMetrics = {};

        console.log(`🔄 Portfolio reset to ${newBalance.toLocaleString()}`);
    }
}

/// Korrigierte Market Data Provider für server.js
// Ersetze die RealMarketDataProvider Klasse komplett

class RealMarketDataProvider {
    constructor() {
        this.exchanges = {
            coingecko: "https://api.coingecko.com/api/v3",
        };

        this.supportedPairs = [
            { symbol: "BNB", name: "Binance Coin", id: "binancecoin" },
            { symbol: "CAKE", name: "PancakeSwap", id: "pancakeswap-token" },
            { symbol: "BUSD", name: "Binance USD", id: "binance-usd" },
            { symbol: "USDT", name: "Tether", id: "tether" },
            { symbol: "BTCB", name: "Bitcoin BEP20", id: "bitcoin" },
        ];

        this.priceCache = {};
        this.lastUpdate = 0;
        this.fallbackPrices = {
            BNB: { price: 280, change24h: 0, source: "Fallback" },
            CAKE: { price: 2.1, change24h: 0, source: "Fallback" },
            BTCB: { price: 43000, change24h: 0, source: "Fallback" },
            BUSD: { price: 1.0, change24h: 0, source: "Fallback" },
            USDT: { price: 1.0, change24h: 0, source: "Fallback" },
        };
    }

    async getAllPrices() {
        try {
            const now = Date.now();

            // Cache für 30 Sekunden
            if (
                now - this.lastUpdate < 30000 &&
                Object.keys(this.priceCache).length > 0
            ) {
                return this.generateArbitrageData(this.priceCache);
            }

            // Versuche echte Preise zu holen
            try {
                const realPrices = await this.getCoinGeckoPrice();
                if (Object.keys(realPrices).length > 0) {
                    this.priceCache = realPrices;
                    this.lastUpdate = now;
                    console.log(
                        "📊 Real market data updated:",
                        new Date().toLocaleTimeString(),
                    );
                    return this.generateArbitrageData(realPrices);
                }
            } catch (apiError) {
                console.warn(
                    "⚠️ API failed, using fallback:",
                    apiError.message,
                );
            }

            // Fallback zu realistischer Simulation
            const fallbackData = this.generateRealisticFallback();
            this.priceCache = fallbackData;
            this.lastUpdate = now;

            return this.generateArbitrageData(fallbackData);
        } catch (error) {
            console.error("❌ Complete market data failure:", error);
            // Als letzter Fallback - statische Daten
            return this.generateArbitrageData(this.fallbackPrices);
        }
    }

    async getCoinGeckoPrice() {
        return new Promise(async (resolve, reject) => {
            try {
                // Versuche verschiedene Fetch-Methoden
                let fetch;

                // Node.js 18+ hat fetch eingebaut
                if (typeof globalThis.fetch === "function") {
                    fetch = globalThis.fetch;
                } else {
                    // Versuche node-fetch zu importieren
                    try {
                        const nodeFetch = require("node-fetch");
                        fetch = nodeFetch.default || nodeFetch;
                    } catch (e) {
                        // Falls node-fetch nicht installiert ist
                        console.warn("⚠️ No fetch available, using fallback");
                        return resolve(this.generateRealisticFallback());
                    }
                }

                const coinIds = this.supportedPairs.map((p) => p.id).join(",");
                const url = `${this.exchanges.coingecko}/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true`;

                // Timeout für API-Call
                const timeoutPromise = new Promise((_, timeoutReject) => {
                    setTimeout(
                        () => timeoutReject(new Error("API timeout")),
                        10000,
                    );
                });

                const fetchPromise = fetch(url).then((response) => {
                    if (!response.ok) {
                        throw new Error(
                            `HTTP ${response.status}: ${response.statusText}`,
                        );
                    }
                    return response.json();
                });

                const data = await Promise.race([fetchPromise, timeoutPromise]);

                const prices = {};
                this.supportedPairs.forEach((pair) => {
                    if (
                        data[pair.id] &&
                        typeof data[pair.id].usd === "number"
                    ) {
                        prices[pair.symbol] = {
                            price: data[pair.id].usd,
                            change24h: data[pair.id].usd_24h_change || 0,
                            source: "CoinGecko Live",
                            timestamp: Date.now(),
                        };
                    }
                });

                // Prüfe ob wir genug Daten haben
                if (Object.keys(prices).length >= 2) {
                    resolve(prices);
                } else {
                    throw new Error("Insufficient price data received");
                }
            } catch (error) {
                console.warn("⚠️ CoinGecko API error:", error.message);
                resolve(this.generateRealisticFallback());
            }
        });
    }

    generateArbitrageData(realPrices) {
        const exchanges = ["PancakeSwap", "Biswap", "ApeSwap", "BabySwap"];
        const opportunities = [];

        // Sicherstellen dass wir Preise haben
        const workingPrices =
            Object.keys(realPrices).length > 0
                ? realPrices
                : this.fallbackPrices;

        Object.keys(workingPrices).forEach((baseToken) => {
            const tokenData = workingPrices[baseToken];
            if (!tokenData || typeof tokenData.price !== "number") return;

            const basePrice = tokenData.price;
            const change24h = tokenData.change24h || 0;

            ["BUSD", "USDT"].forEach((quoteToken) => {
                if (baseToken === quoteToken) return;

                const pair = `${baseToken}/${quoteToken}`;

                for (let i = 0; i < exchanges.length - 1; i++) {
                    for (let j = i + 1; j < exchanges.length; j++) {
                        const buyExchange = exchanges[i];
                        const sellExchange = exchanges[j];

                        const spreadPercent = 0.003 + Math.random() * 0.008; // 0.3% - 1.1%
                        const buyPrice = basePrice * (1 - spreadPercent / 2);
                        const sellPrice = basePrice * (1 + spreadPercent / 2);

                        if (spreadPercent > 0.004) {
                            // Nur profitable zeigen
                            opportunities.push({
                                pair,
                                buyAt: buyExchange,
                                sellAt: sellExchange,
                                buyPrice: buyPrice.toFixed(4),
                                sellPrice: sellPrice.toFixed(4),
                                realPrice: `$${basePrice.toFixed(4)}`,
                                profit:
                                    (spreadPercent * 100 - 0.15).toFixed(2) +
                                    "%", // Minus Fees
                                estimatedGain:
                                    "$" +
                                    (spreadPercent * basePrice * 10).toFixed(2),
                                change24h: change24h.toFixed(2) + "%",
                                source: tokenData.source || "Unknown",
                                timestamp: Date.now(),
                                isRealData: tokenData.source !== "Fallback",
                            });
                        }
                    }
                }
            });
        });

        return opportunities
            .sort((a, b) => parseFloat(b.profit) - parseFloat(a.profit))
            .slice(0, 8);
    }

    generateRealisticFallback() {
        console.log("📊 Using realistic fallback market simulation...");

        // Basis-Preise mit realistischen Schwankungen
        const baseTime = Date.now();
        const timeVariation = Math.sin(baseTime / 600000) * 0.1; // 10-Minuten Zyklus

        return {
            BNB: {
                price: 280 + (Math.random() - 0.5) * 20 + timeVariation * 10,
                change24h: (Math.random() - 0.5) * 10,
                source: "Realistic Simulation",
                timestamp: baseTime,
            },
            CAKE: {
                price: 2.1 + (Math.random() - 0.5) * 0.4 + timeVariation * 0.2,
                change24h: (Math.random() - 0.5) * 15,
                source: "Realistic Simulation",
                timestamp: baseTime,
            },
            BTCB: {
                price:
                    43000 + (Math.random() - 0.5) * 2000 + timeVariation * 1000,
                change24h: (Math.random() - 0.5) * 5,
                source: "Realistic Simulation",
                timestamp: baseTime,
            },
            BUSD: {
                price: 1.0 + (Math.random() - 0.5) * 0.01,
                change24h: (Math.random() - 0.5) * 0.5,
                source: "Stablecoin",
                timestamp: baseTime,
            },
            USDT: {
                price: 1.0 + (Math.random() - 0.5) * 0.01,
                change24h: (Math.random() - 0.5) * 0.5,
                source: "Stablecoin",
                timestamp: baseTime,
            },
        };
    }

    getMarketSummary() {
        const workingPrices =
            Object.keys(this.priceCache).length > 0
                ? this.priceCache
                : this.fallbackPrices;

        if (Object.keys(workingPrices).length === 0) {
            return {
                status: "Loading...",
                lastUpdate: "Never",
                dataSource: "Initializing...",
            };
        }

        const sources = [
            ...new Set(
                Object.values(workingPrices).map((t) => t.source || "Unknown"),
            ),
        ];
        const prices = Object.values(workingPrices).filter(
            (t) => typeof t.change24h === "number",
        );
        const avgChange =
            prices.length > 0
                ? prices.reduce((sum, token) => sum + token.change24h, 0) /
                  prices.length
                : 0;

        const isLiveData = sources.some((s) => s.includes("Live"));
        const statusEmoji = isLiveData ? "🟢" : "🟡";

        return {
            status: `${statusEmoji} ${isLiveData ? "Live Data Connected" : "Simulation Mode"}`,
            totalTokens: Object.keys(workingPrices).length,
            avgChange24h: avgChange.toFixed(2) + "%",
            lastUpdate: new Date(this.lastUpdate).toLocaleTimeString("de-DE"),
            dataSource: sources.join(", "),
            nextUpdate:
                this.lastUpdate > 0
                    ? Math.ceil(
                          (30000 - (Date.now() - this.lastUpdate)) / 1000,
                      ) + "s"
                    : "Now",
        };
    }
}

// Bot-Status mit Portfolio
let botRunning = false;
let marketDataProvider = new RealMarketDataProvider();
let portfolioManager = new PortfolioManager(10000); // $10000 Start
let currentOpportunities = [];
let dailyTradeCount = 0;
let lastTradingDay = new Date().getDate();

// Dashboard anzeigen
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "dashboard.html"));
});

// Enhanced API Routes
app.post("/api/bot/start", async (req, res) => {
    if (botRunning) {
        return res.json({ success: false, message: "Bot läuft bereits!" });
    }

    botRunning = true;
    console.log("🚀 Starting portfolio bot with real market data...");

    try {
        currentOpportunities = await marketDataProvider.getAllPrices();
        console.log(
            `📊 Loaded ${currentOpportunities.length} real market opportunities`,
        );
    } catch (error) {
        console.error("❌ Failed to load initial market data:", error);
    }

    startPortfolioBotSimulation();

    broadcastToAll({
        type: "bot_started",
        message: "🤖 Portfolio Bot mit echten Marktdaten gestartet!",
        marketSummary: marketDataProvider.getMarketSummary(),
        portfolio: portfolioManager.getPortfolioStatus(),
    });

    res.json({ success: true, message: "Portfolio Bot gestartet!" });
});

app.post("/api/bot/stop", (req, res) => {
    botRunning = false;

    broadcastToAll({
        type: "bot_stopped",
        message: "⏸️ Portfolio Bot gestoppt",
        portfolio: portfolioManager.getPortfolioStatus(),
    });

    res.json({ success: true, message: "Portfolio Bot gestoppt!" });
});

app.post("/api/bot/reset", (req, res) => {
    const newBalance = parseFloat(req.body.balance) || 10000;
    portfolioManager.reset(newBalance);
    dailyTradeCount = 0;

    broadcastToAll({
        type: "portfolio_reset",
        message: `🔄 Portfolio auf ${newBalance.toLocaleString()} zurückgesetzt`,
        portfolio: portfolioManager.getPortfolioStatus(),
    });

    res.json({
        success: true,
        message: `Portfolio reset to ${newBalance.toLocaleString()}!`,
    });
});

app.get("/api/bot/status", (req, res) => {
    const portfolioStatus = portfolioManager.getPortfolioStatus();

    res.json({
        success: true,
        data: {
            isRunning: botRunning,
            opportunities: currentOpportunities.length,
            dailyTrades: dailyTradeCount,
            marketSummary: marketDataProvider.getMarketSummary(),
            portfolio: portfolioStatus,
        },
    });
});

// Portfolio-spezifische Routes
app.get("/api/portfolio/status", (req, res) => {
    res.json({
        success: true,
        data: portfolioManager.getPortfolioStatus(),
    });
});

app.get("/api/portfolio/report", (req, res) => {
    const status = portfolioManager.getPortfolioStatus();
    const report = {
        summary: {
            startingBalance: status.startingBalance,
            currentValue: status.totalPortfolioValue,
            totalReturn: status.totalReturn,
            totalReturnAbs: status.totalPortfolioValue - status.startingBalance,
            bestTrade: status.metrics.bestTrade || 0,
            worstTrade: status.metrics.worstTrade || 0,
            winRate: status.metrics.winRate || 0,
            totalTrades: status.metrics.totalTrades || 0,
        },
        performance: {
            sharpeRatio: status.metrics.sharpeRatio || 0,
            maxDrawdown: status.metrics.maxDrawdown || 0,
            volatility: status.metrics.volatility || 0,
            avgDailyReturn: status.metrics.avgDailyReturn || 0,
        },
        positions: status.positions,
        recentTrades: status.recentTrades,
        history: status.portfolioHistory,
    };

    res.json({ success: true, data: report });
});

// WebSocket-Verbindungen
const clients = new Set();

wss.on("connection", (ws) => {
    console.log("🔌 Portfolio Dashboard connected");
    clients.add(ws);

    ws.send(
        JSON.stringify({
            type: "welcome",
            data: {
                isRunning: botRunning,
                opportunities: currentOpportunities,
                marketSummary: marketDataProvider.getMarketSummary(),
                portfolio: portfolioManager.getPortfolioStatus(),
            },
        }),
    );

    ws.on("close", () => {
        console.log("🔌 Portfolio Dashboard disconnected");
        clients.delete(ws);
    });
});

function broadcastToAll(message) {
    clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// Enhanced Bot-Simulation mit Portfolio
function startPortfolioBotSimulation() {
    // Marktdaten alle 45 Sekunden aktualisieren
    const marketDataInterval = setInterval(async () => {
        if (!botRunning) {
            clearInterval(marketDataInterval);
            return;
        }

        try {
            console.log("🔄 Updating market data for portfolio...");
            currentOpportunities = await marketDataProvider.getAllPrices();

            broadcastToAll({
                type: "market_update",
                data: {
                    opportunities: currentOpportunities,
                    marketSummary: marketDataProvider.getMarketSummary(),
                    portfolio: portfolioManager.getPortfolioStatus(),
                },
            });
        } catch (error) {
            console.error("❌ Portfolio market update failed:", error);
        }
    }, 45000);

    // Trading-Logic alle 10 Sekunden
    const tradingInterval = setInterval(() => {
        if (!botRunning) {
            clearInterval(tradingInterval);
            return;
        }

        // Daily trade limit check
        const currentDay = new Date().getDate();
        if (currentDay !== lastTradingDay) {
            dailyTradeCount = 0;
            lastTradingDay = currentDay;
        }

        // Trade-Gelegenheit evaluieren
        if (
            currentOpportunities.length > 0 &&
            dailyTradeCount < 30 &&
            Math.random() < 0.2
        ) {
            executePortfolioTrade();
        } else {
            // Nur Opportunities senden ohne Trade
            broadcastToAll({
                type: "opportunities_scan",
                data: {
                    opportunities: currentOpportunities.slice(0, 6),
                    dailyTrades: dailyTradeCount,
                    portfolio: portfolioManager.getPortfolioStatus(),
                },
            });
        }
    }, 10000);
}

/*
// Ersetze in server.js die executePortfolioTrade Funktion

function executePortfolioTrade() {
    if (currentOpportunities.length === 0) return;

    const opportunity = currentOpportunities[0];

    // Debug-Log für Opportunity-Struktur
    console.log("🔍 Debug Opportunity:", {
        pair: opportunity.pair,
        profit: opportunity.profit,
        estimatedGain: opportunity.estimatedGain,
        buyPrice: opportunity.buyPrice,
        sellPrice: opportunity.sellPrice,
    });

    // Sichere Profit-Extraktion
    let profitPercent = 0;
    if (typeof opportunity.profit === "string") {
        profitPercent = parseFloat(opportunity.profit.replace("%", "")) || 0;
    } else if (typeof opportunity.profit === "number") {
        profitPercent = opportunity.profit;
    }

    // Nur profitable Trades (mit Sicherheitsprüfung)
    if (profitPercent < 0.4 || isNaN(profitPercent)) {
        console.log(
            `⚠️ Trade skipped - insufficient profit: ${profitPercent}%`,
        );
        return;
    }

    // Trade-Größe basierend auf Portfolio (mit Fallback)
    const portfolioValue = portfolioManager.totalPortfolioValue || 10000;
    const maxTradeSize = Math.min(3000, portfolioValue * 0.08); // Max 8% des Portfolios
    const tradeSize = Math.max(500, 800 + Math.random() * (maxTradeSize - 800)); // Min $500

    // Sichere Profit-Berechnung
    let estimatedProfitValue = 0;
    if (typeof opportunity.estimatedGain === "string") {
        estimatedProfitValue =
            parseFloat(opportunity.estimatedGain.replace("$", "")) || 0;
    } else if (typeof opportunity.estimatedGain === "number") {
        estimatedProfitValue = opportunity.estimatedGain;
    }

    // Fallback Profit-Berechnung basierend auf Prozent
    if (estimatedProfitValue <= 0 || isNaN(estimatedProfitValue)) {
        // Berechne Profit basierend auf Trade-Größe und Prozent
        estimatedProfitValue = (tradeSize * profitPercent) / 100;
        console.log(
            `🔧 Fallback profit calculation: ${profitPercent}% of $${tradeSize} = $${estimatedProfitValue.toFixed(2)}`,
        );
    }

    const success = Math.random() > 0.04; // 96% Erfolgsquote
    const actualProfit = success
        ? estimatedProfitValue *
          (tradeSize / 1000) *
          (0.92 + Math.random() * 0.16)
        : 0;

    // Sichere realPrice-Extraktion
    let realPriceValue = 280; // Fallback für BNB
    if (typeof opportunity.realPrice === "string") {
        realPriceValue =
            parseFloat(opportunity.realPrice.replace("$", "")) || 280;
    } else if (typeof opportunity.realPrice === "number") {
        realPriceValue = opportunity.realPrice;
    }

    // Token-basierte Fallback-Preise
    const tokenPrices = {
        BNB: 280,
        CAKE: 2.1,
        BTCB: 43000,
        BUSD: 1.0,
        USDT: 1.0,
    };

    const baseToken = opportunity.pair ? opportunity.pair.split("/")[0] : "BNB";
    if (realPriceValue <= 0 || isNaN(realPriceValue)) {
        realPriceValue = tokenPrices[baseToken] || 280;
    }

    const tradeData = {
        pair: opportunity.pair || "BNB/BUSD",
        buyExchange: opportunity.buyAt || "PancakeSwap",
        sellExchange: opportunity.sellAt || "Biswap",
        profit: isNaN(actualProfit) ? 0 : actualProfit,
        tradeAmount: isNaN(tradeSize) ? 1000 : tradeSize,
        success: success,
        realPrice: realPriceValue.toString(),
        source: opportunity.source || "Simulation",
    };

    // Debug-Log für Trade-Daten
    console.log("🔍 Debug Trade Data:", {
        estimatedProfitValue: estimatedProfitValue,
        actualProfit: actualProfit,
        tradeSize: tradeSize,
        realPriceValue: realPriceValue,
        success: success,
    });

    const tradeResult = portfolioManager.executeTrade(tradeData);

    if (tradeResult) {
        dailyTradeCount++;

        console.log(
            `💰 PORTFOLIO TRADE: ${tradeData.pair} | Size: $${tradeData.tradeAmount.toFixed(0)} | Profit: $${tradeData.profit.toFixed(2)} | Portfolio: $${portfolioManager.totalPortfolioValue.toLocaleString()}`,
        );

        broadcastToAll({
            type: "portfolio_trade_executed",
            data: {
                trade: tradeResult,
                portfolio: portfolioManager.getPortfolioStatus(),
                dailyTrades: dailyTradeCount,
            },
        });
    } else {
        console.log("❌ Portfolio trade execution failed");
    }
}
*/

// Ersetze die executePortfolioTrade Funktion in server.js mit dieser realistischen Version

function executePortfolioTrade() {
    if (currentOpportunities.length === 0) return;

    const opportunity = currentOpportunities[0];
    const portfolioValue = portfolioManager.totalPortfolioValue || 10000;

    // Sichere Profit-Extraktion
    let profitPercent = 0;
    if (typeof opportunity.profit === 'string') {
        profitPercent = parseFloat(opportunity.profit.replace('%', '')) || 0;
    } else if (typeof opportunity.profit === 'number') {
        profitPercent = opportunity.profit;
    }

    // Realistische Mindest-Profitabilität basierend auf Portfolio-Größe
    const minProfitThreshold = portfolioValue < 10000 ? 0.6 : 
                              portfolioValue < 50000 ? 0.4 : 
                              portfolioValue < 100000 ? 0.3 : 0.25; // Größere Portfolios können kleinere Margins nehmen

    if (profitPercent < minProfitThreshold || isNaN(profitPercent)) {
        console.log(`⚠️ Trade skipped - profit ${profitPercent}% below threshold ${minProfitThreshold}%`);
        return;
    }

    // Portfolio-proportionale Trade-Größe
    const portfolioRiskPercent = 0.02 + Math.random() * 0.06; // 2-8% des Portfolios pro Trade
    const baseTradeSize = portfolioValue * portfolioRiskPercent;

    // Trade-Größe mit realistischen Limits
    const minTradeSize = Math.max(100, portfolioValue * 0.005); // Min 0.5% oder $100
    const maxTradeSize = Math.min(portfolioValue * 0.15, baseTradeSize * 2); // Max 15% des Portfolios

    const tradeSize = Math.max(minTradeSize, Math.min(maxTradeSize, baseTradeSize));

    console.log(`📊 Portfolio: $${portfolioValue.toLocaleString()} | Risk: ${(portfolioRiskPercent*100).toFixed(1)}% | Trade Size: $${tradeSize.toFixed(0)}`);

    // Realistische Profit-Berechnung
    const spreadBasisPoints = profitPercent * 100; // Convert % to basis points
    const grossProfitExpected = (tradeSize * profitPercent) / 100;

    // Kosten realistisch berechnen
    const tradingFeeBps = 10; // 0.10% Trading Fee
    const slippageBps = Math.min(20, Math.max(5, spreadBasisPoints * 0.3)); // 0.05-0.20% Slippage
    const gasCostUSD = 2 + Math.random() * 4; // $2-6 Gas

    const tradingFee = (tradeSize * tradingFeeBps) / 10000;
    const slippageCost = (tradeSize * slippageBps) / 10000;
    const totalCosts = tradingFee + slippageCost + gasCostUSD;

    const netProfitExpected = grossProfitExpected - totalCosts;

    // Trade nur ausführen wenn profitable nach Kosten
    if (netProfitExpected <= 0) {
        console.log(`⚠️ Trade skipped - net profit ${netProfitExpected.toFixed(2)} not profitable after costs`);
        return;
    }

    // Erfolgswahrscheinlichkeit basierend auf Spread-Größe und Portfolio-Größe
    const baseSuccessRate = 0.94; // 94% base success rate
    const spreadBonus = Math.min(0.04, profitPercent * 0.01); // Higher profit = higher success rate
    const portfolioBonus = Math.min(0.02, Math.log10(portfolioValue / 1000) * 0.01); // Larger portfolio = better execution

    const successRate = Math.min(0.98, baseSuccessRate + spreadBonus + portfolioBonus);
    const success = Math.random() < successRate;

    // Tatsächlicher Profit mit Varianz
    const profitVariance = 0.85 + Math.random() * 0.3; // ±15% Varianz
    const actualProfit = success ? netProfitExpected * profitVariance : 0;

    // Sichere realPrice-Extraktion
    let realPriceValue = 280; // Fallback für BNB
    if (typeof opportunity.realPrice === 'string') {
        realPriceValue = parseFloat(opportunity.realPrice.replace('$', '')) || 280;
    }

    const tokenPrices = { 'BNB': 280, 'CAKE': 2.1, 'BTCB': 43000, 'BUSD': 1.0, 'USDT': 1.0 };
    const baseToken = opportunity.pair ? opportunity.pair.split('/')[0] : 'BNB';
    if (realPriceValue <= 0 || isNaN(realPriceValue)) {
        realPriceValue = tokenPrices[baseToken] || 280;
    }

    const tradeData = {
        pair: opportunity.pair || 'BNB/BUSD',
        buyExchange: opportunity.buyAt || 'PancakeSwap',
        sellExchange: opportunity.sellAt || 'Biswap',
        profit: isNaN(actualProfit) ? 0 : actualProfit,
        tradeAmount: isNaN(tradeSize) ? 1000 : tradeSize,
        success: success,
        realPrice: realPriceValue.toString(),
        source: opportunity.source || 'Simulation',
        // Zusätzliche Metriken für Transparenz
        grossProfitExpected: grossProfitExpected,
        tradingFee: tradingFee,
        slippageCost: slippageCost,
        gasCost: gasCostUSD,
        successRate: successRate,
        portfolioRisk: portfolioRiskPercent
    };

    console.log(`💡 Trade Analysis: Gross: $${grossProfitExpected.toFixed(2)} | Costs: $${totalCosts.toFixed(2)} | Net Expected: $${netProfitExpected.toFixed(2)} | Actual: $${actualProfit.toFixed(2)}`);

    const tradeResult = portfolioManager.executeTrade(tradeData);

    if (tradeResult) {
        dailyTradeCount++;

        // Portfolio Return Rate berechnen
        const portfolioImpact = (actualProfit / portfolioValue) * 100;

        console.log(`💰 PORTFOLIO TRADE: ${tradeData.pair} | Size: $${tradeSize.toFixed(0)} (${(portfolioRiskPercent*100).toFixed(1)}%) | Profit: $${actualProfit.toFixed(2)} (${portfolioImpact.toFixed(3)}%) | Portfolio: $${portfolioManager.totalPortfolioValue.toLocaleString()}`);

        broadcastToAll({
            type: 'portfolio_trade_executed',
            data: {
                trade: {
                    ...tradeResult,
                    portfolioImpact: portfolioImpact,
                    portfolioRisk: portfolioRiskPercent,
                    costs: {
                        trading: tradingFee,
                        slippage: slippageCost,
                        gas: gasCostUSD,
                        total: totalCosts
                    }
                },
                portfolio: portfolioManager.getPortfolioStatus(),
                dailyTrades: dailyTradeCount,
                analytics: {
                    successRate: successRate,
                    profitMargin: profitPercent,
                    portfolioAllocation: portfolioRiskPercent
                }
            }
        });
    } else {
        console.log('❌ Portfolio trade execution failed');
    }
}

// Zusätzlich: Verbesserte Arbitrage-Opportunity Generation
// Ersetze die generateArbitrageData Methode in der RealMarketDataProvider Klasse:

function generateArbitrageData(realPrices){
    const exchanges = ['PancakeSwap', 'Biswap', 'ApeSwap', 'BabySwap'];
    const opportunities = [];

    // Sicherstellen dass wir Preise haben
    const workingPrices = Object.keys(realPrices).length > 0 ? realPrices : this.fallbackPrices;

    Object.keys(workingPrices).forEach(baseToken => {
        const tokenData = workingPrices[baseToken];
        if (!tokenData || typeof tokenData.price !== 'number') return;

        const basePrice = tokenData.price;
        const change24h = tokenData.change24h || 0;

        // Volatilität beeinflusst Arbitrage-Opportunities
        const volatilityMultiplier = 1 + Math.abs(change24h) * 0.01;

        ['BUSD', 'USDT'].forEach(quoteToken => {
            if (baseToken === quoteToken) return;

            const pair = `${baseToken}/${quoteToken}`;

            for (let i = 0; i < exchanges.length - 1; i++) {
                for (let j = i + 1; j < exchanges.length; j++) {
                    const buyExchange = exchanges[i];
                    const sellExchange = exchanges[j];

                    // Realistische Spreads basierend auf Token-Liquidität
                    const tokenLiquidityFactor = baseToken === 'BNB' ? 1.0 : 
                                               baseToken === 'CAKE' ? 1.2 : 
                                               baseToken === 'BTCB' ? 0.8 : 1.5;

                    const baseSpreads = {
                        'PancakeSwap-Biswap': 0.0015,     // 0.15%
                        'PancakeSwap-ApeSwap': 0.0025,    // 0.25% 
                        'PancakeSwap-BabySwap': 0.0035,   // 0.35%
                        'Biswap-ApeSwap': 0.002,          // 0.20%
                        'Biswap-BabySwap': 0.003,         // 0.30%
                        'ApeSwap-BabySwap': 0.0018        // 0.18%
                    };

                    const exchangePairKey = `${buyExchange}-${sellExchange}`;
                    const baseSpread = baseSpreads[exchangePairKey] || 0.0025;

                    const spreadPercent = (baseSpread * tokenLiquidityFactor * volatilityMultiplier) + 
                                        (Math.random() * 0.002); // +0-0.2% random variance

                    const buyPrice = basePrice * (1 - spreadPercent / 2);
                    const sellPrice = basePrice * (1 + spreadPercent / 2);

                    // Nur Opportunities mit ausreichendem Spread
                    const minSpread = 0.002; // 0.2% minimum
                    if (spreadPercent > minSpread) {
                        const netProfitPercent = (spreadPercent * 100) - 0.25; // Minus average costs

                        if (netProfitPercent > 0.1) { // Min 0.1% net profit
                            opportunities.push({
                                pair,
                                buyAt: buyExchange,
                                sellAt: sellExchange,
                                buyPrice: buyPrice.toFixed(4),
                                sellPrice: sellPrice.toFixed(4),
                                realPrice: `$${basePrice.toFixed(4)}`,
                                profit: netProfitPercent.toFixed(2) + '%',
                                estimatedGain: '$' + (spreadPercent * basePrice * 10).toFixed(2), // For 10 units
                                change24h: change24h.toFixed(2) + '%',
                                source: tokenData.source || 'Unknown',
                                timestamp: Date.now(),
                                isRealData: tokenData.source !== 'Fallback',
                                // Zusätzliche Metriken
                                spreadBps: Math.round(spreadPercent * 10000),
                                liquidityRating: tokenLiquidityFactor < 1 ? 'High' : tokenLiquidityFactor < 1.3 ? 'Medium' : 'Low',
                                volatility: Math.abs(change24h).toFixed(1) + '%'
                            });
                        }
                    }
                }
            }
        });
    });

    return opportunities.sort((a, b) => 
        parseFloat(b.profit) - parseFloat(a.profit)
    ).slice(0, 8);
}

// Marktdaten beim Start laden
(async () => {
    console.log("📊 Loading initial market data for portfolio...");
    try {
        currentOpportunities = await marketDataProvider.getAllPrices();
        console.log(
            `✅ Portfolio loaded ${currentOpportunities.length} initial opportunities`,
        );
    } catch (error) {
        console.error(
            "❌ Failed to load initial portfolio market data:",
            error,
        );
    }
})();

// Server starten
const PORT = process.env.PORT || 8080;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Portfolio Bot Server läuft auf Port ${PORT}`);
    console.log(
        `💰 Portfolio Dashboard ist bereit! Starting Balance: ${portfolioManager.startingBalance.toLocaleString()}`,
    );
    console.log(
        `📈 Nutzt Live-Daten von: CoinGecko für Portfolio-basiertes Trading`,
    );
    console.log(`🎯 Max 30 Trades/Tag | Max 8% Portfolio-Größe pro Trade`);
});
