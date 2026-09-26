import type { HdbSellOnlyInput } from '@/lib/schema/hdbSellOnly';
import { computeSellFlat, type SellFlatResult } from './sellFlat';
import { estimateSellCompletionDate } from '@/lib/timeline/hdbTimelines';

export interface HdbSellOnlyResult {
  sell: SellFlatResult;
  /** Mandatory minimum cash-proceeds-to-loan rule (see hdbSellAndBuy.ts) — here it's a preview
   *  only, since there's no buy-leg loan being sized. 0 when the user isn't planning to buy
   *  another HDB flat with a second HDB loan, or hasn't said whether they are. */
  cashMandatorilyAppliedToLoan: number;
  minCashSellerKeeps: number;
  estimatedSellCompletionDate: string;
  warnings: string[];
}

/** Wires the sell-leg calc engine for the standalone HDB_SELL_ONLY scenario — no buy leg. */
export function runHdbSellOnly(input: HdbSellOnlyInput): HdbSellOnlyResult {
  const isSecondSubsidisedFlat = Boolean(input.planningNextPurchase && input.nextFlatIsAnotherSubsidisedFlat);

  const sell = computeSellFlat({
    salePrice: input.sellPrice,
    outstandingLoanBalance: input.outstandingLoanBalance,
    sellers: input.sellers.map((s) => ({ principal: s.cpfPrincipalUsed, years: s.cpfUsageYears })),
    resaleLevy: {
      isSecondSubsidisedFlat,
      flatTypeSold: input.sellFlatType,
    },
    upgradingLevy: input.upgradingLevy,
    outstandingUpgradingCost: input.outstandingUpgradingCost,
    shareOfProceeds: input.mannerOfHolding
      ? { manner: input.mannerOfHolding, shares: input.ownershipShares }
      : undefined,
  });

  // Same rule as HDB_SELL_AND_BUY, scoped the same way (another HDB flat + a second HDB loan) —
  // preview-only here since there's no buy-leg loan to actually resize.
  const appliesMandatoryCashToLoanRule =
    Boolean(input.planningNextPurchase) && input.nextFlatDestination === 'HDB' && input.nextLoanType === 'HDB';
  const cashProceedsBasis = Math.max(sell.netCashProceeds, 0);
  const minCashSellerKeeps = Math.max(25_000, 0.5 * cashProceedsBasis);
  const cashMandatorilyAppliedToLoan = appliesMandatoryCashToLoanRule
    ? Math.max(cashProceedsBasis - minCashSellerKeeps, 0)
    : 0;

  const estimatedSellCompletionDate = estimateSellCompletionDate(input.sellOtpGrantedDate);

  return {
    sell,
    cashMandatorilyAppliedToLoan,
    minCashSellerKeeps: appliesMandatoryCashToLoanRule ? minCashSellerKeeps : cashProceedsBasis,
    estimatedSellCompletionDate,
    warnings: [...sell.warnings],
  };
}
