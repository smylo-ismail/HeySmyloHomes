const currencyFormatter = new Intl.NumberFormat('en-SG', {
  style: 'currency',
  currency: 'SGD',
  maximumFractionDigits: 0,
});

/** Rounds once, at display. Never round mid-calculation. */
export function formatSgd(amount: number): string {
  return currencyFormatter.format(Math.round(amount));
}
