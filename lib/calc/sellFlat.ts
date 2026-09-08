import { computeCpfRefund, type CpfRefundInput, type CpfRefundResult } from './cpf';
import { computeSellFees, type SellFeesResult } from './fees';
import { computeResaleLevy, type ResaleLevyInput, type ResaleLevyResult } from './resaleLevy';

export interface SellFlatInput {
  salePrice: number;
  outstandingLoanBalance: number;
  cpfRefund: CpfRefundInput;
  resaleLevy: ResaleLevyInput;
  sellFees?: { conveyancingOverride?: number; sellerCommissionPctOverride?: number };
}

export interface SellFlatResult {
  salePrice: number;
  outstandingLoanRedeemed: number;
  cpfRefund: CpfRefundResult;
  resaleLevy: ResaleLevyResult;
  sellFees: SellFeesResult;
  /** What's left after redeeming the loan, refunding CPF, the levy, and selling fees. */
  netCashProceeds: number;
  warnings: string[];
}

/**
 * Sell-leg proceeds for an owned HDB flat. Settlement order at completion: sale price first
 * redeems the outstanding loan, then refunds CPF OA (principal + accrued interest), then pays
 * the resale levy (if buying another subsidised flat) and selling costs — whatever's left is
 * cash. The CPF refund is credited to CPF OA, not cash; composing scenarios (e.g.
 * HDB_SELL_AND_BUY) add it to the buyer's CPF OA balance for the buy leg, separately from
 * netCashProceeds here.
 */
export function computeSellFlat(input: SellFlatInput): SellFlatResult {
  const cpfRefund = computeCpfRefund(input.cpfRefund);
  const resaleLevy = computeResaleLevy(input.resaleLevy);
  const sellFees = computeSellFees({ kind: 'HDB', price: input.salePrice, ...input.sellFees });

  const netCashProceeds =
    input.salePrice -
    input.outstandingLoanBalance -
    cpfRefund.totalRefund -
    resaleLevy.levy -
    sellFees.conveyancing -
    sellFees.commission;

  const warnings = [...resaleLevy.warnings];
  if (netCashProceeds < 0) {
    warnings.push(
      'Sale proceeds don’t cover the loan redemption, CPF refund, levy, and selling fees — you’ll need cash to complete the sale.'
    );
  }

  return {
    salePrice: input.salePrice,
    outstandingLoanRedeemed: input.outstandingLoanBalance,
    cpfRefund,
    resaleLevy,
    sellFees,
    netCashProceeds,
    warnings,
  };
}
