/**
 * 複利計算機 - 計算ロジック
 * Compound Interest Calculator Logic
 */

const Calculator = {
  /**
   * 基本の複利計算（元利合計）
   * FV = PV × (1 + r/k)^(nk)
   * 
   * @param {number} principal - 元金 (PV)
   * @param {number} rate - 年利 (%) 
   * @param {number} years - 経過年数 (n)
   * @param {number} compoundingFrequency - 年間の複利回数 (k)
   * @param {boolean} isEffectiveRate - 実質金利かどうか
   * @returns {Object} 計算結果
   */
  /**
   * 基本の複利計算（元利合計）為替計算対応
   * 
   * @param {number} principal - 元金 (円 or 外貨)
   * @param {number} rate - 年利 (%) 
   * @param {number} years - 経過年数
   * @param {number} compoundingFrequency - 複利回数
   * @param {boolean} isEffectiveRate - 実質金利かどうか
   * @param {Object} fxOptions - 為替オプション { enabled: boolean, rateIn: number, rateOut: number }
   * @returns {Object} 計算結果 (円換算)
   */
  calculateCompound(principal, rate, years, compoundingFrequency = 1, isEffectiveRate = false, fxOptions = { enabled: false, rateIn: 150, rateOut: 150 }) {
    const r = rate / 100;
    const k = compoundingFrequency;
    const n = years;
    const useFX = fxOptions.enabled;
    const rateIn = fxOptions.rateIn || 150;
    const rateOut = fxOptions.rateOut || 150;

    // 投資時：円を外貨に変換（FX無効ならそのまま）
    const principalForex = useFX ? principal / rateIn : principal;

    // 年ごとのデータを格納
    const yearlyData = [];
    let finalValueForex;

    if (isEffectiveRate) {
      for (let year = 0; year <= n; year++) {
        const balanceForex = principalForex * Math.pow(1 + r, year);
        yearlyData.push({
          year: year,
          principal: principal, // 投資額はJpyベース
          interest: (balanceForex - principalForex) * (useFX ? rateOut : 1),
          balance: balanceForex * (useFX ? rateOut : 1)
        });
      }
      finalValueForex = principalForex * Math.pow(1 + r, n);
    } else {
      for (let year = 0; year <= n; year++) {
        const balanceForex = principalForex * Math.pow(1 + r / k, year * k);
        yearlyData.push({
          year: year,
          principal: principal,
          interest: (balanceForex - principalForex) * (useFX ? rateOut : 1),
          balance: balanceForex * (useFX ? rateOut : 1)
        });
      }
      finalValueForex = principalForex * Math.pow(1 + r / k, n * k);
    }

    const finalValueJPY = finalValueForex * (useFX ? rateOut : 1);
    const totalInterestJPY = finalValueJPY - principal;
    const yieldPercent = (totalInterestJPY / principal) * 100;

    return {
      finalValue: Math.round(finalValueJPY),
      totalInterest: Math.round(totalInterestJPY),
      yieldPercent: yieldPercent,
      yearlyData: yearlyData,
      isFX: useFX
    };
  },

  /**
   * 税金を考慮した複利計算（最終利息にのみ課税）
   * 
   * @param {number} principal - 元金
   * @param {number} rate - 年利 (%)
   * @param {number} years - 経過年数
   * @param {number} compoundingFrequency - 複利回数
   * @param {number} taxRate - 税率 (%)
   * @param {boolean} isEffectiveRate - 実質金利かどうか
   * @returns {Object} 計算結果
   */
  calculateCompoundWithFinalTax(principal, rate, years, compoundingFrequency, taxRate, isEffectiveRate = false, fxOptions = { enabled: false, rateIn: 150, rateOut: 150 }) {
    const result = this.calculateCompound(principal, rate, years, compoundingFrequency, isEffectiveRate, fxOptions);
    const taxRateDecimal = taxRate / 100;
    const taxAmount = Math.round(result.totalInterest * taxRateDecimal);
    const afterTaxInterest = result.totalInterest - taxAmount;
    const afterTaxTotal = principal + afterTaxInterest;

    return {
      ...result,
      taxAmount: taxAmount,
      afterTaxInterest: afterTaxInterest,
      afterTaxTotal: afterTaxTotal
    };
  },

  /**
   * 積立計算（複利毎課税）
   * 各複利周期ごとに発生した利息に対して課税し、税引き後の利息のみを元本に組み入れる
   * 加えて、毎月の積立額を追加する
   * 
   * @param {number} principal - 初期元金
   * @param {number} monthlyInstallment - 毎月の積立額
   * @param {number} rate - 年利 (%)
   * @param {number} years - 経過年数
   * @param {number} compoundingFrequency - 年間の複利回数 (1, 2, 4, 12)
   * @param {number} taxRate - 税率 (%)
   * @returns {Object} 計算結果
   */
  /**
   * 毎月の積立を考慮した複利毎課税計算（為替計算対応）
   * 
   * @param {number} principal - 初期元金 (円)
   * @param {number} monthlyInstallment - 毎月の積立額 (円)
   * @param {number} rate - 年利 (%)
   * @param {number} years - 経過年数
   * @param {number} compoundingFrequency - 年間の複利回数
   * @param {number} taxRate - 税率 (%)
   * @param {Object} fxOptions - 為替オプション { enabled: boolean, rateIn: number, rateOut: number }
   * @returns {Object} 計算結果
   */
  calculatePeriodicTaxedAccumulation(principal, monthlyInstallment, rate, years, compoundingFrequency = 1, taxRate = 20.315, fxOptions = { enabled: false, rateIn: 150, rateOut: 150 }) {
    const r = rate / 100;
    const k = compoundingFrequency; // 年間の複利回数
    const n = years;
    const taxRateDecimal = taxRate / 100;
    const monthsPerPeriod = 12 / k; // 各複利期間の月数

    // 為替設定
    const useFX = fxOptions.enabled;
    const rateIn = fxOptions.rateIn || 150;
    const rateOut = fxOptions.rateOut || 150;

    // 残高は外貨ベースで計算（FX無効なら円のまま）
    let balance = useFX ? principal / rateIn : principal;
    let totalTax = 0;
    let totalInterest = 0;
    let totalInvestedJPY = principal;

    // 年ごとのデータを格納
    const yearlyData = [{
      year: 0,
      principal: principal,
      installment: 0,
      interest: 0,
      tax: 0,
      balance: principal,
      totalInvested: principal,
      balanceForex: useFX ? (principal / rateIn) : null
    }];

    for (let year = 1; year <= n; year++) {
      let yearlyInterest = 0;
      let yearlyTax = 0;
      let yearlyInstallmentJPY = 0;

      for (let period = 0; period < k; period++) {
        // 各複利期間の利息を按分計算
        // 期間開始時点の残高は全期間分の利息を得る
        let periodInterest = balance * (r / k);

        // 各月の積立は、期間内の残り月数に応じた利息を得る
        for (let m = 1; m <= monthsPerPeriod; m++) {
          const installmentForex = useFX ? (monthlyInstallment / rateIn) : monthlyInstallment;

          // 月mの積立は、期間終了まで (monthsPerPeriod - m + 1) / monthsPerPeriod の利息を得る
          // 期初積立なので、m月目の積立は (monthsPerPeriod - m + 1) ヶ月分運用される
          const monthsFraction = (monthsPerPeriod - m + 1) / monthsPerPeriod;
          periodInterest += installmentForex * (r / k) * monthsFraction;

          balance += installmentForex;
          totalInvestedJPY += monthlyInstallment;
          yearlyInstallmentJPY += monthlyInstallment;
        }

        // 利息に課税
        const periodTax = periodInterest * taxRateDecimal;
        const afterTaxInterest = periodInterest - periodTax;

        yearlyInterest += afterTaxInterest;
        yearlyTax += periodTax;
        balance += afterTaxInterest;
      }

      totalInterest += yearlyInterest;
      totalTax += yearlyTax;

      // 円貨に換算した残高
      const currentBalanceJPY = useFX ? (balance * rateOut) : balance;
      const currentInterestJPY = useFX ? (yearlyInterest * rateOut) : yearlyInterest;
      const currentTaxJPY = useFX ? (yearlyTax * rateOut) : yearlyTax;

      yearlyData.push({
        year: year,
        principal: principal,
        installment: yearlyInstallmentJPY,
        interest: currentInterestJPY,
        tax: currentTaxJPY,
        balance: currentBalanceJPY,
        totalInvested: totalInvestedJPY,
        balanceForex: useFX ? balance : null
      });
    }

    const finalValueJPY = useFX ? (balance * rateOut) : balance;
    const totalInterestJPY = finalValueJPY - totalInvestedJPY;
    const totalTaxJPY = useFX ? (totalTax * rateOut) : totalTax;

    // 非課税の場合（比較用）
    const noTaxBalanceForex = this.calculateAccumulationNoTax(
      useFX ? (principal / rateIn) : principal,
      useFX ? (monthlyInstallment / rateIn) : monthlyInstallment,
      rate, years, compoundingFrequency
    );
    const noTaxFinalValueJPY = useFX ? (noTaxBalanceForex * rateOut) : noTaxBalanceForex;

    return {
      finalValue: Math.round(finalValueJPY),
      totalInterest: Math.round(totalInterestJPY),
      totalTax: Math.round(totalTaxJPY),
      totalInvested: Math.round(totalInvestedJPY),
      noTaxFinalValue: Math.round(noTaxFinalValueJPY),
      yearlyData: yearlyData,
      isFX: useFX
    };
  },

  /**
   * 非課税での積立複利計算（比較用）
   */
  calculateAccumulationNoTax(principal, monthlyInstallment, rate, years, compoundingFrequency) {
    const r = rate / 100;
    const k = compoundingFrequency;
    const n = years;
    const monthsPerPeriod = 12 / k;

    let balance = principal;

    for (let year = 1; year <= n; year++) {
      for (let period = 0; period < k; period++) {
        // 期間開始時点の残高は全期間分の利息を得る
        let periodInterest = balance * (r / k);

        // 各月の積立は、期間内の残り月数に応じた利息を得る
        for (let m = 1; m <= monthsPerPeriod; m++) {
          const monthsFraction = (monthsPerPeriod - m + 1) / monthsPerPeriod;
          periodInterest += monthlyInstallment * (r / k) * monthsFraction;
          balance += monthlyInstallment;
        }

        balance += periodInterest;
      }
    }
    return balance;
  },

  /**
   * 数値を3桁カンマ区切りでフォーマット
   * @param {number} num - 数値
   * @returns {string} フォーマットされた文字列
   */
  formatNumber(num) {
    return Math.round(num).toLocaleString('ja-JP');
  },

  /**
   * パーセンテージをフォーマット
   * @param {number} percent - パーセンテージ
   * @param {number} decimals - 小数点以下の桁数
   * @returns {string} フォーマットされた文字列
   */
  formatPercent(percent, decimals = 2) {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(decimals)}%`;
  }
};

// グローバルエクスポート
window.Calculator = Calculator;
