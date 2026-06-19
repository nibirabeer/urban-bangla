import React, { useState, useEffect } from "react";
import "../styles/Preloader.css";

const Preloader = ({ onDone }) => {
  const [exit, setExit] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setExit(true), 1900);
    const t2 = setTimeout(onDone, 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`pre-wrap ${exit ? "pre-exit" : ""}`}>
      <div className="pre-inner">
        <div className="pre-shirt" />
        <div className="pre-brand">
          <span className="pre-brand-en">URBAN</span>
          <span className="pre-brand-bn">বাংলা</span>
        </div>
      </div>
    </div>
  );
};

export default Preloader;
