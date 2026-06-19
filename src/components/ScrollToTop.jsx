import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import "../styles/ScrollToTop.css";

const ScrollToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 320);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      className={`stt-btn ${visible ? "stt-visible" : ""}`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
    >
      <ArrowUp size={16} strokeWidth={2} className="stt-icon" />
    </button>
  );
};

export default ScrollToTop;
