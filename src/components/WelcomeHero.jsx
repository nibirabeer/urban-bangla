import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../services/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { ArrowRight, Shirt, Flag as FlagIcon, Crown, Layers, Scissors, Gem } from "lucide-react";
import "../styles/WelcomeHero.css";

const CATEGORIES = [
  { key: "Jersey",      label: "Jerseys",     icon: <Shirt    size={16}/> },
  { key: "Flag",        label: "Flags",        icon: <FlagIcon size={16}/> },
  { key: "Cap",         label: "Caps",         icon: <Crown    size={16}/> },
  { key: "T-Shirt",     label: "T-Shirts",     icon: <Shirt    size={16}/> },
  { key: "Hoodie",      label: "Hoodies",      icon: <Layers   size={16}/> },
  { key: "Trouser",     label: "Trousers",     icon: <Scissors size={16}/> },
  { key: "Accessories", label: "Accessories",  icon: <Gem      size={16}/> },
];

const WelcomeHero = () => {
  const navigate = useNavigate();
  const [newArrivals, setNewArrivals] = useState([]);
  const [featured, setFeatured] = useState([]);
  const revealRef = useRef(null);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const [clothingSnap, configSnap] = await Promise.all([
          getDocs(collection(db, "clothing")),
          getDoc(doc(db, "config", "store")),
        ]);
        const items = clothingSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(i => i.display);
        setNewArrivals(items.slice(-6).reverse());
        const feat = items.filter(i => i.tag === "Bestseller" || i.tag === "New");
        setFeatured(feat.length ? feat.slice(0, 4) : items.slice(0, 4));
      } catch (e) { console.error(e); }
    };
    fetch_();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("wh-in"); }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".wh-reveal").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [newArrivals, featured]);

  const ProductCard = ({ item }) => {
    const altImg = item.photoURLs?.length > 1 ? item.photoURLs[1] : null;
    return (
      <div className="wh-card wh-reveal" onClick={() => navigate(`/product/${item.id}`)}>
        <div className="wh-card-img-wrap">
          <img src={item.photoURL} alt={item.name} className="wh-card-img wh-card-img-main" />
          {altImg && <img src={altImg} alt="" className="wh-card-img wh-card-img-alt" />}
          {item.tag && <span className="wh-card-badge">{item.tag}</span>}
        </div>
        <div className="wh-card-info">
          <p className="wh-card-cat">{item.category}</p>
          <h3 className="wh-card-name">{item.name}</h3>
          <p className="wh-card-price">৳{item.price}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="wh-page">

      {/* ── HERO ── */}
      <section className="wh-hero">
        <div className="wh-hero-inner">
          <p className="wh-eyebrow">Bangladesh Street Fashion</p>
          <h1 className="wh-hero-title">
            <span className="wh-title-urban">URBAN</span>
            <span className="wh-title-bangla">বাংলা</span>
          </h1>
          <p className="wh-hero-tagline">Made to be worn. Or judged. Or both.</p>
          <div className="wh-hero-ctas">
            <button className="wh-btn-primary" onClick={() => navigate("/dashboard")}>
              Shop Now <ArrowRight size={16} />
            </button>
            <button className="wh-btn-ghost" onClick={() => navigate("/orders")}>
              My Orders
            </button>
          </div>
        </div>
        <div className="wh-hero-scroll">
          <span>↓</span>
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <div className="wh-trust">
        {["Home Delivery", "Secure Payment", "Easy Returns", "100% Authentic"].map(t => (
          <span key={t} className="wh-trust-item">— {t}</span>
        ))}
      </div>

      {/* ── FEATURED ── */}
      {featured.length > 0 && (
        <section className="wh-section">
          <div className="wh-section-head wh-reveal">
            <h2 className="wh-section-title">FEATURED PICKS</h2>
            <button className="wh-link" onClick={() => navigate("/dashboard")}>
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="wh-grid wh-grid-4">
            {featured.map(item => <ProductCard key={item.id} item={item} />)}
          </div>
        </section>
      )}

      {/* ── CATEGORIES ── */}
      <section className="wh-cats-section wh-reveal">
        <h2 className="wh-section-title">SHOP BY CATEGORY</h2>
        <div className="wh-cats">
          {CATEGORIES.map(c => (
            <button key={c.key} className="wh-cat-btn" onClick={() => navigate("/dashboard")}>
              {c.icon}
              <span>{c.label}</span>
              <ArrowRight size={13} />
            </button>
          ))}
        </div>
      </section>

      {/* ── TAGLINE BREAK ── */}
      <section className="wh-tagline-block wh-reveal">
        <p className="wh-tagline-text">
          Carefully designed.<br />
          Proudly Bangladeshi.
        </p>
        <button className="wh-btn-primary" onClick={() => navigate("/dashboard")}>
          Shop the Collection <ArrowRight size={16} />
        </button>
      </section>

      {/* ── NEW ARRIVALS ── */}
      {newArrivals.length > 0 && (
        <section className="wh-section">
          <div className="wh-section-head wh-reveal">
            <h2 className="wh-section-title">NEW ARRIVALS</h2>
            <button className="wh-link" onClick={() => navigate("/dashboard")}>
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="wh-grid wh-grid-6">
            {newArrivals.map(item => <ProductCard key={item.id} item={item} />)}
          </div>
        </section>
      )}

    </div>
  );
};

export default WelcomeHero;
