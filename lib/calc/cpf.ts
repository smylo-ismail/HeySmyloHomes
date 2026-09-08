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
}

export interface CpfBuySideResult {
  cpfAvailable: number;
  cpfNeeded: number;
  cashTopUp: number;
}

/** Buy-side CPF usage: OA (own balance + grants) applied to downpayment + stamp duties.
 *  The lease-to-95 pro-ration risk is grants.ts's single authoritative warning — not
 *  duplicated here, since both engines are always composed together by the same caller. */
export function computeCpfBuySide(input: CpfBuySideInput): CpfBuySideResult {
  const cpfAvailable = input.oaBalance + input.grantsTotal;
  const cpfNeeded = input.downpayment + input.stampDuty;
  const cashTopUp = Math.max(cpfNeeded - cpfAvailable, 0);

  return { cpfAvailable, cpfNeeded, cashTopUp };
}
