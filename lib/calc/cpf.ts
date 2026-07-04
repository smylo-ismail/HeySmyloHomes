import { RATES } from '@/config/rates';

export interface CpfRefundInput {
  principal: number;
  /** Years the principal was in use, for accrued-interest projection. */
  years?: number;
  /** Direct accrued-interest figure from a CPF statement, overrides the projection. */
  accruedInterestOverride?: number;
}

export interface CpfRefundResult {
  principal: number;
  accruedInterest: number;
  totalRefund: number;
}

/** Sale-side CPF refund: OA principal + accrued interest (annually compounded at 2.5%). */
export function computeCpfRefund(input: CpfRefundInput): CpfRefundResult {
  if (input.accruedInterestOverride !== undefined) {
    return {
      principal: input.principal,
      accruedInterest: input.accruedInterestOverride,
      totalRefund: input.principal + input.accruedInterestOverride,
    };
  }
  const years = input.years ?? 0;
  const accruedInterest =
    input.principal * (Math.pow(1 + RATES.cpf.accruedInterestPct, years) - 1);
  return { principal: input.principal, accruedInterest, totalRefund: input.principal + accruedInterest };
}

export interface CpfBuySideInput {
  oaBalance: number;
  /** Grants are credited to CPF OA, not cash. */
  grantsTotal: number;
  downpayment: number;
  stampDuty: number;
  remainingLeaseYears?: number;
  youngestBuyerAge?: number;
}

export interface CpfBuySideResult {
  cpfAvailable: number;
  cpfNeeded: number;
  cashTopUp: number;
  warnings: string[];
}

/** Buy-side CPF usage: OA (own balance + grants) applied to downpayment + stamp duties. */
export function computeCpfBuySide(input: CpfBuySideInput): CpfBuySideResult {
  const warnings: string[] = [];
  if (
    input.remainingLeaseYears !== undefined &&
    input.youngestBuyerAge !== undefined &&
    input.remainingLeaseYears + input.youngestBuyerAge < 95
  ) {
    warnings.push(
      'Lease does not cover the youngest buyer to age 95 — CPF usage may be pro-rated (not modeled here).'
    );
  }

  const cpfAvailable = input.oaBalance + input.grantsTotal;
  const cpfNeeded = input.downpayment + input.stampDuty;
  const cashTopUp = Math.max(cpfNeeded - cpfAvailable, 0);

  return { cpfAvailable, cpfNeeded, cashTopUp, warnings };
}
