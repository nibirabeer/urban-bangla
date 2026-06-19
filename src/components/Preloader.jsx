import React, { useEffect, useState } from "react";
import "../styles/Preloader.css";

const Preloader = ({ onDone }) => {
  const [phase, setPhase] = useState(0); // 0=in, 1=hold, 2=out

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200);
    const t2 = setTimeout(() => setPhase(2), 1400);
    const t3 = setTimeout(onDone, 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div className={`pre-wrap ${phase >= 2 ? "pre-out" : ""}`}>
      <div className={`pre-content ${phase >= 1 ? "pre-visible" : ""}`}>
        <p className="pre-line-1">URBAN</p>
        <p className="pre-line-2">বাংলা</p>
      </div>
    </div>
  );
};

export default Preloader;
