import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";

const CartContext = createContext({
  items: [], count: 0, loading: false,
  cartOpen: false, openCart: () => {}, closeCart: () => {},
  addItem: () => {}, removeItem: () => {}, updateQty: () => {}, clearCart: () => {},
});

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [items, setItems]       = useState([]);
  const [uid, setUid]           = useState(null);
  const [loading, setLoading]   = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const openCart  = () => setCartOpen(true);
  const closeCart = () => setCartOpen(false);

  // Load cart when user signs in
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) setItems(snap.data().cart || []);
        } catch { setItems([]); }
      } else {
        setUid(null);
        setItems([]);
      }
    });
    return () => unsub();
  }, []);

  const syncCart = async (newItems) => {
    if (!uid) return;
    setItems(newItems);
    try { await updateDoc(doc(db, "users", uid), { cart: newItems }); }
    catch (e) { console.error("Cart sync error:", e); }
  };

  const addItem = async (product, size, qty = 1) => {
    if (!uid) return;
    setLoading(true);
    const cartId = `${product.id}_${size}`;
    const existing = items.find(i => i.cartId === cartId);
    let updated;
    if (existing) {
      updated = items.map(i => i.cartId === cartId ? { ...i, quantity: i.quantity + qty } : i);
    } else {
      updated = [...items, {
        cartId,
        itemId:   product.id,
        name:     product.name,
        photoURL: product.photoURL || product.photoURLs?.[0] || "",
        category: product.category,
        price:    product.price,
        size,
        quantity: qty,
      }];
    }
    await syncCart(updated);
    setLoading(false);
  };

  const removeItem = async (cartId) => {
    await syncCart(items.filter(i => i.cartId !== cartId));
  };

  const updateQty = async (cartId, qty) => {
    if (qty < 1) return;
    await syncCart(items.map(i => i.cartId === cartId ? { ...i, quantity: qty } : i));
  };

  const clearCart = async () => {
    await syncCart([]);
  };

  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, count, loading, cartOpen, openCart, closeCart, addItem, removeItem, updateQty, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};
