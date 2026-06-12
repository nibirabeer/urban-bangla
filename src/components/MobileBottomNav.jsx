import { NavLink } from "react-router-dom";
import { Home, ShoppingBag, ShoppingCart, Package, User, LogIn } from "lucide-react";
import { useCart } from "../context/CartContext";
import "../styles/MobileBottomNav.css";

const MobileBottomNav = ({ isLoggedIn }) => {
  const { count } = useCart();

  if (isLoggedIn) {
    return (
      <nav className="mob-nav" aria-label="Main navigation">
        <NavLink to="/" end className={({ isActive }) => `mob-tab ${isActive ? "active" : ""}`}>
          <Home size={22} strokeWidth={1.8} />
          <span>Home</span>
        </NavLink>

        <NavLink to="/dashboard" className={({ isActive }) => `mob-tab ${isActive ? "active" : ""}`}>
          <ShoppingBag size={22} strokeWidth={1.8} />
          <span>Shop</span>
        </NavLink>

        <NavLink to="/cart" className={({ isActive }) => `mob-tab mob-tab-cart ${isActive ? "active" : ""}`}>
          <span className="mob-cart-wrap">
            <ShoppingCart size={22} strokeWidth={1.8} />
            {count > 0 && (
              <span className="mob-cart-badge" aria-label={`${count} items`}>
                {count > 99 ? "99+" : count}
              </span>
            )}
          </span>
          <span>Cart</span>
        </NavLink>

        <NavLink to="/orders" className={({ isActive }) => `mob-tab ${isActive ? "active" : ""}`}>
          <Package size={22} strokeWidth={1.8} />
          <span>Orders</span>
        </NavLink>

        <NavLink to="/profile" className={({ isActive }) => `mob-tab ${isActive ? "active" : ""}`}>
          <User size={22} strokeWidth={1.8} />
          <span>Profile</span>
        </NavLink>
      </nav>
    );
  }

  return (
    <nav className="mob-nav mob-nav-guest" aria-label="Main navigation">
      <NavLink to="/" end className={({ isActive }) => `mob-tab ${isActive ? "active" : ""}`}>
        <Home size={22} strokeWidth={1.8} />
        <span>Home</span>
      </NavLink>

      <NavLink to="/dashboard" className={({ isActive }) => `mob-tab ${isActive ? "active" : ""}`}>
        <ShoppingBag size={22} strokeWidth={1.8} />
        <span>Shop</span>
      </NavLink>

      <NavLink to="/login" className={({ isActive }) => `mob-tab mob-tab-signin ${isActive ? "active" : ""}`}>
        <LogIn size={22} strokeWidth={1.8} />
        <span>Sign In</span>
      </NavLink>
    </nav>
  );
};

export default MobileBottomNav;
