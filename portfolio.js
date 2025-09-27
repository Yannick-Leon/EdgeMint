// Portfolio Dashboard Frontend Logic - COMPLETE VERSION

class PortfolioDashboard {
    constructor() {
        this.isRunning = false;
        this.portfolioData = {};
        this.charts = {};
        this.lastPortfolioValue = 10000;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initPortfolioCharts();
        this.loadPortfolioData();
    }

    // Füge diese Funktionen zu deiner portfolio.js hinzu
    // Am besten nach der setupEventListeners() Methode in der PortfolioDashboard Klasse

    // Enhanced Event Listeners Setup
    setupEventListeners() {
        // Bestehende Bot-Kontrollen
        document.getElementById('startBtn').onclick = () => this.startBot();
        document.getElementById('stopBtn').onclick = () => this.stopBot();
        document.getElementById('resetBtn').onclick = () => this.resetPortfolio();

        // Portfolio-spezifische Controls
        if (document.getElementById('portfolioBtn')) {
            document.getElementById('portfolioBtn').onclick = () => this.showPortfolioReport();
        }
        if (document.getElementById('modalClose')) {
            document.getElementById('modalClose').onclick = () => this.hidePortfolioReport();
        }
        if (document.getElementById('portfolioTimeframe')) {
            document.getElementById('portfolioTimeframe').onchange = (e) => this.updateTimeframe(e.target.value);
        }

        // Portfolio Input Controls
        this.setupPortfolioInputControls();

        // Modal schließen bei Klick außerhalb
        if (document.getElementById('portfolioModal')) {
            document.getElementById('portfolioModal').onclick = (e) => {
                if (e.target.id === 'portfolioModal') {
                    this.hidePortfolioReport();
                }
            };
        }
    }

    // Portfolio Input Controls Setup
    setupPortfolioInputControls() {
        const portfolioInput = document.getElementById('portfolioInput');
        const updateBtn = document.getElementById('updatePortfolioBtn');
        const quickButtons = document.querySelectorAll('.btn-quick');

        if (updateBtn) {
            updateBtn.onclick = () => this.updatePortfolioFromInput();
        }

        if (portfolioInput) {
            // Enter-Taste für Update
            portfolioInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    this.updatePortfolioFromInput();
                }
            };

            // Input-Validierung während der Eingabe
            portfolioInput.oninput = (e) => {
                this.validatePortfolioInput(e.target.value);
            };

            // Focus/Blur Effects
            portfolioInput.onfocus = () => {
                portfolioInput.parentElement.style.borderColor = '#4facfe';
            };

            portfolioInput.onblur = () => {
                portfolioInput.parentElement.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            };
        }

        // Quick Amount Buttons
        quickButtons.forEach(button => {
            button.onclick = () => {
                const amount = parseInt(button.dataset.amount);
                this.setPortfolioAmount(amount);

                // Visual Feedback
                quickButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Auto-update nach kurzer Verzögerung
                setTimeout(() => {
                    this.updatePortfolioFromInput();
                }, 300);
            };
        });
    }

    // Portfolio Input Validierung
    validatePortfolioInput(value) {
        const container = document.getElementById('portfolioInput').parentElement;
        const numValue = parseFloat(value);

        // Entferne vorherige Klassen
        container.classList.remove('error', 'success');

        if (isNaN(numValue) || numValue < 1000) {
            container.classList.add('error');
            return false;
        } else if (numValue > 1000000) {
            container.classList.add('error');
            return false;
        } else {
            container.classList.add('success');
            return true;
        }
    }

    // Portfolio Amount setzen
    setPortfolioAmount(amount) {
        const portfolioInput = document.getElementById('portfolioInput');
        if (portfolioInput) {
            portfolioInput.value = amount;
            this.validatePortfolioInput(amount);
        }
    }

    // Portfolio Update von Input
    async updatePortfolioFromInput() {
        const portfolioInput = document.getElementById('portfolioInput');
        const updateBtn = document.getElementById('updatePortfolioBtn');
        const container = portfolioInput.parentElement;

        if (!portfolioInput || !updateBtn) return;

        const newAmount = parseFloat(portfolioInput.value);

        // Validierung
        if (!this.validatePortfolioInput(newAmount)) {
            this.showInputError('Betrag muss zwischen $1.000 und $1.000.000 liegen');
            return;
        }

        // Bot muss gestoppt sein
        if (this.isRunning) {
            this.showInputError('Bot muss gestoppt sein für Portfolio-Update');
            return;
        }

        try {
            // Loading State
            container.classList.add('loading');
            updateBtn.textContent = 'Updating...';
            updateBtn.disabled = true;

            // API Call
            const response = await fetch('/api/bot/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ balance: newAmount })
            });

            const result = await response.json();

            if (result.success) {
                // Success State
                container.classList.remove('loading', 'error');
                container.classList.add('success');

                // Update Portfolio Display
                this.lastPortfolioValue = newAmount;

                // Success Message
                this.addLogEntry(`💰 Portfolio erfolgreich auf $${newAmount.toLocaleString()} gesetzt`, 'success');

                // Visual Feedback
                this.animatePortfolioUpdate();

                // Charts zurücksetzen
                this.resetCharts();

                // Update Button Text
                updateBtn.textContent = '✓ Updated';
                setTimeout(() => {
                    updateBtn.textContent = 'Update';
                    container.classList.remove('success');
                }, 2000);

            } else {
                throw new Error(result.message || 'Portfolio update failed');
            }

        } catch (error) {
            console.error('Portfolio update error:', error);
            this.showInputError(`Update fehlgeschlagen: ${error.message}`);
            container.classList.add('error');
        } finally {
            // Cleanup Loading State
            container.classList.remove('loading');
            updateBtn.disabled = false;
            updateBtn.textContent = 'Update';
        }
    }

    // Input Error anzeigen
    showInputError(message) {
        this.addLogEntry(`❌ ${message}`, 'error');

        // Shake Animation
        const container = document.getElementById('portfolioInput').parentElement;
        container.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            container.style.animation = '';
        }, 500);
    }

    // Portfolio Update Animation
    animatePortfolioUpdate() {
        const portfolioCard = document.querySelector('.portfolio-card.main-balance');
        if (portfolioCard) {
            portfolioCard.classList.add('portfolio-value-update');
            setTimeout(() => {
                portfolioCard.classList.remove('portfolio-value-update');
            }, 800);
        }
    }

    // Charts zurücksetzen
    resetCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.data && chart.data.datasets && chart.data.datasets[0]) {
                chart.data.labels = [];
                chart.data.datasets[0].data = [];
                chart.update('none');
            }
        });
    }

    // Enhanced Reset Portfolio (jetzt verwendet Input-Wert)
    async resetPortfolio() {
        const portfolioInput = document.getElementById('portfolioInput');
        const currentValue = portfolioInput ? parseFloat(portfolioInput.value) : 10000;

        // Verwende den Wert aus dem Input-Feld
        if (portfolioInput && currentValue >= 1000 && currentValue <= 1000000) {
            await this.updatePortfolioFromInput();
        } else {
            // Fallback zu Prompt
            const newBalance = prompt('Neues Startguthaben eingeben:', '10000');
            if (!newBalance || isNaN(newBalance)) return;

            // Update Input Field
            if (portfolioInput) {
                portfolioInput.value = newBalance;
            }

            await this.updatePortfolioFromInput();
        }
    }



    // Portfolio-spezifische Charts initialisieren
    initPortfolioCharts() {
        // 1. Portfolio Performance Chart
        const portfolioCtx = document.getElementById('portfolioChart');
        if (portfolioCtx) {
            this.charts.portfolio = new Chart(portfolioCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Portfolio Value ($)',
                        data: [],
                        borderColor: '#4facfe',
                        backgroundColor: 'rgba(79, 172, 254, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointBackgroundColor: '#4facfe'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#ffffff', font: { size: 12 } }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            callbacks: {
                                label: function(context) {
                                    return `Portfolio: $${context.parsed.y.toLocaleString()}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: '#ffffff', maxTicksLimit: 8, font: { size: 10 } },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        },
                        y: {
                            ticks: { 
                                color: '#ffffff',
                                font: { size: 10 },
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        }
                    }
                }
            });
        }

        // 2. Daily P&L Chart
        const pnlCtx = document.getElementById('pnlChart');
        if (pnlCtx) {
            this.charts.pnl = new Chart(pnlCtx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Daily P&L ($)',
                        data: [],
                        backgroundColor: function(context) {
                            const value = context.parsed ? context.parsed.y : 0;
                            return value >= 0 ? 'rgba(0, 255, 136, 0.7)' : 'rgba(255, 71, 87, 0.7)';
                        },
                        borderColor: function(context) {
                            const value = context.parsed ? context.parsed.y : 0;
                            return value >= 0 ? '#00ff88' : '#ff4757';
                        },
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#ffffff', font: { size: 12 } }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: '#ffffff', font: { size: 10 } },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        },
                        y: {
                            ticks: { 
                                color: '#ffffff',
                                font: { size: 10 },
                                callback: function(value) {
                                    return '$' + value.toFixed(0);
                                }
                            },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        }
                    }
                }
            });
        }

        // 3. Portfolio Allocation Chart  
        const allocationCtx = document.getElementById('allocationChart');
        if (allocationCtx) {
            this.charts.allocation = new Chart(allocationCtx, {
                type: 'doughnut',
                data: {
                    labels: ['BUSD', 'USDT', 'BNB', 'CAKE', 'BTCB'],
                    datasets: [{
                        data: [6000, 4000, 0, 0, 0], // Initial allocation
                        backgroundColor: [
                            '#ffd700', // BUSD
                            '#26a69a', // USDT  
                            '#f3ba2f', // BNB
                            '#d1884f', // CAKE
                            '#f7931a'  // BTCB
                        ],
                        borderWidth: 0,
                        hoverBorderWidth: 3,
                        hoverBorderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { 
                                color: '#ffffff',
                                font: { size: 11 },
                                padding: 15,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : '0.0';
                                    return `${context.label}: $${context.parsed.toLocaleString()} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    cutout: '60%'
                }
            });
        }

        // 4. Trade Distribution Chart
        const tradeDistCtx = document.getElementById('tradeDistributionChart');
        if (tradeDistCtx) {
            this.charts.tradeDistribution = new Chart(tradeDistCtx, {
                type: 'pie',
                data: {
                    labels: ['PancakeSwap', 'Biswap', 'ApeSwap', 'BabySwap'],
                    datasets: [{
                        data: [0, 0, 0, 0],
                        backgroundColor: ['#4facfe', '#00f2fe', '#00ff88', '#ff6b6b'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { 
                                color: '#ffffff',
                                font: { size: 11 },
                                usePointStyle: true
                            }
                        }
                    }
                }
            });
        }
    }

    // Portfolio-Daten aktualisieren
    updatePortfolioDisplay(portfolioData) {
        this.portfolioData = portfolioData;

        // Main Portfolio Values
        const totalValue = portfolioData.totalPortfolioValue || 10000;
        const totalReturn = portfolioData.totalReturn || 0;
        const todayReturn = portfolioData.todayReturn || 0;
        const startingBalance = portfolioData.startingBalance || 10000;

        // Portfolio Value mit Animation
        const portfolioValueEl = document.getElementById('totalPortfolioValue');
        if (portfolioValueEl) {
            portfolioValueEl.textContent = `$${totalValue.toLocaleString()}`;

            // Animation wenn Wert steigt
            if (totalValue > this.lastPortfolioValue) {
                portfolioValueEl.classList.add('portfolio-value-increase');
                setTimeout(() => {
                    portfolioValueEl.classList.remove('portfolio-value-increase');
                }, 600);
            }
            this.lastPortfolioValue = totalValue;
        }

        // Total Return
        const changeEl = document.getElementById('totalPortfolioChange');
        if (changeEl) {
            const changePercent = totalReturn;
            const changeAmount = totalValue - startingBalance;
            const indicator = changeEl.querySelector('.change-indicator');
            const amount = changeEl.querySelector('.change-amount');

            if (indicator && amount) {
                indicator.textContent = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
                indicator.className = `change-indicator ${changePercent >= 0 ? 'positive' : 'negative'}`;

                amount.textContent = `${changeAmount >= 0 ? '+' : ''}$${changeAmount.toLocaleString()}`;
            }
        }

        // Today's P&L
        const todayPnL = document.getElementById('todayPnL');
        if (todayPnL) {
            const todayAmount = (todayReturn / 100) * totalValue;
            todayPnL.textContent = `${todayAmount >= 0 ? '+' : ''}$${todayAmount.toFixed(2)}`;
            todayPnL.className = `portfolio-value ${todayAmount >= 0 ? 'positive' : 'negative'}`;
        }

        // Metrics
        const metrics = portfolioData.metrics || {};
        this.updateMetricElement('portfolioWinRate', `${(metrics.winRate || 0).toFixed(1)}%`);
        this.updateMetricElement('portfolioTradeCount', `${metrics.totalTrades || 0} trades`);
        this.updateMetricElement('sharpeRatio', (metrics.sharpeRatio || 0).toFixed(2));
        this.updateMetricElement('maxDrawdown', `${(metrics.maxDrawdown || 0).toFixed(2)}%`);
        this.updateMetricElement('availableCash', `$${(portfolioData.currentBalance || 0).toLocaleString()}`);

        // Update Charts
        this.updatePortfolioCharts(portfolioData);

        // Update Positions
        this.updatePositionsDisplay(portfolioData.positions || {});

        // Update Recent Trades Table
        this.updateTradesTable(portfolioData.recentTrades || []);
    }

    updateMetricElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    // Charts mit Portfolio-Daten aktualisieren
    updatePortfolioCharts(portfolioData) {
        const history = portfolioData.portfolioHistory || [];

        // Portfolio Performance Chart
        if (this.charts.portfolio && history.length > 0) {
            const labels = history.map(h => new Date(h.timestamp).toLocaleTimeString());
            const values = history.map(h => h.totalValue);

            this.charts.portfolio.data.labels = labels;
            this.charts.portfolio.data.datasets[0].data = values;
            this.charts.portfolio.update('none');
        }

        // Daily P&L Chart
        if (this.charts.pnl && history.length > 1) {
            const dailyChanges = [];
            const labels = [];

            for (let i = 1; i < history.length; i++) {
                const change = history[i].totalValue - history[i-1].totalValue;
                dailyChanges.push(change);
                labels.push(new Date(history[i].timestamp).toLocaleDateString());
            }

            this.charts.pnl.data.labels = labels.slice(-10); // Last 10 days
            this.charts.pnl.data.datasets[0].data = dailyChanges.slice(-10);
            this.charts.pnl.update('none');
        }

        // Portfolio Allocation Chart
        if (this.charts.allocation && portfolioData.positions) {
            const positions = portfolioData.positions;
            const values = [
                positions.BUSD || 0,
                positions.USDT || 0,
                positions.BNB ? positions.BNB * 280 : 0, // Rough BNB price
                positions.CAKE ? positions.CAKE * 2.1 : 0, // Rough CAKE price  
                positions.BTCB ? positions.BTCB * 43000 : 0 // Rough BTC price
            ];

            this.charts.allocation.data.datasets[0].data = values;
            this.charts.allocation.update('none');
        }

        // Trade Distribution (simplified - would need trade data by exchange)
        if (this.charts.tradeDistribution && portfolioData.recentTrades) {
            const exchangeCounts = { PancakeSwap: 0, Biswap: 0, ApeSwap: 0, BabySwap: 0 };

            portfolioData.recentTrades.forEach(trade => {
                if (exchangeCounts[trade.buyExchange] !== undefined) {
                    exchangeCounts[trade.buyExchange]++;
                }
            });

            this.charts.tradeDistribution.data.datasets[0].data = Object.values(exchangeCounts);
            this.charts.tradeDistribution.update('none');
        }
    }

    // Positionen anzeigen
    updatePositionsDisplay(positions) {
        const container = document.getElementById('positionsGrid');
        if (!container) return;

        const positionCards = Object.entries(positions)
            .filter(([symbol, amount]) => amount > 0.001) // Nur signifikante Positionen
            .map(([symbol, amount]) => {
                let value = amount;
                let displayAmount = amount;

                // Wert-Berechnung für Token
                if (symbol === 'BNB') {
                    value = amount * 280; // Rough price
                    displayAmount = amount.toFixed(4);
                } else if (symbol === 'CAKE') {
                    value = amount * 2.1;
                    displayAmount = amount.toFixed(2);
                } else if (symbol === 'BTCB') {
                    value = amount * 43000;
                    displayAmount = amount.toFixed(6);
                } else {
                    // Stablecoins
                    displayAmount = amount.toFixed(2);
                }

                return `
                    <div class="position-card">
                        <div class="position-symbol">${symbol}</div>
                        <div class="position-amount">${displayAmount}</div>
                        <div class="position-value">$${value.toLocaleString()}</div>
                    </div>
                `;
            }).join('');

        container.innerHTML = positionCards || '<div class="position-card"><div class="position-symbol">No positions</div></div>';
    }

    // Trades-Tabelle aktualisieren
    updateTradesTable(trades) {
        const tbody = document.getElementById('tradesTableBody');
        if (!tbody || !trades.length) return;

        const tradeRows = trades.slice(0, 10).map(trade => {
            const time = new Date(trade.timestamp).toLocaleTimeString();
            const profit = trade.netProfit || 0;
            const profitClass = profit >= 0 ? 'positive' : 'negative';
            const portfolioImpact = trade.portfolioValueBefore > 0 ? 
                ((profit / trade.portfolioValueBefore) * 100).toFixed(3) : '0.000';

            return `
                <tr>
                    <td class="trade-time">${time}</td>
                    <td class="trade-pair">${trade.pair}</td>
                    <td><span class="trade-type">Arbitrage</span></td>
                    <td>$${(trade.tradeAmount || 1000).toLocaleString()}</td>
                    <td class="trade-profit ${profitClass}">$${profit.toFixed(2)}</td>
                    <td class="trade-profit ${profitClass}">${portfolioImpact}%</td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = tradeRows;
    }

    // Portfolio-Report Modal
    async showPortfolioReport() {
        try {
            const response = await fetch('/api/portfolio/report');
            const result = await response.json();

            if (result.success) {
                this.generatePortfolioReport(result.data);
                document.getElementById('portfolioModal').classList.remove('hidden');
            }
        } catch (error) {
            console.error('Failed to load portfolio report:', error);
        }
    }

    hidePortfolioReport() {
        const modal = document.getElementById('portfolioModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    generatePortfolioReport(reportData) {
        const container = document.getElementById('portfolioReportContent');
        if (!container) return;

        const summary = reportData.summary;
        const performance = reportData.performance;

        container.innerHTML = `
            <div class="report-section">
                <h4>📈 Performance Summary</h4>
                <div class="report-grid">
                    <div class="report-item">
                        <div class="report-label">Total Return</div>
                        <div class="report-value ${summary.totalReturnAbs >= 0 ? 'positive' : 'negative'}">
                            $${summary.totalReturnAbs.toLocaleString()}
                        </div>
                    </div>
                    <div class="report-item">
                        <div class="report-label">Return %</div>
                        <div class="report-value ${summary.totalReturnAbs >= 0 ? 'positive' : 'negative'}">
                            ${((summary.totalReturnAbs / summary.startingBalance) * 100).toFixed(2)}%
                        </div>
                    </div>
                    <div class="report-item">
                        <div class="report-label">Best Trade</div>
                        <div class="report-value positive">$${(summary.bestTrade || 0).toFixed(2)}</div>
                    </div>
                    <div class="report-item">
                        <div class="report-label">Worst Trade</div>
                        <div class="report-value negative">$${(summary.worstTrade || 0).toFixed(2)}</div>
                    </div>
                </div>
            </div>

            <div class="report-section">
                <h4>📊 Risk Metrics</h4>
                <div class="report-grid">
                    <div class="report-item">
                        <div class="report-label">Sharpe Ratio</div>
                        <div class="report-value">${(performance.sharpeRatio || 0).toFixed(2)}</div>
                    </div>
                    <div class="report-item">
                        <div class="report-label">Max Drawdown</div>
                        <div class="report-value negative">${(performance.maxDrawdown || 0).toFixed(2)}%</div>
                    </div>
                    <div class="report-item">
                        <div class="report-label">Volatility</div>
                        <div class="report-value">${(performance.volatility || 0).toFixed(2)}%</div>
                    </div>
                    <div class="report-item">
                        <div class="report-label">Win Rate</div>
                        <div class="report-value">${summary.totalTrades > 0 ? ((summary.successfulTrades / summary.totalTrades) * 100).toFixed(1) : '0.0'}%</div>
                    </div>
                </div>
            </div>

            <div class="report-section">
                <h4>📋 Trading Summary</h4>
                <div class="report-grid">
                    <div class="report-item">
                        <div class="report-label">Total Trades</div>
                        <div class="report-value">${summary.totalTrades}</div>
                    </div>
                    <div class="report-item">
                        <div class="report-label">Successful Trades</div>
                        <div class="report-value positive">${summary.successfulTrades}</div>
                    </div>
                    <div class="report-item">
                        <div class="report-label">Avg Trade Size</div>
                        <div class="report-value">$${(summary.avgTradeSize || 0).toLocaleString()}</div>
                    </div>
                    <div class="report-item">
                        <div class="report-label">Starting Balance</div>
                        <div class="report-value">$${summary.startingBalance.toLocaleString()}</div>
                    </div>
                </div>
            </div>
        `;
    }

    updateTimeframe(timeframe) {
        console.log('Timeframe changed to:', timeframe);
        // Hier könnten wir die Charts entsprechend der Zeitspanne filtern
        // Für jetzt nur ein Platzhalter
    }

    // API-Integration für Bot-Steuerung  
    async startBot() {
        try {
            const response = await fetch('/api/bot/start', { method: 'POST' });
            const result = await response.json();

            if (result.success) {
                this.addLogEntry('✅ Portfolio Bot mit Live-Daten gestartet', 'success');
                this.isRunning = true;
                this.updateBotStatus();
            } else {
                this.addLogEntry(`❌ Bot-Start fehlgeschlagen: ${result.message}`, 'error');
            }
        } catch (error) {
            this.addLogEntry(`❌ Verbindungsfehler: ${error.message}`, 'error');
        }
    }

    async stopBot() {
        try {
            const response = await fetch('/api/bot/stop', { method: 'POST' });
            const result = await response.json();

            if (result.success) {
                this.addLogEntry('⏸️ Portfolio Bot gestoppt', 'info');
                this.isRunning = false;
                this.updateBotStatus();
            } else {
                this.addLogEntry(`❌ Bot-Stopp fehlgeschlagen: ${result.message}`, 'error');
            }
        } catch (error) {
            this.addLogEntry(`❌ Verbindungsfehler: ${error.message}`, 'error');
        }
    }

    async resetPortfolio() {
        const newBalance = prompt('Neues Startguthaben eingeben:', '10000');
        if (!newBalance || isNaN(newBalance)) return;

        try {
            const response = await fetch('/api/bot/reset', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ balance: parseFloat(newBalance) })
            });
            const result = await response.json();

            if (result.success) {
                this.addLogEntry(`🔄 Portfolio zurückgesetzt auf $${parseFloat(newBalance).toLocaleString()}`, 'info');

                // Charts zurücksetzen
                Object.values(this.charts).forEach(chart => {
                    if (chart && chart.data && chart.data.datasets && chart.data.datasets[0] && chart.data.datasets[0].data) {
                        chart.data.labels = [];
                        chart.data.datasets[0].data = [];
                        chart.update();
                    }
                });

                // Portfolio-Display zurücksetzen
                this.lastPortfolioValue = parseFloat(newBalance);
            } else {
                this.addLogEntry(`❌ Reset fehlgeschlagen: ${result.message}`, 'error');
            }
        } catch (error) {
            this.addLogEntry(`❌ Verbindungsfehler: ${error.message}`, 'error');
        }
    }

    async loadPortfolioData() {
        try {
            const response = await fetch('/api/portfolio/status');
            const result = await response.json();

            if (result.success) {
                this.updatePortfolioDisplay(result.data);
            }
        } catch (error) {
            console.error('Failed to load portfolio data:', error);
        }
    }

    // Log-Funktionen
    addLogEntry(message, type = 'info') {
        const logContainer = document.getElementById('tradeLog');
        if (!logContainer) return;

        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        entry.innerHTML = `
            <div class="log-time">${new Date().toLocaleTimeString('de-DE')}</div>
            <div>${message}</div>
        `;

        logContainer.insertBefore(entry, logContainer.firstChild);

        // Nur letzten 15 Einträge behalten
        const entries = logContainer.querySelectorAll('.log-entry');
        if (entries.length > 15) {
            entries[entries.length - 1].remove();
        }
    }

    // WebSocket-Handler für Portfolio-Updates
    handlePortfolioUpdate(data) {
        switch (data.type) {
            case 'portfolio_trade_executed':
                this.updatePortfolioDisplay(data.data.portfolio);
                const trade = data.data.trade;
                this.addLogEntry(
                    `💰 Portfolio Trade: ${trade.pair} | Size: $${trade.tradeAmount.toLocaleString()} | P&L: $${trade.netProfit.toFixed(2)} | Portfolio: $${data.data.portfolio.totalPortfolioValue.toLocaleString()}`,
                    trade.netProfit >= 0 ? 'success' : 'error'
                );

                // Sound bei großem Gewinn
                if (trade.netProfit > 50) {
                    this.playNotificationSound();
                }
                break;

            case 'portfolio_reset':
                this.addLogEntry(data.message, 'info');
                this.updatePortfolioDisplay(data.portfolio);
                break;

            case 'market_update':
                if (data.data.portfolio) {
                    this.updatePortfolioDisplay(data.data.portfolio);
                }
                break;

            case 'bot_started':
                if (data.portfolio) {
                    this.updatePortfolioDisplay(data.portfolio);
                }
                this.isRunning = true;
                this.updateBotStatus();
                break;

            case 'bot_stopped':
                if (data.portfolio) {
                    this.updatePortfolioDisplay(data.portfolio);
                }
                this.isRunning = false;
                this.updateBotStatus();
                break;

            case 'welcome':
                if (data.data.portfolio) {
                    this.updatePortfolioDisplay(data.data.portfolio);
                }
                this.isRunning = data.data.isRunning;
                this.updateBotStatus();
                break;
        }
    }

    updateBotStatus() {
        const indicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');

        if (indicator && statusText) {
            if (this.isRunning) {
                indicator.className = 'status-indicator status-active';
                statusText.textContent = 'Portfolio Bot Running';
            } else {
                indicator.className = 'status-indicator status-inactive';
                statusText.textContent = 'Portfolio Bot Stopped';
            }
        }
    }

    // Benachrichtigungston für große Gewinne
    playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Doppelton für Portfolio-Erfolg
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);

            console.log('🔊 Portfolio success notification!');
        } catch (e) {
            console.log('🔊 Big portfolio gain!');
        }
    }
}

// WebSocket Manager Integration
class PortfolioWebSocketManager {
    constructor(portfolioDashboard) {
        this.portfolioDashboard = portfolioDashboard;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.connect();
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('🔌 Connected to Portfolio Bot Server');
            this.portfolioDashboard.addLogEntry('🔌 Portfolio Server verbunden', 'success');
            this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.portfolioDashboard.handlePortfolioUpdate(message);
            } catch (error) {
                console.error('❌ WebSocket message parsing error:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('🔌 Disconnected from portfolio server');
            this.portfolioDashboard.addLogEntry('🔌 Verbindung verloren, reconnecting...', 'error');
            this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
        };
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

            setTimeout(() => {
                console.log(`🔄 Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                this.connect();
            }, delay);
        } else {
            this.portfolioDashboard.addLogEntry('❌ Maximale Reconnect-Versuche erreicht', 'error');
        }
    }
}

// Initialize Portfolio Dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Portfolio Dashboard...');

    // Portfolio Dashboard ist jetzt das Hauptsystem
    window.portfolioDashboard = new PortfolioDashboard();

    // Enhanced WebSocket Manager
    window.wsManager = new PortfolioWebSocketManager(window.portfolioDashboard);

    console.log('✅ Portfolio Dashboard mit Live-Trading initialisiert!');
    console.log('💰 Startguthaben: $10.000 | Echte Marktdaten | Portfolio-Tracking');

    // Alle 30 Sekunden Portfolio-Status aktualisieren
    setInterval(() => {
        window.portfolioDashboard.loadPortfolioData();
    }, 30000);
});
