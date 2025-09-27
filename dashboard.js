// Enhanced Dashboard mit echten Börsen-Daten

class EnhancedDashboardState {
    constructor() {
        this.isRunning = false;
        this.totalProfit = 0;
        this.trades = [];
        this.realOpportunities = [];
        this.profitHistory = [];
        this.exchangeStats = {
            PancakeSwap: 0,
            Biswap: 0,
            ApeSwap: 0,
            BabySwap: 0,
        };
        this.charts = {};
        this.marketSummary = {};
        this.lastDataUpdate = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initCharts();
        this.setupMarketDataDisplay();
    }

    setupEventListeners() {
        document.getElementById("startBtn").onclick = () => this.startBot();
        document.getElementById("stopBtn").onclick = () => this.stopBot();
        document.getElementById("resetBtn").onclick = () => this.resetStats();
    }

    // Enhanced Market Data Display
    setupMarketDataDisplay() {
        // Markt-Status-Sektion hinzufügen (falls nicht vorhanden)
        if (!document.getElementById("marketStatus")) {
            const marketStatusHTML = `
                            <div id="marketStatus" class="market-status-card">
                                <div class="market-status-title">📊 Live Marktdaten</div>
                                <div class="market-status-grid">
                                    <div class="market-stat">
                                        <div class="market-stat-label">Status</div>
                                        <div id="marketStatusValue" class="market-stat-value">Loading...</div>
                                    </div>
                                    <div class="market-stat">
                                        <div class="market-stat-label">Datenquelle</div>
                                        <div id="marketSourceValue" class="market-stat-value">-</div>
                                    </div>
                                    <div class="market-stat">
                                        <div class="market-stat-label">Letztes Update</div>
                                        <div id="marketUpdateValue" class="market-stat-value">-</div>
                                    </div>
                                    <div class="market-stat">
                                        <div class="market-stat-label">Avg. 24h Change</div>
                                        <div id="marketChangeValue" class="market-stat-value">-</div>
                                    </div>
                                </div>
                            </div>
                        `;

            // Nach dem Header einfügen
            const header = document.querySelector(".header");
            header.insertAdjacentHTML("afterend", marketStatusHTML);
        }
    }

    updateMarketStatus(summary) {
        this.marketSummary = summary;

        if (document.getElementById("marketStatusValue")) {
            document.getElementById("marketStatusValue").textContent =
                summary.status || "Loading...";
            document.getElementById("marketSourceValue").textContent =
                summary.dataSource || "-";
            document.getElementById("marketUpdateValue").textContent =
                summary.lastUpdate || "-";

            const changeElement = document.getElementById("marketChangeValue");
            if (summary.avgChange24h) {
                changeElement.textContent = summary.avgChange24h;
                const changeValue = parseFloat(summary.avgChange24h);
                changeElement.className =
                    "market-stat-value " +
                    (changeValue >= 0 ? "positive" : "negative");
            }
        }

        this.lastDataUpdate = new Date().toLocaleTimeString();
    }

    updateBotStatus() {
        const indicator = document.getElementById("statusIndicator");
        const statusText = document.getElementById("statusText");

        if (this.isRunning) {
            indicator.className = "status-indicator status-active";
            statusText.textContent = "Bot Running (Live Data)";
        } else {
            indicator.className = "status-indicator status-inactive";
            statusText.textContent = "Bot Stopped";
        }
    }

    updateRealOpportunities(opportunities) {
        this.realOpportunities = opportunities;
        const container = document.getElementById("opportunitiesList");

        if (!opportunities || opportunities.length === 0) {
            container.innerHTML = `
                            <div class="opportunity-item">
                                <div style="text-align: center; opacity: 0.7;">
                                    🔍 Scanning real markets for arbitrage opportunities...
                                </div>
                            </div>
                        `;
            return;
        }

        container.innerHTML = opportunities
            .slice(0, 6)
            .map(
                (opp) => `
                        <div class="opportunity-item ${opp.isRealData ? "real-data" : ""}">
                            <div class="opportunity-header">
                                <div class="opportunity-pair">
                                    ${opp.pair} 
                                    ${opp.isRealData ? '<span class="real-badge">LIVE</span>' : ""}
                                </div>
                                <div class="opportunity-profit">${opp.profit}</div>
                            </div>
                            <div class="opportunity-details">
                                <div>Buy: ${opp.buyAt} @ $${opp.buyPrice}</div>
                                <div>Sell: ${opp.sellAt} @ $${opp.sellPrice}</div>
                                <div>Market: ${opp.realPrice || "N/A"}</div>
                                <div>24h: ${opp.change24h || "N/A"}</div>
                                <div>Est. Profit: ${opp.estimatedGain}</div>
                                <div class="data-source">📡 ${opp.source || "Unknown"}</div>
                            </div>
                        </div>
                    `,
            )
            .join("");
    }

    handleRealTradeExecution(tradeData) {
        const trade = {
            ...tradeData,
            timestamp: Date.now(),
        };

        this.trades.push(trade);
        this.totalProfit = tradeData.stats
            ? tradeData.stats.totalProfit
            : this.totalProfit + trade.profit;

        // Profit-Historie für Charts aktualisieren
        this.profitHistory.push({
            time: trade.timestamp
                ? new Date(trade.timestamp).toLocaleTimeString()
                : new Date().toLocaleTimeString(),
            profit: this.totalProfit,
        });

        // Nur letzten 30 Einträge behalten
        if (this.profitHistory.length > 30) {
            this.profitHistory = this.profitHistory.slice(-30);
        }

        // Exchange-Statistiken aktualisieren
        if (
            trade.success &&
            this.exchangeStats[trade.buyExchange] !== undefined
        ) {
            this.exchangeStats[trade.buyExchange]++;
        }

        // Log-Eintrag hinzufügen
        const logMessage = trade.success
            ? `💰 LIVE Trade: ${trade.pair} | Buy: ${trade.buyExchange} @ $${trade.buyPrice} | Sell: ${trade.sellExchange} @ $${trade.sellPrice} | Profit: $${trade.profit.toFixed(2)} | ${trade.executionTime} | 📡 ${trade.dataSource}`
            : `❌ Trade Failed: ${trade.pair} | ${trade.buyExchange} → ${trade.sellExchange}`;

        this.addLogEntry(logMessage, trade.success ? "success" : "error");

        // Stats und Charts aktualisieren
        this.updateStats();
        this.updateCharts();

        // Sound-Benachrichtigung (optional)
        if (trade.success && trade.profit > 20) {
            this.playNotificationSound();
        }
    }

    updateStats() {
        const successfulTrades = this.trades.filter((t) => t.success);
        const realDataTrades = this.trades.filter((t) => t.isRealData);
        const successRate = this.trades.length
            ? (successfulTrades.length / this.trades.length) * 100
            : 0;
        const avgExecutionTime = this.trades.length
            ? this.trades.reduce(
                  (sum, t) => sum + parseFloat(t.executionTime || 0),
                  0,
              ) / this.trades.length
            : 0;

        document.getElementById("totalProfit").textContent =
            `$${this.totalProfit.toFixed(2)}`;
        document.getElementById("successRate").textContent =
            `${successRate.toFixed(1)}%`;
        document.getElementById("avgExecutionTime").textContent =
            `${avgExecutionTime.toFixed(0)}ms`;
        document.getElementById("activePairs").textContent =
            this.realOpportunities.length || "4";

        // Update change indicators
        const totalTrades = this.trades.length;
        document.getElementById("successChange").textContent =
            `📊 ${totalTrades} trades (${realDataTrades.length} live data)`;
        document.getElementById("executionChange").textContent = this.isRunning
            ? "⚡ Real-time + Live Data"
            : "⏸️ Stopped";

        const profitChange = document.getElementById("profitChange");
        if (this.totalProfit > 0) {
            profitChange.className = "stat-change change-positive";
            profitChange.textContent = `↗️ +${((this.totalProfit / 1000) * 100).toFixed(2)}%`;
        } else {
            profitChange.className = "stat-change";
            profitChange.textContent = "📊 Waiting for trades";
        }
    }

    addLogEntry(message, type = "info") {
        const logContainer = document.getElementById("tradeLog");
        const entry = document.createElement("div");
        entry.className = `log-entry log-${type} ${type === "success" && message.includes("LIVE") ? "log-live-trade" : ""}`;
        entry.innerHTML = `
                        <div class="log-time">${new Date().toLocaleTimeString("de-DE")}</div>
                        <div>${message}</div>
                    `;

        logContainer.insertBefore(entry, logContainer.firstChild);

        // Nur letzten 25 Einträge behalten
        const entries = logContainer.querySelectorAll(".log-entry");
        if (entries.length > 25) {
            entries[entries.length - 1].remove();
        }
    }

    initCharts() {
        // Profit Timeline Chart mit verbesserter Live-Data-Darstellung
        const profitCtx = document.getElementById("profitChart");
        if (profitCtx) {
            this.charts.profit = new Chart(profitCtx, {
                type: "line",
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: "Live Profit ($)",
                            data: [],
                            borderColor: "#00ff88",
                            backgroundColor: "rgba(0, 255, 136, 0.1)",
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 4,
                            pointBackgroundColor: "#00ff88",
                            pointBorderColor: "#ffffff",
                            pointBorderWidth: 2,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: "#ffffff",
                                font: { size: 12 },
                            },
                        },
                        tooltip: {
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            titleColor: "#ffffff",
                            bodyColor: "#ffffff",
                            borderColor: "#00ff88",
                            borderWidth: 1,
                            callbacks: {
                                label: function (context) {
                                    return `Profit: $${context.parsed.y.toFixed(2)}`;
                                },
                            },
                        },
                    },
                    scales: {
                        x: {
                            ticks: {
                                color: "#ffffff",
                                maxTicksLimit: 10,
                                font: { size: 10 },
                            },
                            grid: { color: "rgba(255, 255, 255, 0.1)" },
                        },
                        y: {
                            ticks: {
                                color: "#ffffff",
                                font: { size: 10 },
                                callback: function (value) {
                                    return "$" + value.toFixed(0);
                                },
                            },
                            grid: { color: "rgba(255, 255, 255, 0.1)" },
                        },
                    },
                    animation: {
                        duration: 750,
                    },
                },
            });
        }

        // Exchange Distribution Chart
        const exchangeCtx = document.getElementById("exchangeChart");
        if (exchangeCtx) {
            this.charts.exchange = new Chart(exchangeCtx, {
                type: "doughnut",
                data: {
                    labels: ["PancakeSwap", "Biswap", "ApeSwap", "BabySwap"],
                    datasets: [
                        {
                            data: [0, 0, 0, 0],
                            backgroundColor: [
                                "#4facfe",
                                "#00f2fe",
                                "#00ff88",
                                "#ff6b6b",
                            ],
                            borderWidth: 0,
                            hoverBorderWidth: 3,
                            hoverBorderColor: "#ffffff",
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: "bottom",
                            labels: {
                                color: "#ffffff",
                                font: { size: 11 },
                                padding: 15,
                                usePointStyle: true,
                            },
                        },
                    },
                    cutout: "60%",
                },
            });
        }
    }

    updateCharts() {
        // Update profit chart
        if (this.charts.profit && this.profitHistory.length > 0) {
            this.charts.profit.data.labels = this.profitHistory.map(
                (p) => p.time,
            );
            this.charts.profit.data.datasets[0].data = this.profitHistory.map(
                (p) => p.profit,
            );
            this.charts.profit.update("none");
        }

        // Update exchange chart
        const exchangeValues = Object.values(this.exchangeStats);
        if (this.charts.exchange && exchangeValues.some((v) => v > 0)) {
            this.charts.exchange.data.datasets[0].data = exchangeValues;
            this.charts.exchange.update("none");
        }
    }

    playNotificationSound() {
        // Einfacher Benachrichtigungston für große Gewinne
        try {
            const audioContext = new (window.AudioContext ||
                window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (e) {
            // Fallback: Browser unterstützt Web Audio API nicht
            console.log("🔊 Profit notification!");
        }
    }

    // API-Integration für Bot-Steuerung
    async startBot() {
        try {
            const response = await fetch("/api/bot/start", { method: "POST" });
            const result = await response.json();

            if (result.success) {
                this.addLogEntry(
                    "✅ Bot mit Live-Marktdaten gestartet",
                    "success",
                );
            } else {
                this.addLogEntry(
                    `❌ Bot-Start fehlgeschlagen: ${result.message}`,
                    "error",
                );
            }
        } catch (error) {
            this.addLogEntry(`❌ Verbindungsfehler: ${error.message}`, "error");
        }
    }

    async stopBot() {
        try {
            const response = await fetch("/api/bot/stop", { method: "POST" });
            const result = await response.json();

            if (result.success) {
                this.addLogEntry("⏸️ Bot gestoppt", "info");
            } else {
                this.addLogEntry(
                    `❌ Bot-Stopp fehlgeschlagen: ${result.message}`,
                    "error",
                );
            }
        } catch (error) {
            this.addLogEntry(`❌ Verbindungsfehler: ${error.message}`, "error");
        }
    }

    async resetStats() {
        try {
            const response = await fetch("/api/bot/reset", { method: "POST" });
            const result = await response.json();

            if (result.success) {
                this.totalProfit = 0;
                this.trades = [];
                this.profitHistory = [];
                this.exchangeStats = {
                    PancakeSwap: 0,
                    Biswap: 0,
                    ApeSwap: 0,
                    BabySwap: 0,
                };

                this.updateStats();
                this.updateCharts();
                this.addLogEntry("🔄 Statistiken zurückgesetzt", "info");

                const logContainer = document.getElementById("tradeLog");
                logContainer.innerHTML = `
                                <div class="log-entry log-info">
                                    <div class="log-time">${new Date().toLocaleTimeString()}</div>
                                    <div>🔄 Statistiken zurückgesetzt - bereit für Live-Trading</div>
                                </div>
                            `;
            } else {
                this.addLogEntry(
                    `❌ Reset fehlgeschlagen: ${result.message}`,
                    "error",
                );
            }
        } catch (error) {
            this.addLogEntry(`❌ Verbindungsfehler: ${error.message}`, "error");
        }
    }
}

// Enhanced WebSocket Manager für Live-Daten
class EnhancedWebSocketManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.connect();
    }

    connect() {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log("🔌 Connected to enhanced bot with live data");
            this.reconnectAttempts = 0;
            this.dashboard.addLogEntry(
                "🔌 Verbunden mit Live-Daten-Server",
                "success",
            );
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error("❌ WebSocket message parsing error:", error);
            }
        };

        this.ws.onclose = () => {
            console.log("🔌 Disconnected from bot server");
            this.dashboard.addLogEntry(
                "🔌 Verbindung verloren, versuche Reconnect...",
                "error",
            );
            this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
            console.error("❌ WebSocket error:", error);
        };
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(
                1000 * Math.pow(2, this.reconnectAttempts),
                30000,
            );

            setTimeout(() => {
                console.log(
                    `🔄 Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`,
                );
                this.connect();
            }, delay);
        } else {
            this.dashboard.addLogEntry(
                "❌ Maximale Reconnect-Versuche erreicht",
                "error",
            );
        }
    }

    handleMessage(message) {
        switch (message.type) {
            case "welcome":
                if (message.data.marketSummary) {
                    this.dashboard.updateMarketStatus(
                        message.data.marketSummary,
                    );
                }
                if (message.data.opportunities) {
                    this.dashboard.updateRealOpportunities(
                        message.data.opportunities,
                    );
                }
                this.dashboard.isRunning = message.data.isRunning;
                this.dashboard.updateBotStatus();
                break;

            case "bot_started":
                this.dashboard.isRunning = true;
                this.dashboard.updateBotStatus();
                this.dashboard.addLogEntry(message.message, "success");
                if (message.marketSummary) {
                    this.dashboard.updateMarketStatus(message.marketSummary);
                }
                break;

            case "bot_stopped":
                this.dashboard.isRunning = false;
                this.dashboard.updateBotStatus();
                this.dashboard.addLogEntry(message.message, "info");
                break;

            case "real_market_update":
                if (message.data.opportunities) {
                    this.dashboard.updateRealOpportunities(
                        message.data.opportunities,
                    );
                }
                if (message.data.marketSummary) {
                    this.dashboard.updateMarketStatus(
                        message.data.marketSummary,
                    );
                }
                this.dashboard.addLogEntry(
                    `📊 Marktdaten aktualisiert: ${message.data.opportunities.length} Opportunities | ${message.data.timestamp}`,
                    "info",
                );
                break;

            case "real_trade_executed":
                this.dashboard.handleRealTradeExecution(message.data);
                break;

            case "opportunities_scan":
                if (message.data.opportunities) {
                    this.dashboard.updateRealOpportunities(
                        message.data.opportunities,
                    );
                }
                break;

            case "trade_failed":
                this.dashboard.addLogEntry(
                    `❌ Trade fehlgeschlagen: ${message.data.pair} | ${message.data.reason} | ${message.data.timestamp}`,
                    "error",
                );
                break;

            case "market_error":
                this.dashboard.addLogEntry(message.message, "error");
                break;

            case "stats_reset":
                this.dashboard.addLogEntry(message.message, "info");
                break;
        }
    }
}

// Initialize Enhanced Dashboard
document.addEventListener("DOMContentLoaded", function () {
    console.log(
        "🚀 Initializing Enhanced DeFi Arbitrage Bot Dashboard with Live Market Data...",
    );

    const dashboard = new EnhancedDashboardState();
    const wsManager = new EnhancedWebSocketManager(dashboard);

    // Global access for debugging
    window.dashboard = dashboard;
    window.wsManager = wsManager;

    console.log("✅ Enhanced Dashboard mit Live-Marktdaten initialisiert!");
    console.log("📡 Verbinde zu CoinGecko, Binance & CryptoCompare APIs...");
});
