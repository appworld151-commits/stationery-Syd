export function formatPrice(cents: number, currency: string, locale: string, freeLabel: string): string {
  if (cents === 0) return freeLabel
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`
  }
}
