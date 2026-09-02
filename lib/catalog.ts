export interface Product {
  id: string
  name: string
  colorway: string
  price: number
}

/**
 * Static, five items, single-item checkout only (no cart, no quantities).
 * The $50 pair the take-home requires is "Field Runner"; checkout takes its
 * amount from whichever product is selected, never a hardcoded constant.
 */
export const CATALOG: Product[] = [
  { id: 'field-runner', name: 'Field Runner', colorway: 'Bone / Clay', price: 50 },
  { id: 'night-trainer', name: 'Night Trainer', colorway: 'Jet / Ash', price: 85 },
  { id: 'low-court', name: 'Low Court', colorway: 'Chalk / Pine', price: 65 },
  { id: 'trail-mid', name: 'Trail Mid', colorway: 'Rust / Bark', price: 120 },
  { id: 'summit-hi', name: 'Summit Hi', colorway: 'Slate / Ice', price: 145 },
]

export function getProduct(id: string): Product | undefined {
  return CATALOG.find((p) => p.id === id)
}
