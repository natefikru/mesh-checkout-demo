'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CATALOG, type Product } from '@/lib/catalog'

interface CartState {
  productIds: string[]
  items: Product[]
  total: number
  isInCart: (productId: string) => boolean
  toggle: (productId: string) => void
  remove: (productId: string) => void
  clear: () => void
  /** The order placed from the last checkout, kept visible after the cart itself clears. */
  activeOrderId: string | null
  setActiveOrderId: (orderId: string) => void
}

const CartContext = createContext<CartState | null>(null)

/** Client-only, ephemeral cart. Qty 1 per item; toggling an item already in the cart removes it. */
export function CartProvider({ children }: { children: ReactNode }) {
  const [productIds, setProductIds] = useState<string[]>([])
  const [activeOrderId, setActiveOrderIdState] = useState<string | null>(null)

  const toggle = useCallback((productId: string) => {
    setProductIds((ids) => (ids.includes(productId) ? ids.filter((id) => id !== productId) : [...ids, productId]))
    // Adding a new item after an order was placed means starting over, so the
    // finished order's status shouldn't keep occupying the checkout footer.
    setActiveOrderIdState(null)
  }, [])

  const remove = useCallback((productId: string) => {
    setProductIds((ids) => ids.filter((id) => id !== productId))
  }, [])

  const clear = useCallback(() => setProductIds([]), [])
  const setActiveOrderId = useCallback((orderId: string) => setActiveOrderIdState(orderId), [])

  const items = useMemo(() => productIds.map((id) => CATALOG.find((p) => p.id === id)).filter((p): p is Product => p !== undefined), [productIds])
  const total = useMemo(() => items.reduce((sum, p) => sum + p.price, 0), [items])
  const isInCart = useCallback((productId: string) => productIds.includes(productId), [productIds])

  const value = useMemo(
    () => ({ productIds, items, total, isInCart, toggle, remove, clear, activeOrderId, setActiveOrderId }),
    [productIds, items, total, isInCart, toggle, remove, clear, activeOrderId, setActiveOrderId],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartState {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
