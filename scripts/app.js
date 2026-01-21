/**
 * 複利計算機 - メインアプリケーション
 */

document.addEventListener('DOMContentLoaded', () => {
    // ===== テーマ切替の初期化 =====
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // ===== 元利計算タブ用の要素 =====
    const principalSlider = document.getElementById('principal-slider');
    const principalInput = document.getElementById('principal-input');
    const principalDisplay = document.getElementById('principal-display');

    const rateSlider = document.getElementById('rate-slider');
    const rateInput = document.getElementById('rate-input');
    const rateDisplay = document.getElementById('rate-display');

    const yearsSlider = document.getElementById('years-slider');
    const yearsInput = document.getElementById('years-input');
    const yearsDisplay = document.getElementById('years-display');

    const periodSelector = document.getElementById('period-selector');
    const rateTypeSelector = document.getElementById('rate-type-selector');
    const includeTaxCheckbox = document.getElementById('include-tax');

    // ===== 元利計算 FX用の要素 =====
    const compoundFXEnabled = document.getElementById('compound-fx-enabled');
    const compoundFXRateIn = document.getElementById('compound-fx-rate-in');
    const compoundFXRateOut = document.getElementById('compound-fx-rate-out');
    const compoundFXOptionsDiv = document.getElementById('compound-fx-options');

    // ===== 積立計算タブ用の要素 =====
    const taxedPrincipalSlider = document.getElementById('taxed-principal-slider');
    const taxedPrincipalInput = document.getElementById('taxed-principal-input');
    const taxedPrincipalDisplay = document.getElementById('taxed-principal-display');

    const taxedInstallmentSlider = document.getElementById('taxed-installment-slider');
    const taxedInstallmentInput = document.getElementById('taxed-installment-input');
    const taxedInstallmentDisplay = document.getElementById('taxed-installment-display');

    const taxedRateSlider = document.getElementById('taxed-rate-slider');
    const taxedRateInput = document.getElementById('taxed-rate-input');
    const taxedRateDisplay = document.getElementById('taxed-rate-display');

    const taxedYearsSlider = document.getElementById('taxed-years-slider');
    const taxedYearsInput = document.getElementById('taxed-years-input');
    const taxedYearsDisplay = document.getElementById('taxed-years-display');

    const taxedPeriodSelector = document.getElementById('taxed-period-selector');
    const taxedTaxRateInput = document.getElementById('taxed-tax-rate-input');

    const taxedFXEnabled = document.getElementById('taxed-fx-enabled');
    const taxedFXRateIn = document.getElementById('taxed-fx-rate-in');
    const taxedFXRateOut = document.getElementById('taxed-fx-rate-out');
    const fxOptionsDiv = document.getElementById('fx-options');

    // ===== 状態管理 =====
    let globalCurrency = 'JPY'; // 'JPY' or 'USD'

    let compoundState = {
        principal: 1000000,
        rate: 5,
        years: 10,
        compoundingFrequency: 1,
        isEffectiveRate: false,
        includeTax: false,
        fx: {
            enabled: false,
            rateIn: 150,
            rateOut: 150
        }
    };

    let taxedState = {
        principal: 0,
        monthlyInstallment: 30000,
        rate: 3,
        years: 20,
        compoundingFrequency: 1,
        taxRate: 20.315,
        fx: {
            enabled: false,
            rateIn: 150,
            rateOut: 150
        }
    };

    // ===== ユーティリティ関数 =====
    function formatCurrency(num) {
        const rounded = Math.round(num);
        // Only format the number, do NOT add currency prefix here
        // Currency suffix is handled by .currency-label elements
        return rounded.toLocaleString('ja-JP');
    }

    function getCurrencySymbol() {
        return globalCurrency === 'USD' ? '$' : '円';
    }

    function updateCurrencyLabels() {
        const symbol = getCurrencySymbol();
        window.appCurrencySymbol = symbol === '円' ? '¥' : '$';
        document.querySelectorAll('.currency-label').forEach(el => {
            el.textContent = symbol;
        });
        // スライダーの表示も再更新
        principalDisplay.innerHTML = `${formatCurrency(compoundState.principal)}<span class="currency-label">${symbol}</span>`;
        taxedPrincipalDisplay.innerHTML = `${formatCurrency(taxedState.principal)}<span class="currency-label">${symbol}</span>`;
        taxedInstallmentDisplay.innerHTML = `${formatCurrency(taxedState.monthlyInstallment)}<span class="currency-label">${symbol}</span>`;
        // 結果の更新
        updateCompoundResult();
        updateTaxedResult();
    }

    function syncSliderAndInput(slider, input, display, formatFn, updateFn) {
        slider.addEventListener('input', () => {
            const value = parseFloat(slider.value);
            input.value = value;
            display.innerHTML = formatFn(value); // Use innerHTML for currency labels
            updateFn(value);
        });

        input.addEventListener('input', () => {
            let value = parseFloat(input.value) || 0;
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            value = Math.max(min, Math.min(max, value));
            slider.value = value;
            display.innerHTML = formatFn(value); // Use innerHTML for currency labels
            updateFn(value);
        });
    }

    function setupSegmentControl(container, callback) {
        const buttons = container.querySelectorAll('.segment-button');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                callback(btn.dataset.value);
            });
        });
    }

    // ===== 通貨切替の初期化 =====
    const currencyButtons = document.querySelectorAll('.currency-btn');
    currencyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currencyButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            globalCurrency = btn.dataset.currency;
            updateCurrencyLabels();
        });
    });

    // ===== 元利計算の初期化 =====
    syncSliderAndInput(
        principalSlider, principalInput, principalDisplay,
        v => `${formatCurrency(v)}<span class="currency-label">${getCurrencySymbol()}</span>`,
        v => { compoundState.principal = v; updateCompoundResult(); }
    );

    syncSliderAndInput(
        rateSlider, rateInput, rateDisplay,
        v => `${v.toFixed(2)}%`,
        v => { compoundState.rate = v; updateCompoundResult(); }
    );

    syncSliderAndInput(
        yearsSlider, yearsInput, yearsDisplay,
        v => `${Math.round(v)}年`,
        v => { compoundState.years = Math.round(v); updateCompoundResult(); }
    );

    setupSegmentControl(periodSelector, v => {
        compoundState.compoundingFrequency = parseInt(v);
        updateCompoundResult();
    });

    setupSegmentControl(rateTypeSelector, v => {
        compoundState.isEffectiveRate = v === 'effective';
        updateCompoundResult();
    });

    includeTaxCheckbox.addEventListener('change', () => {
        compoundState.includeTax = includeTaxCheckbox.checked;
        updateCompoundResult();
    });

    compoundFXEnabled.addEventListener('change', () => {
        compoundState.fx.enabled = compoundFXEnabled.checked;
        if (compoundFXEnabled.checked) {
            compoundFXOptionsDiv.classList.remove('hidden');
        } else {
            compoundFXOptionsDiv.classList.add('hidden');
        }
        updateCompoundResult();
    });

    compoundFXRateIn.addEventListener('input', () => {
        compoundState.fx.rateIn = parseFloat(compoundFXRateIn.value) || 150;
        updateCompoundResult();
    });

    compoundFXRateOut.addEventListener('input', () => {
        compoundState.fx.rateOut = parseFloat(compoundFXRateOut.value) || 150;
        updateCompoundResult();
    });

    // ===== 積立計算の初期化 =====
    syncSliderAndInput(
        taxedPrincipalSlider, taxedPrincipalInput, taxedPrincipalDisplay,
        v => `${formatCurrency(v)}<span class="currency-label">${getCurrencySymbol()}</span>`,
        v => { taxedState.principal = v; updateTaxedResult(); }
    );

    syncSliderAndInput(
        taxedInstallmentSlider, taxedInstallmentInput, taxedInstallmentDisplay,
        v => `${formatCurrency(v)}<span class="currency-label">${getCurrencySymbol()}</span>`,
        v => { taxedState.monthlyInstallment = v; updateTaxedResult(); }
    );

    syncSliderAndInput(
        taxedRateSlider, taxedRateInput, taxedRateDisplay,
        v => `${v.toFixed(2)}%`,
        v => { taxedState.rate = v; updateTaxedResult(); }
    );

    syncSliderAndInput(
        taxedYearsSlider, taxedYearsInput, taxedYearsDisplay,
        v => `${Math.round(v)}年`,
        v => { taxedState.years = Math.round(v); updateTaxedResult(); }
    );

    setupSegmentControl(taxedPeriodSelector, v => {
        taxedState.compoundingFrequency = parseInt(v);
        updateTaxedResult();
    });

    taxedTaxRateInput.addEventListener('input', () => {
        taxedState.taxRate = parseFloat(taxedTaxRateInput.value) || 20.315;
        updateTaxedResult();
    });

    taxedFXEnabled.addEventListener('change', () => {
        taxedState.fx.enabled = taxedFXEnabled.checked;
        if (taxedFXEnabled.checked) {
            fxOptionsDiv.classList.remove('hidden');
        } else {
            fxOptionsDiv.classList.add('hidden');
        }
        updateTaxedResult();
    });

    taxedFXRateIn.addEventListener('input', () => {
        taxedState.fx.rateIn = parseFloat(taxedFXRateIn.value) || 150;
        updateTaxedResult();
    });

    taxedFXRateOut.addEventListener('input', () => {
        taxedState.fx.rateOut = parseFloat(taxedFXRateOut.value) || 150;
        updateTaxedResult();
    });

    // ===== 結果更新関数 =====
    function updateCompoundResult() {
        const { principal, rate, years, compoundingFrequency, isEffectiveRate, includeTax, fx } = compoundState;

        let result;
        if (includeTax) {
            result = Calculator.calculateCompoundWithFinalTax(principal, rate, years, compoundingFrequency, 20.315, isEffectiveRate, fx);
        } else {
            result = Calculator.calculateCompound(principal, rate, years, compoundingFrequency, isEffectiveRate, fx);
        }

        // 結果表示を更新
        document.getElementById('result-total').textContent = formatCurrency(result.finalValue);
        document.getElementById('result-interest').innerHTML = `${formatCurrency(result.totalInterest)}<span class="currency-label">${getCurrencySymbol()}</span>`;
        document.getElementById('result-yield').textContent = Calculator.formatPercent(result.yieldPercent);

        // 税金表示
        const taxResultDiv = document.getElementById('tax-result');
        if (includeTax && result.afterTaxTotal) {
            taxResultDiv.classList.remove('hidden');
            document.getElementById('result-after-tax').innerHTML = `${formatCurrency(result.afterTaxTotal)}<span class="currency-label">${getCurrencySymbol()}</span>`;
        } else {
            taxResultDiv.classList.add('hidden');
        }

        // テーブル更新
        updateCompoundTable(result.yearlyData);

        // チャート更新
        ChartManager.renderCompoundChart('chart-compound', result.yearlyData);
    }

    function updateTaxedResult() {
        const { principal, monthlyInstallment, rate, years, compoundingFrequency, taxRate, fx } = taxedState;

        const result = Calculator.calculatePeriodicTaxedAccumulation(principal, monthlyInstallment, rate, years, compoundingFrequency, taxRate, fx);

        // 結果表示を更新
        document.getElementById('taxed-result-total').textContent = formatCurrency(result.finalValue);
        document.getElementById('taxed-result-invested').innerHTML = `${formatCurrency(result.totalInvested)}<span class="currency-label">${getCurrencySymbol()}</span>`;
        document.getElementById('taxed-result-interest').innerHTML = `${formatCurrency(result.totalInterest)}<span class="currency-label">${getCurrencySymbol()}</span>`;
        document.getElementById('taxed-result-tax').innerHTML = `${formatCurrency(result.totalTax)}<span class="currency-label">${getCurrencySymbol()}</span>`;
        document.getElementById('taxed-result-comparison').innerHTML = `${formatCurrency(result.noTaxFinalValue)}<span class="currency-label">${getCurrencySymbol()}</span>`;

        // 利回り計算
        const yieldValue = result.totalInvested > 0 ? (result.totalInterest / result.totalInvested) * 100 : 0;
        document.getElementById('taxed-result-yield').textContent = Calculator.formatPercent(yieldValue);

        // テーブル更新
        updateTaxedTable(result.yearlyData);

        // チャート更新
        ChartManager.renderTaxedChart('chart-taxed', result.yearlyData);
    }

    // ===== テーブル更新関数 =====
    function updateCompoundTable(yearlyData) {
        const tbody = document.getElementById('result-table-body');
        tbody.innerHTML = yearlyData.map(d => `
      <tr>
        <td>${d.year === 0 ? '開始' : d.year}</td>
        <td>${formatCurrency(d.principal)}</td>
        <td>${formatCurrency(d.interest)}</td>
        <td>${formatCurrency(d.balance)}</td>
      </tr>
    `).join('');
    }

    function updateTaxedTable(yearlyData) {
        const tbody = document.getElementById('taxed-result-table-body');
        tbody.innerHTML = yearlyData.map(d => `
      <tr>
        <td>${d.year === 0 ? '開始' : d.year}</td>
        <td>${formatCurrency(d.totalInvested)}</td>
        <td>${formatCurrency(d.installment)}</td>
        <td>${formatCurrency(d.interest)}</td>
        <td>${formatCurrency(d.tax)}</td>
        <td>${formatCurrency(d.balance)}</td>
      </tr>
    `).join('');
    }

    // ===== タブ切り替え =====
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;

            tabButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');

            tabPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === `panel-${targetTab}`) {
                    panel.classList.add('active');
                }
            });

            // タブ切り替え時にチャートを再描画
            if (targetTab === 'compound') {
                updateCompoundResult();
            } else {
                updateTaxedResult();
            }
        });
    });

    // ===== 折りたたみテーブル =====
    function setupCollapsible(toggleId, contentId) {
        const toggle = document.getElementById(toggleId);
        const content = document.getElementById(contentId);

        toggle.addEventListener('click', () => {
            toggle.classList.toggle('open');
            content.classList.toggle('open');
            const span = toggle.querySelector('span');
            span.textContent = content.classList.contains('open') ? '詳細テーブルを隠す' : '詳細テーブルを表示';
        });
    }

    setupCollapsible('toggle-table', 'table-container');
    setupCollapsible('toggle-taxed-table', 'taxed-table-container');

    // ===== 初期計算実行 =====
    updateCompoundResult();
    updateTaxedResult();

    // ===== 保存機能 =====
    const STORAGE_KEY = 'compound_calculator_history';
    const MAX_SAVED_ITEMS = 20;

    let currentSaveType = null; // 'compound' or 'taxed'

    // DOM Elements for save feature
    const saveModal = document.getElementById('save-modal');
    const saveModalBackdrop = saveModal.querySelector('.modal-backdrop');
    const saveNameInput = document.getElementById('save-name-input');
    const saveModalConfirm = document.getElementById('save-modal-confirm');
    const saveModalCancel = document.getElementById('save-modal-cancel');
    const saveCompoundBtn = document.getElementById('save-compound-btn');
    const saveTaxedBtn = document.getElementById('save-taxed-btn');
    const historyToggle = document.getElementById('history-toggle');
    const historyPanel = document.getElementById('history-panel');
    const historyPanelClose = document.getElementById('history-panel-close');
    const historyList = document.getElementById('history-list');
    const historyBadge = document.getElementById('history-badge');

    // Get saved data from localStorage
    function getSavedHistory() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }

    // Save data to localStorage
    function saveToHistory(item) {
        const history = getSavedHistory();
        history.unshift(item);
        if (history.length > MAX_SAVED_ITEMS) {
            history.pop();
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        updateHistoryBadge();
    }

    // Delete item from history
    function deleteFromHistory(id) {
        const history = getSavedHistory().filter(item => item.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        renderHistoryList();
        updateHistoryBadge();
    }

    // Update badge count
    function updateHistoryBadge() {
        const count = getSavedHistory().length;
        historyBadge.textContent = count;
        historyBadge.classList.toggle('hidden', count === 0);
    }

    // Format date
    function formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('ja-JP') + ' ' + date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    }

    // Render history list
    function renderHistoryList() {
        const history = getSavedHistory();
        if (history.length === 0) {
            historyList.innerHTML = '<div class="history-empty">保存された計算はありません</div>';
            return;
        }

        historyList.innerHTML = history.map(item => `
            <div class="history-item" data-id="${item.id}">
                <div class="history-item-header">
                    <span class="history-item-name">${escapeHtml(item.name)}</span>
                    <button class="history-item-delete" data-id="${item.id}" title="削除">×</button>
                </div>
                <div class="history-item-date">${formatDate(item.timestamp)}</div>
                <div class="history-item-summary">
                    ${item.type === 'compound' ? '元利計算' : '積立計算'} |
                    <span class="history-item-result">${formatCurrency(item.result)}${getCurrencySymbol()}</span>
                </div>
            </div>
        `).join('');

        // Add click handlers
        historyList.querySelectorAll('.history-item').forEach(el => {
            el.addEventListener('click', (e) => {
                if (!e.target.classList.contains('history-item-delete')) {
                    const id = el.dataset.id;
                    loadFromHistory(id);
                }
            });
        });

        historyList.querySelectorAll('.history-item-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                deleteFromHistory(id);
            });
        });
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Get current state for saving
    function getCurrentState(type) {
        if (type === 'compound') {
            return {
                principal: compoundState.principal,
                rate: compoundState.rate,
                years: compoundState.years,
                period: compoundState.period,
                rateType: compoundState.rateType,
                includeTax: compoundState.includeTax,
                fxEnabled: compoundState.fxEnabled,
                fxRateIn: compoundState.fxRateIn,
                fxRateOut: compoundState.fxRateOut,
                result: parseInt(document.getElementById('result-total').textContent.replace(/,/g, ''))
            };
        } else {
            return {
                principal: taxedState.principal,
                installment: taxedState.installment,
                rate: taxedState.rate,
                years: taxedState.years,
                period: taxedState.period,
                taxRate: taxedState.taxRate,
                fxEnabled: taxedState.fxEnabled,
                fxRateIn: taxedState.fxRateIn,
                fxRateOut: taxedState.fxRateOut,
                result: parseInt(document.getElementById('taxed-result-total').textContent.replace(/,/g, ''))
            };
        }
    }

    // Load state from history
    function loadFromHistory(id) {
        const history = getSavedHistory();
        const item = history.find(h => h.id === id);
        if (!item) return;

        if (item.type === 'compound') {
            // Switch to compound tab
            document.querySelector('[data-tab="compound"]').click();

            // Restore state
            principalSlider.value = item.state.principal;
            principalInput.value = item.state.principal;
            rateSlider.value = item.state.rate;
            rateInput.value = item.state.rate;
            yearsSlider.value = item.state.years;
            yearsInput.value = item.state.years;

            // Update displays
            principalDisplay.textContent = formatCurrency(item.state.principal) + getCurrencySymbol();
            rateDisplay.textContent = item.state.rate + '%';
            yearsDisplay.textContent = item.state.years + '年';

            // Update state
            compoundState.principal = item.state.principal;
            compoundState.rate = item.state.rate;
            compoundState.years = item.state.years;
            compoundState.period = item.state.period;
            compoundState.rateType = item.state.rateType;
            compoundState.includeTax = item.state.includeTax;
            compoundState.fxEnabled = item.state.fxEnabled || false;
            compoundState.fxRateIn = item.state.fxRateIn || 150;
            compoundState.fxRateOut = item.state.fxRateOut || 150;

            // Update segment buttons
            periodSelector.querySelectorAll('.segment-button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.value === String(item.state.period));
            });
            rateTypeSelector.querySelectorAll('.segment-button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.value === item.state.rateType);
            });
            includeTaxCheckbox.checked = item.state.includeTax;

            updateCompoundResult();
        } else {
            // Switch to taxed tab
            document.querySelector('[data-tab="taxed"]').click();

            // Restore state
            taxedPrincipalSlider.value = item.state.principal;
            taxedPrincipalInput.value = item.state.principal;
            taxedInstallmentSlider.value = item.state.installment;
            taxedInstallmentInput.value = item.state.installment;
            taxedRateSlider.value = item.state.rate;
            taxedRateInput.value = item.state.rate;
            taxedYearsSlider.value = item.state.years;
            taxedYearsInput.value = item.state.years;
            taxedTaxRateInput.value = item.state.taxRate;

            // Update displays
            taxedPrincipalDisplay.textContent = formatCurrency(item.state.principal) + getCurrencySymbol();
            taxedInstallmentDisplay.textContent = formatCurrency(item.state.installment) + getCurrencySymbol();
            taxedRateDisplay.textContent = item.state.rate + '%';
            taxedYearsDisplay.textContent = item.state.years + '年';

            // Update state
            taxedState.principal = item.state.principal;
            taxedState.installment = item.state.installment;
            taxedState.rate = item.state.rate;
            taxedState.years = item.state.years;
            taxedState.period = item.state.period;
            taxedState.taxRate = item.state.taxRate;
            taxedState.fxEnabled = item.state.fxEnabled || false;
            taxedState.fxRateIn = item.state.fxRateIn || 150;
            taxedState.fxRateOut = item.state.fxRateOut || 150;

            // Update segment buttons
            taxedPeriodSelector.querySelectorAll('.segment-button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.value === String(item.state.period));
            });

            updateTaxedResult();
        }

        // Close history panel
        historyPanel.classList.add('hidden');
    }

    // Open save modal
    function openSaveModal(type) {
        currentSaveType = type;
        saveNameInput.value = '';
        saveModal.classList.remove('hidden');
        saveNameInput.focus();
    }

    // Close save modal
    function closeSaveModal() {
        saveModal.classList.add('hidden');
        currentSaveType = null;
    }

    // Confirm save
    function confirmSave() {
        const name = saveNameInput.value.trim() || (currentSaveType === 'compound' ? '元利計算' : '積立計算');
        const state = getCurrentState(currentSaveType);

        const item = {
            id: Date.now().toString(),
            name: name,
            type: currentSaveType,
            state: state,
            result: state.result,
            timestamp: Date.now()
        };

        saveToHistory(item);
        closeSaveModal();
        renderHistoryList();
    }

    // Event listeners for save feature
    saveCompoundBtn.addEventListener('click', () => openSaveModal('compound'));
    saveTaxedBtn.addEventListener('click', () => openSaveModal('taxed'));
    saveModalConfirm.addEventListener('click', confirmSave);
    saveModalCancel.addEventListener('click', closeSaveModal);
    saveModalBackdrop.addEventListener('click', closeSaveModal);

    saveNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') confirmSave();
        if (e.key === 'Escape') closeSaveModal();
    });

    historyToggle.addEventListener('click', () => {
        historyPanel.classList.toggle('hidden');
        if (!historyPanel.classList.contains('hidden')) {
            renderHistoryList();
        }
    });

    historyPanelClose.addEventListener('click', () => {
        historyPanel.classList.add('hidden');
    });

    // Initialize badge
    updateHistoryBadge();
});
