/** 第二種: 目安年率。上限3.0%（表示用注記） */
export const JASSO_SETTINGS = {
  RATES: { FIXED: 0.02423, FLOATING: 0.016 },
  RATE_CAP: 0.03,
  /** 第一種 月額の参考レンジ（円） */
  TYPE1_MONTHLY_MIN: 20_000,
  TYPE1_MONTHLY_MAX: 64_000,
  /** 第二種 月額のレンジ（円、1万円単位） */
  TYPE2_MONTHLY_MIN: 20_000,
  TYPE2_MONTHLY_MAX: 120_000,
  TYPE2_STEP: 10_000,
  REPAYMENT_STEPS: [
    { limit: 800_000, times: 108 },
    { limit: 1_500_000, times: 156 },
    { limit: 2_500_000, times: 180 },
    { limit: Infinity, times: 240 },
  ] as const,
} as const;

export function getRepaymentTimes(totalLoan: number): number {
  const rule = JASSO_SETTINGS.REPAYMENT_STEPS.find((s) => totalLoan <= s.limit);
  return rule ? rule.times : 240;
}

export type JassoRepaymentResult = {
  monthly: number;
  total: number;
  interest: number;
  years: number;
  times: number;
};

/**
 * 月々の返済額（元利均等）。無利子は等分返済（切り上げ）に相当。
 */
export function calcRepayment(
  totalLoan: number,
  annualRate: number
): JassoRepaymentResult {
  const times = getRepaymentTimes(totalLoan);

  if (totalLoan <= 0) {
    return { monthly: 0, total: 0, interest: 0, years: 0, times: 0 };
  }

  if (annualRate === 0) {
    const monthly = Math.ceil(totalLoan / times);
    return {
      monthly,
      total: monthly * times,
      interest: monthly * times - totalLoan,
      years: times / 12,
      times,
    };
  }

  const r = annualRate / 12;
  const monthly =
    (totalLoan * r * Math.pow(1 + r, times)) / (Math.pow(1 + r, times) - 1);
  const m = Math.ceil(monthly);
  return {
    monthly: m,
    total: m * times,
    interest: m * times - totalLoan,
    years: times / 12,
    times,
  };
}
