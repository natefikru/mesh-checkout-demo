export interface Product {
  id: string
  name: string
  colorway: string
  price: number
  image: string
}

/** Static, five items, qty 1 per item in the cart. */
export const CATALOG: Product[] = [
  { id: 'field-runner', name: 'Field Runner', colorway: 'Bone / Clay', price: 50, image: '/products/field-runner.png' },
  { id: 'night-trainer', name: 'Night Trainer', colorway: 'Jet / Ash', price: 85, image: '/products/night-trainer.png' },
  { id: 'low-court', name: 'Low Court', colorway: 'Chalk / Pine', price: 65, image: '/products/low-court.png' },
  { id: 'trail-mid', name: 'Trail Mid', colorway: 'Rust / Bark', price: 120, image: '/products/trail-mid.png' },
  { id: 'summit-hi', name: 'Summit Hi', colorway: 'Slate / Ice', price: 145, image: '/products/summit-hi.png' },
  { id: 'court-classic', name: 'Court Classic', colorway: 'Iris / Chalk', price: 110, image: '/products/court-classic.png' },
]

export function getProduct(id: string): Product | undefined {
  return CATALOG.find((p) => p.id === id)
}
