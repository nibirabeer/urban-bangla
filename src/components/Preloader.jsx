import React, { useState, useEffect } from "react";
import "../styles/Preloader.css";

const LETTERS = "URBAN".split("");

const Preloader = ({ onDone }) => {
  const [exit, setExit] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setExit(true), 1600);
    const t2 = setTimeout(onDone, 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`pre-wrap ${exit ? "pre-exit" : ""}`}>
      <div className="pre-inner">
        <div className="pre-letters">
          {LETTERS.map((l, i) => (
            <span
              key={i}
              className="pre-letter"
              style={{ animationDelay: `${0.06 + i * 0.07}s` }}
            >
              {l}
            </span>
          ))}
        </div>
        <div className="pre-gold-line" />
        <p className="pre-bangla">বাংলা</p>
      </div>
    </div>
  );
};

export default Preloader;
