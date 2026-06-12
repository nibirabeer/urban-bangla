import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { X, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/PopupBanner.css";

const PopupBanner = () => {
  const [banner, setBanner] = useState(null);
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem("popup_dismissed") === "true") return;
    // Slight delay so the page renders first
    const t = setTimeout(() => {
      getDoc(doc(db, "config", "store")).then(snap => {
        if (snap.exists()) {
          const d = snap.data();
          if (d.popupBanner?.active && d.popupBanner?.title) {
            setBanner(d.popupBanner);
            setVisible(true);
          }
        }
      });
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("popup_dismissed", "true");
    setVisible(false);
  };

  if (!visible || !banner) return null;

  return (
    <div className="pb-overlay" onClick={dismiss}>
      <div className={`pb-modal pb-modal-${banner.theme}`} onClick={e => e.stopPropagation()}>
        <button className="pb-close" onClick={dismiss}><X size={18} /></button>

        <div className="pb-badge">
          {banner.theme === "sale" ? "SALE" : banner.theme === "red" ? "SALE" : banner.theme === "gold" ? "OFFER" : "NEW"}
        </div>

        <h2 className="pb-title">{banner.title}</h2>
        {banner.message && <p className="pb-message">{banner.message}</p>}

        <button
          className="pb-cta"
          onClick={() => { dismiss(); navigate("/dashboard"); }}
        >
          {banner.buttonText || "Shop Now"} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default PopupBanner;
