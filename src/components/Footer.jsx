import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import "../styles/Footer.css";

const Footer = () => {
  const [contactOpen, setContactOpen] = useState(false);
  const [message, setMessage] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setContactOpen(false); };
    if (contactOpen) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [contactOpen]);

  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-brand-col">
          <div className="footer-brand">
            <img src="/urban-bangla-logo.png" alt="logo" className="footer-logo-img" />
            <div>
              <p className="footer-brand-en">URBAN</p>
              <p className="footer-brand-bn">বাংলা</p>
            </div>
          </div>
          <p className="footer-desc">
            Bangladesh's own street fashion brand. From jerseys to streetwear — everything in one place.
          </p>
        </div>

        <div className="footer-links-col">
          <h4 className="footer-col-title">Quick Links</h4>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/dashboard">Shop</a></li>
            <li><a href="/orders">My Orders</a></li>
            <li><button className="footer-link-btn" onClick={() => setContactOpen(true)}>Contact Us</button></li>
          </ul>
        </div>

        <div className="footer-links-col">
          <h4 className="footer-col-title">Categories</h4>
          <ul>
            {["Jerseys", "Flags", "Caps", "T-Shirts", "Hoodies"].map(c => (
              <li key={c}><a href="/dashboard">{c}</a></li>
            ))}
          </ul>
        </div>

        <div className="footer-links-col">
          <h4 className="footer-col-title">Follow Us</h4>
          <ul>
            <li><a href="https://www.facebook.com/share/17mfF2nJ2J/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer">Facebook</a></li>
            <li><a href="https://www.instagram.com/urban_bangladesh?igsh=MWJtZmE5aW4zdDl4dQ%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer">Instagram</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} URBAN বাংলা. All rights reserved.</p>
        <p className="footer-bottom-tagline">Made with ❤️ for Bangladesh</p>
      </div>

      {contactOpen && (
        <div className="contact-overlay">
          <div className="contact-drawer" ref={ref}>
            <button className="contact-close" onClick={() => setContactOpen(false)}><X size={20} /></button>
            <h2>Contact Us</h2>
            <p>Got a question or feedback? We'd love to hear from you.</p>
            <textarea
              className="contact-input"
              placeholder="Write your message..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
            />
            <button className="contact-send" onClick={() => {
              window.location.href = `mailto:abirnibir10@gmail.com?body=${encodeURIComponent(message)}`;
              setContactOpen(false);
            }}>Send Message</button>
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer;
