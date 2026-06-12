import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { X } from "lucide-react";

const AnnouncementBar = () => {
  const [bar, setBar]         = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("ann_dismissed") === "true") { setDismissed(true); return; }
    getDoc(doc(db, "config", "store")).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.announcementBar?.active && d.announcementBar?.text) setBar(d.announcementBar);
      }
    });
  }, []);

  if (!bar || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem("ann_dismissed", "true");
    setDismissed(true);
  };

  const bg = {
    green: "var(--green)",
    red:   "var(--red)",
    gold:  "var(--gold)",
    dark:  "#1a1a1a",
  }[bar.theme] || "var(--green)";

  const color = bar.theme === "gold" ? "var(--black)" : "var(--white)";

  return (
    <div style={{
      background: bg, color,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "9px 48px", fontSize: "13px", fontWeight: 600,
      letterSpacing: "0.3px", position: "relative",
      borderBottom: "1px solid rgba(0,0,0,0.2)",
    }}>
      <span>{bar.text}</span>
      <button
        onClick={dismiss}
        style={{
          position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", color, cursor: "pointer",
          display: "flex", alignItems: "center", opacity: 0.7,
          padding: 4,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default AnnouncementBar;
