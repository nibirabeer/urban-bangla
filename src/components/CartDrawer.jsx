import { useEffect } from "react";
import { X, ShoppingBag, Minus, Plus, Trash2, ArrowRight, ShoppingCart } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import "../styles/CartDrawer.css";

const CartDrawer = () => {
  const { items, cartOpen, closeCart, removeItem, updateQty } = useCart();
  const navigate = useNavigate();

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = cartOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [cartOpen]);

  const goTo = (path) => { navigate(path); closeCart(); };

  return (
    <>
      <div className={`cd-backdrop ${cartOpen ? "open" : ""}`} onClick={closeCart} aria-hidden="true" />

      <div className={`cd-drawer ${cartOpen ? "open" : ""}`} role="dialog" aria-label="Shopping cart">

        {/* ── Header ── */}
        <div className="cd-header">
          <div className="cd-header-left">
            <ShoppingBag size={18} className="cd-header-icon" />
            <span className="cd-header-title">Your Cart</span>
            {items.length > 0 && (
              <span className="cd-header-count">{items.reduce((s, i) => s + i.quantity, 0)}</span>
            )}
          </div>
          <button className="cd-close-btn" onClick={closeCart} aria-label="Close cart">
            <X size={20} />
          </button>
        </div>

        {/* ── Empty state ── */}
        {items.length === 0 ? (
          <div className="cd-empty">
            <div className="cd-empty-icon">
              <ShoppingCart size={36} />
            </div>
            <p className="cd-empty-title">Your cart is empty</p>
            <p className="cd-empty-sub">Add some items to get started</p>
            <button className="cd-empty-cta" onClick={closeCart}>
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            {/* ── Item list ── */}
            <div className="cd-items">
              {items.map(item => (
                <div key={item.cartId} className="cd-item">
                  <div className="cd-item-img-wrap">
                    <img src={item.photoURL} alt={item.name} className="cd-item-img" />
                  </div>

                  <div className="cd-item-info">
                    <p className="cd-item-name">{item.name}</p>
                    <p className="cd-item-meta">{item.category} · Size: <strong>{item.size}</strong></p>
                    <p className="cd-item-unit-price">৳{item.price} each</p>
                  </div>

                  <div className="cd-item-controls">
                    <div className="cd-qty-row">
                      <button
                        className="cd-qty-btn"
                        onClick={() => item.quantity > 1 ? updateQty(item.cartId, item.quantity - 1) : removeItem(item.cartId)}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="cd-qty-val">{item.quantity}</span>
                      <button
                        className="cd-qty-btn"
                        onClick={() => updateQty(item.cartId, item.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="cd-item-bottom">
                      <span className="cd-item-price">৳{item.price * item.quantity}</span>
                      <button className="cd-remove-btn" onClick={() => removeItem(item.cartId)} aria-label="Remove item">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Footer ── */}
            <div className="cd-footer">
              <div className="cd-subtotal-row">
                <span className="cd-subtotal-label">Subtotal</span>
                <span className="cd-subtotal-val">৳{subtotal}</span>
              </div>
              <p className="cd-shipping-note">Shipping calculated at checkout</p>

              <button className="cd-checkout-btn" onClick={() => goTo("/checkout")}>
                Checkout <ArrowRight size={16} />
              </button>
              <button className="cd-view-cart-btn" onClick={() => goTo("/cart")}>
                View Full Cart
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
