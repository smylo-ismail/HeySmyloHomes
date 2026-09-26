import { computeCpfRefund, type CpfRefundInput, type CpfRefundResult } from './cpf';
import { computeSellFees, type SellFeesResult } from './fees';
import { computeResaleLevy, type ResaleLevyInput, type ResaleLevyResult } from './resaleLevy';

export type MannerOfHolding = 'JOINT_TENANCY' | 'TENANCY_IN_COMMON';

export interface ShareOfProceedsInput {
  manner: MannerOfHolding;
  /** Required only for TENANCY_IN_COMMON — one share per seller, as a fraction of 1 (e.g. 0.6 +
   *  0.4). Joint Tenancy always splits equally regardless of what's passed here. Not
   *  independently verified against HDB's own Tenancy-in-Common sub-form (not seen in the
   *  reference material) — validate against a real case before relying on this for a specific
   *  client's split. */
  shares?: number[];
}

export interface SellFlatInput {
  salePrice: number;
  outstandingLoanBalance: number;
  /** One entry per co-owner — each seller's own CPF principal used (+ years, for accrued
   *  interest), matching HDB's own "Calculate Sale Proceeds" tool, which lets each seller enter
   *  their own figure (they don't necessarily share the same usage history). At least one. */
  sellers: CpfRefundInput[];
  resaleLevy: ResaleLevyInput;
  sellFees?: { conveyancingOverride?: number; sellerCommissionPctOverride?: number };
  /** Outstanding HDB upgrading levy and upgrading costs — both manual entries. HDB's own
   *  calculator asks the levy as a yes/no (no client-side formula exposed), and the levy/cost
   *  amounts are backend-computed from account records this app has no access to, so both stay
   *  plain user-entered overrides rather than a derived figure. Both default to 0. */
  upgradingLevy?: number;
  outstandingUpgradingCost?: number;
  shareOfProceeds?: ShareOfProceedsInput;
}

export interface SellFlatResult {
  salePrice: number;
  outstandingLoanRedeemed: number;
  /** Aggregated across all sellers. */
  cpfRefund: CpfRefundResult;
  /** Per-seller breakdown, same order as the input `sellers` array. */
  cpfRefundBySeller: CpfRefundResult[];
  resaleLevy: ResaleLevyResult;
  sellFees: SellFeesResult;
  upgradingLevy: number;
  outstandingUpgradingCost: number;
  /** What's left after redeeming the loan, refunding CPF, the levy, upgrading payments, and
   *  selling fees. */
  netCashProceeds: number;
  /** netCashProceeds split by ownership share — one entry per seller, same order as input. */
  proceedsBySeller: { share: number; amount: number }[];
  warnings: string[];
}

function splitByShare(total: number, sellerCount: number, input?: ShareOfProceedsInput): { share: number; amount: number }[] {
  if (input?.manner === 'TENANCY_IN_COMMON' && input.shares && input.shares.length === sellerCount) {
    return input.shares.map((share) => ({ share, amount: total * share }));
  }
  // Joint Tenancy (or Tenancy-in-Common without shares given yet) — equal split.
  const equalShare = sellerCount > 0 ? 1 / sellerCount : 0;
  return Array.from({ length: sellerCount }, () => ({ share: equalShare, amount: total * equalShare }));
}

/**
 * Sell-leg proceeds for an owned HDB flat. Settlement order at completion: sale price first
 * redeems the outstanding loan, then refunds CPF OA (principal + accrued interest, per seller),
 * then pays the resale levy (if buying another subsidised flat), outstanding upgrading levy/costs,
 * and selling costs — whatever's left is cash, split by ownership share. The CPF refund is
 * credited to CPF OA, not cash; composing scenarios (e.g. HDB_SELL_AND_BUY) add it to the buyer's
 * CPF OA balance for the buy leg, separately from netCashProceeds here.
 */
export function computeSellFlat(input: SellFlatInput): SellFlatResult {
  const cpfRefundBySeller = input.sellers.map((seller) => computeCpfRefund(seller));
  const cpfRefund: CpfRefundResult = cpfRefundBySeller.reduce(
    (sum, r) => ({
      principal: sum.principal + r.principal,
      accruedInterest: sum.accruedInterest + r.accruedInterest,
      totalRefund: sum.totalRefund + r.totalRefund,
    }),
    { principal: 0, accruedInterest: 0, totalRefund: 0 }
  );

  const resaleLevy = computeResaleLevy(input.resaleLevy);
  const sellFees = computeSellFees({ kind: 'HDB', price: input.salePrice, ...input.sellFees });
  const upgradingLevy = input.upgradingLevy ?? 0;
  const outstandingUpgradingCost = input.outstandingUpgradingCost ?? 0;

  const netCashProceeds =
    input.salePrice -
    input.outstandingLoanBalance -
    cpfRefund.totalRefund -
    resaleLevy.levy -
    upgradingLevy -
    outstandingUpgradingCost -
    sellFees.conveyancing -
    sellFees.commission;

  const proceedsBySeller = splitByShare(netCashProceeds, input.sellers.length, input.shareOfProceeds);

  const warnings = [...resaleLevy.warnings];
  if (netCashProceeds < 0) {
    warnings.push(
      'Sale proceeds don’t cover the loan redemption, CPF refund, levy, outstanding payments, and selling fees — you’ll need cash to complete the sale.'
    );
  }

  return {
    salePrice: input.salePrice,
    outstandingLoanRedeemed: input.outstandingLoanBalance,
    cpfRefund,
    cpfRefundBySeller,
    resaleLevy,
    sellFees,
    upgradingLevy,
    outstandingUpgradingCost,
    netCashProceeds,
    proceedsBySeller,
    warnings,
  };
}
