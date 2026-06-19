import React, { useState, useEffect } from "react";
import "../styles/Preloader.css";

const Preloader = ({ onDone }) => {
  const [exit, setExit] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setExit(true), 2000);
    const t2 = setTimeout(onDone, 2650);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`pre-wrap ${exit ? "pre-exit" : ""}`}>
      <div className="pre-inner">
        {/* Hanging t-shirt on clothesline */}
        <div className="pre-hanger">
          <div className="pre-wire" />
          <div className="pre-garment">
            <div className="pre-peg" />
            <div className="pre-shirt" />
          </div>
        </div>
        {/* Brand text */}
        <div className="pre-brand">
          <span className="pre-brand-en">URBAN</span>
          <span className="pre-brand-bn">বাংলা</span>
        </div>
      </div>
    </div>
  );
};

export default Preloader;
