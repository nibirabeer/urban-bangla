import { NavLink, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import "../styles/Navbar.css";

const Navbar = ({ isLoggedIn }) => {
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const { preference, setUserTheme } = useTheme();
  const aboutRef = useRef(null);
  const location = useLocation();

  // Close everything when the route changes (e.g. tapping a nav link on tablet)
  useEffect(() => {
    setMenuOpen(false);
    setAboutOpen(false);
  }, [location.pathname]);

  // Close about drawer on outside click
  useEffect(() => {
    const h = (e) => {
      if (aboutRef.current && !aboutRef.current.contains(e.target)) setAboutOpen(false);
    };
    if (aboutOpen) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [aboutOpen]);

  const cycleTheme = () => {
    const order = ["dark", "light", "system"];
    const curr  = preference || "dark";
    setUserTheme(order[(order.indexOf(curr) + 1) % order.length]);
  };

  const ThemeIcon = preference === "light" ? Sun : preference === "system" ? Monitor : Moon;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <NavLink to="/" className="navbar-logo">
          <img src="/urban-bangla-logo.png" alt="URBAN বাংলা" className="navbar-logo-img" />
          <div className="navbar-brand-text">
            <span className="navbar-brand-en">URBAN</span>
            <span className="navbar-brand-bn">বাংলা</span>
          </div>
        </NavLink>

        {/* Theme button — always visible (desktop inline, mobile standalone) */}
        <button className="navbar-theme-btn" onClick={cycleTheme} title={`Theme: ${preference || "dark"}`}>
          <ThemeIcon size={16} />
        </button>

        {/* Hamburger — only for tablet (hamburger hidden on phone, nav links hidden too) */}
        <button className="navbar-toggle" onClick={() => setMenuOpen(m => !m)} aria-label="Toggle menu">
          <span className={menuOpen ? "open" : ""} /><span /><span className={menuOpen ? "open" : ""} />
        </button>

        {/* Desktop nav links */}
        <div className={`navbar-menu ${menuOpen ? "open" : ""}`}>
          <ul className="navbar-links">
            <li>
              <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} end
                onClick={() => setMenuOpen(false)}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}>
                Shop
              </NavLink>
            </li>
            {isLoggedIn ? (
              <>
                <li>
                  <NavLink to="/orders" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                    onClick={() => setMenuOpen(false)}>
                    My Orders
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                    onClick={() => setMenuOpen(false)}>
                    Profile
                  </NavLink>
                </li>
              </>
            ) : (
              <li>
                <NavLink to="/login" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                  onClick={() => setMenuOpen(false)}>
                  Login
                </NavLink>
              </li>
            )}
            <li>
              <button className="nav-link about-btn" onClick={() => { setAboutOpen(true); setMenuOpen(false); }}>
                About
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* About drawer */}
      {aboutOpen && (
        <div className="about-overlay" onClick={() => setAboutOpen(false)}>
          <div className="about-drawer" ref={aboutRef} onClick={e => e.stopPropagation()}>
            <button className="about-close" onClick={() => setAboutOpen(false)}>✕</button>
            <div className="about-logo-wrap">
              <img src="/urban-bangla-logo.png" alt="logo" className="about-logo" />
            </div>
            <h2 className="about-title">URBAN <span>বাংলা</span></h2>
            <p className="about-desc">
              Bangladesh's boldest fashion destination. Jerseys, flags, and everyday streetwear — we bring the culture to your wardrobe.
            </p>
            <p className="about-desc-en">Fast delivery across Bangladesh. Real sizes. No compromise.</p>
            <button className="about-close-btn" onClick={() => setAboutOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
