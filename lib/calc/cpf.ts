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
  /** Other CPF-eligible upfront costs beyond stamp duty — currently just the conveyancing fee.
   *  Confirmed CPF-payable against HDB's own resale payment-plan calculator (see loan.ts's
   *  cpfEligibleUpfrontCosts comment for the source); valuation and agent commission are NOT
   *  included here since HDB's own breakdown never itemizes them as CPF-eligible. Defaults to 0. */
  otherCpfEligibleCosts?: number;
}

export interface CpfBuySideResult {
  cpfAvailable: number;
  cpfNeeded: number;
  cashTopUp: number;
}

/** Buy-side CPF usage: OA (own balance + grants) applied to downpayment + stamp duties + other
 *  CPF-eligible costs. The lease-to-95 pro-ration risk is grants.ts's single authoritative
 *  warning — not duplicated here, since both engines are always composed together by the same
 *  caller. `downpayment` should already be needs-based (see loan.ts) — when it is, cashTopUp
 *  naturally resolves to 0 except for the mandatory minimum-cash floor, which the caller is
 *  responsible for combining in via `Math.max(cashTopUp, loan.minCashRequired)`. */
export function computeCpfBuySide(input: CpfBuySideInput): CpfBuySideResult {
  const cpfAvailable = input.oaBalance + input.grantsTotal;
  const cpfNeeded = input.downpayment + input.stampDuty + (input.otherCpfEligibleCosts ?? 0);
  const cashTopUp = Math.max(cpfNeeded - cpfAvailable, 0);

  return { cpfAvailable, cpfNeeded, cashTopUp };
}
