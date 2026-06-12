import React from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "../context/CartContext";
import "../styles/Cart.css";

const Cart = () => {
  const { items, removeItem, updateQty, count } = useCart();
  const navigate = useNavigate();

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-empty">
          <div className="cart-empty-icon"><ShoppingBag size={36} /></div>
          <h2>Your cart is empty</h2>
          <p>Add some items from the shop to get started.</p>
          <button className="cart-shop-btn" onClick={() => navigate("/dashboard")}>
            Browse Shop <ArrowRight size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-inner">

        <div className="cart-header">
          <h1 className="cart-title">Shopping Cart</h1>
          <span className="cart-count">{count} {count === 1 ? "item" : "items"}</span>
        </div>

        <div className="cart-layout">
          {/* Cart items */}
          <div className="cart-items">
            {items.map(item => (
              <div key={item.cartId} className="cart-item">
                <div className="cart-item-img">
                  <img src={item.photoURL} alt={item.name} />
                </div>
                <div className="cart-item-info">
                  <p className="cart-item-cat">{item.category}</p>
                  <h3 className="cart-item-name">{item.name}</h3>
                  <p className="cart-item-size">Size: <strong>{item.size}</strong></p>
                  <p className="cart-item-price">৳{item.price}</p>
                </div>
                <div className="cart-item-right">
                  <div className="cart-qty">
                    <button onClick={() => updateQty(item.cartId, item.quantity - 1)} disabled={item.quantity <= 1}>
                      <Minus size={13} />
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQty(item.cartId, item.quantity + 1)}>
                      <Plus size={13} />
                    </button>
                  </div>
                  <p className="cart-item-subtotal">৳{Math.round(item.price * item.quantity)}</p>
                  <button className="cart-remove" onClick={() => removeItem(item.cartId)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="cart-summary">
            <h2 className="cart-summary-title">Order Summary</h2>

            <div className="cart-summary-rows">
              {items.map(item => (
                <div key={item.cartId} className="cart-summary-row">
                  <span>{item.name} × {item.quantity}</span>
                  <span>৳{Math.round(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="cart-summary-divider" />

            <div className="cart-summary-total">
              <span>Total</span>
              <span className="cart-total-val">৳{Math.round(total)}</span>
            </div>

            <button className="cart-checkout-btn" onClick={() => navigate("/checkout")}>
              Proceed to Checkout <ArrowRight size={16} />
            </button>

            <button className="cart-continue-btn" onClick={() => navigate("/dashboard")}>
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
