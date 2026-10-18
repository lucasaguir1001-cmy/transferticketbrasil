import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface CartItem {
  tierId: string;
  tierName: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  eventImage: string;
  priceCents: number;
  feeCents: number;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, qty: number) => void;
  setQuantity: (tierId: string, qty: number) => void;
  removeItem: (tierId: string) => void;
  clear: () => void;
  totalCents: number;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "ingressos.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem: CartContextValue["addItem"] = (item, qty) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.tierId === item.tierId);
      if (existing) {
        return prev.map((i) =>
          i.tierId === item.tierId ? { ...i, quantity: i.quantity + qty } : i,
        );
      }
      return [...prev, { ...item, quantity: qty }];
    });
  };

  const setQuantity: CartContextValue["setQuantity"] = (tierId, qty) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.tierId !== tierId)
        : prev.map((i) => (i.tierId === tierId ? { ...i, quantity: qty } : i)),
    );
  };

  const removeItem = (tierId: string) =>
    setItems((prev) => prev.filter((i) => i.tierId !== tierId));

  const clear = () => setItems([]);

  const totalCents = items.reduce(
    (sum, i) => sum + (i.priceCents + i.feeCents) * i.quantity,
    0,
  );
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, setQuantity, removeItem, clear, totalCents, count }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
