import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { ShoppingCart, Sun, Moon, Monitor, User, Package, ShieldCheck, LogOut, ChevronDown } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useCart } from "../context/CartContext";
import "../styles/LoggedNavbar.css";

const LoggedNavbar = ({ isLoggedIn, onLogout }) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [userName, setUserName]       = useState("");
  const [userEmail, setUserEmail]     = useState("");
  const [photoURL, setPhotoURL]       = useState("");
  const { preference, setUserTheme }  = useTheme();
  const { count, openCart } = useCart();
  const navigate = useNavigate();
  const ref = useRef(null);
  const location = useLocation();

  useEffect(() => { setProfileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setProfileOpen(false); };
    if (profileOpen) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [profileOpen]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchUser = async () => {
      const auth = getAuth(); const user = auth.currentUser; if (!user) return;
      setUserEmail(user.email || "");
      const db = getFirestore();
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        if (d?.admin === true || d?.role === "admin") setIsAdmin(true);
        setUserName(d.name || user.displayName || ""); setPhotoURL(d.photoURL || user.photoURL || "");
      }
    };
    fetchUser();
  }, [isLoggedIn]);

  const THEMES = [
    { key: "light",  icon: <Sun size={14} />,     label: "Light" },
    { key: "dark",   icon: <Moon size={14} />,    label: "Dark" },
    { key: "system", icon: <Monitor size={14} />, label: "System" },
  ];

  const initials = userName ? userName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "U";

  return (
    <nav className="lnav">
      <div className="lnav-inner">
        <NavLink to="/" className="lnav-logo">
          <img src="/urban-bangla-logo.png" alt="logo" className="lnav-logo-img" />
          <div className="lnav-brand">
            <span className="lnav-brand-en">URBAN</span>
            <span className="lnav-brand-bn">বাংলা</span>
          </div>
        </NavLink>

        <div className="lnav-links">
          <NavLink to="/" className={({ isActive }) => `lnav-link ${isActive ? "active" : ""}`} end>Home</NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `lnav-link ${isActive ? "active" : ""}`}>Shop</NavLink>
          <NavLink to="/orders" className={({ isActive }) => `lnav-link ${isActive ? "active" : ""}`}>Orders</NavLink>
          {isAdmin && <NavLink to="/admin" className={({ isActive }) => `lnav-link admin-link ${isActive ? "active" : ""}`}>Admin</NavLink>}
        </div>

        <div className="lnav-right" ref={ref}>
          <button className="lnav-cart-btn" onClick={openCart} title="Cart" aria-label={`Cart with ${count} items`}>
            <ShoppingCart size={19} />
            {count > 0 && <span className="lnav-cart-badge">{count > 99 ? "99+" : count}</span>}
          </button>

          <button className="lnav-avatar-btn" onClick={() => setProfileOpen(!profileOpen)} aria-expanded={profileOpen}>
            {photoURL
              ? <img src={photoURL} alt="avatar" className="lnav-avatar-img" />
              : <span className="lnav-avatar-init">{initials}</span>
            }
            <ChevronDown size={13} className={`lnav-chevron ${profileOpen ? "open" : ""}`} />
          </button>

          {profileOpen && (
            <div className="lnav-dropdown">
              {/* ── User identity header ── */}
              <div className="lnav-dd-header">
                <div className="lnav-dd-avatar">
                  {photoURL
                    ? <img src={photoURL} alt="avatar" className="lnav-dd-avatar-img" />
                    : <span className="lnav-dd-avatar-init">{initials}</span>
                  }
                </div>
                <div className="lnav-dd-identity">
                  <p className="lnav-dd-name">{userName || "My Account"}</p>
                  {userEmail && <p className="lnav-dd-email">{userEmail}</p>}
                </div>
              </div>

              {/* ── Navigation items ── */}
              <div className="lnav-dd-nav">
                <button className="lnav-dd-item" onClick={() => { navigate("/profile"); setProfileOpen(false); }}>
                  <User size={15} className="lnav-dd-icon" />
                  <span>My Profile</span>
                </button>
                <button className="lnav-dd-item" onClick={() => { navigate("/orders"); setProfileOpen(false); }}>
                  <Package size={15} className="lnav-dd-icon" />
                  <span>My Orders</span>
                </button>
                <button className="lnav-dd-item" onClick={() => { openCart(); setProfileOpen(false); }}>
                  <ShoppingCart size={15} className="lnav-dd-icon" />
                  <span>Cart {count > 0 && <span className="lnav-dd-cart-count">{count}</span>}</span>
                </button>
                {isAdmin && (
                  <button className="lnav-dd-item lnav-dd-item-admin" onClick={() => { navigate("/admin"); setProfileOpen(false); }}>
                    <ShieldCheck size={15} className="lnav-dd-icon" />
                    <span>Admin Panel</span>
                  </button>
                )}
              </div>

              {/* ── Theme switcher ── */}
              <div className="lnav-dd-theme">
                <span className="lnav-dd-theme-label">Appearance</span>
                <div className="lnav-theme-btns">
                  {THEMES.map(t => (
                    <button
                      key={t.key}
                      className={`lnav-theme-btn ${(preference || "light") === t.key ? "active" : ""}`}
                      onClick={() => setUserTheme(t.key)}
                      title={t.label}
                    >
                      {t.icon}
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Sign out ── */}
              <button className="lnav-dd-logout" onClick={() => { onLogout(); setProfileOpen(false); }}>
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default LoggedNavbar;
