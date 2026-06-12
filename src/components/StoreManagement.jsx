import React, { useEffect, useState } from "react";
import { db } from "../services/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Megaphone, LayoutTemplate, Pin, ToggleLeft, ToggleRight, Plus, Trash2, Check, Sun, Moon, Tag } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import "../styles/StoreManagement.css";

const CONFIG_REF = () => doc(db, "config", "store");

const defaultStore = {
  announcementBar: { active: false, text: "", theme: "green" },
  popupBanner:     { active: false, title: "", message: "", buttonText: "Shop Now", theme: "new" },
  promoBanner:     { active: true, eyebrow: "Limited Time", title: "Free Delivery on Every Order", subtitle: "No minimum. No conditions. Just fast fashion, faster delivery.", buttonText: "Shop the Collection" },
  promotions:      [],
  globalTheme:     "dark",
  paymentSettings: {
    bkash:  { active: true,  number: "" },
    nagad:  { active: false, number: "" },
    cod:    { active: true },
    stripe: { active: false, publishableKey: "" },
  },
};

const emptyPromo = { id: "", title: "", badge: "", theme: "sale", active: true };

const THEMES = [
  { key: "green", label: "Green",  color: "var(--green)" },
  { key: "red",   label: "Sale",   color: "var(--red)" },
  { key: "gold",  label: "Gold",   color: "var(--gold)" },
  { key: "dark",  label: "Dark",   color: "var(--border-2)" },
];

const ThemePicker = ({ value, onChange }) => (
  <div className="sm-theme-picker">
    {THEMES.map(t => (
      <button
        key={t.key}
        type="button"
        className={`sm-theme-btn ${value === t.key ? "active" : ""}`}
        style={{ "--t-color": t.color }}
        onClick={() => onChange(t.key)}
      >
        <span className="sm-theme-dot" />
        {t.label}
      </button>
    ))}
  </div>
);

const Toggle = ({ on, onToggle }) => (
  <button className={`sm-toggle ${on ? "on" : ""}`} onClick={onToggle}>
    <span className="sm-toggle-knob" />
  </button>
);

const StoreManagement = () => {
  const [store, setStore]       = useState(defaultStore);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState("");
  const [saveError, setSaveError] = useState("");
  const [promoForm, setPromoForm] = useState(null);
  const [activeSection, setActiveSection] = useState("announcement");
  const { setUserTheme } = useTheme();

  useEffect(() => {
    getDoc(CONFIG_REF())
      .then(snap => {
        if (snap.exists()) setStore({ ...defaultStore, ...snap.data() });
      })
      .catch(e => setSaveError("Could not load store config: " + (e?.message || e.code)));
  }, []);

  const save = async (updated) => {
    setSaving(true);
    setSaveError("");
    try {
      await setDoc(CONFIG_REF(), updated, { merge: true });
      setStore(updated);
      setSaved("Saved!");
      setTimeout(() => setSaved(""), 2500);
    } catch (e) {
      console.error("StoreManagement save error:", e);
      if (e?.code === "permission-denied") {
        setSaveError("Permission denied — add the config rule to Firestore. See instructions below.");
      } else {
        setSaveError(e?.message || "Failed to save. Check Firestore rules.");
      }
    }
    finally { setSaving(false); }
  };

  /* ── Announcement ── */
  const saveAnnouncement = () => save({ ...store, announcementBar: { ...store.announcementBar } });
  const patchAnn = (patch) => setStore(s => ({ ...s, announcementBar: { ...s.announcementBar, ...patch } }));

  /* ── Popup ── */
  const savePopup = () => save({ ...store, popupBanner: { ...store.popupBanner } });
  const patchPopup = (patch) => setStore(s => ({ ...s, popupBanner: { ...s.popupBanner, ...patch } }));

  /* ── Promo Banner ── */
  const savePromoBanner = () => save({ ...store, promoBanner: { ...store.promoBanner } });
  const patchPromo = (patch) => setStore(s => ({ ...s, promoBanner: { ...s.promoBanner, ...patch } }));

  /* ── Promotions ── */
  const openAddPromo  = () => setPromoForm({ ...emptyPromo, id: Date.now().toString() });
  const openEditPromo = (p) => setPromoForm({ ...p });

  const savePromo = () => {
    if (!promoForm.title) return;
    const exists = store.promotions.find(p => p.id === promoForm.id);
    const updated = exists
      ? store.promotions.map(p => p.id === promoForm.id ? promoForm : p)
      : [...store.promotions, promoForm];
    save({ ...store, promotions: updated });
    setPromoForm(null);
  };

  const deletePromo = (id) => save({ ...store, promotions: store.promotions.filter(p => p.id !== id) });
  const togglePromo = (id) => save({ ...store, promotions: store.promotions.map(p => p.id === id ? { ...p, active: !p.active } : p) });

  const patchPayment = (method, patch) =>
    setStore(s => ({ ...s, paymentSettings: { ...s.paymentSettings, [method]: { ...s.paymentSettings[method], ...patch } } }));
  const savePayment = () => save({ ...store, paymentSettings: { ...store.paymentSettings } });

  const SECTIONS = [
    { key: "announcement", label: "Announcement Bar", icon: <Megaphone size={15} /> },
    { key: "popup",        label: "Popup Banner",     icon: <LayoutTemplate size={15} /> },
    { key: "promo",        label: "Promo Banner",     icon: <Tag size={15} /> },
    { key: "promotions",   label: "Promotions",       icon: <Pin size={15} /> },
    { key: "payments",     label: "Payments",         icon: <Check size={15} /> },
    { key: "theme",        label: "Website Theme",    icon: <Sun size={15} /> },
  ];

  return (
    <div className="sm-wrap">
      {saveError && (
        <div className="sm-save-error">
          <strong>Error:</strong> {saveError}
          <div className="sm-save-error-rule">
            Go to <strong>Firebase Console → Firestore → Rules</strong> and make sure this rule exists:
            <pre>{`match /config/{docId} {\n  allow read: if true;\n  allow write: if isAdmin();\n}`}</pre>
          </div>
        </div>
      )}

      {/* Section nav */}
      <div className="sm-nav">
        {SECTIONS.map(s => (
          <button
            key={s.key}
            className={`sm-nav-btn ${activeSection === s.key ? "active" : ""}`}
            onClick={() => setActiveSection(s.key)}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* ── Announcement Bar ── */}
      {activeSection === "announcement" && (
        <div className="sm-panel">
          <div className="sm-panel-head">
            <div>
              <h3 className="sm-panel-title">Announcement Bar</h3>
              <p className="sm-panel-sub">A slim banner shown at the top of every page. Great for delivery offers or sale alerts.</p>
            </div>
            <Toggle
              on={store.announcementBar.active}
              onToggle={() => { const updated = { ...store, announcementBar: { ...store.announcementBar, active: !store.announcementBar.active } }; save(updated); }}
            />
          </div>

          <div className={`sm-preview sm-preview-${store.announcementBar.theme}`}>
            <span>{store.announcementBar.text || "Your announcement text will appear here"}</span>
          </div>

          <div className="sm-fields">
            <div className="sm-field">
              <label>Announcement Text</label>
              <input
                className="sm-input"
                placeholder="e.g. Free delivery on all orders this week!"
                value={store.announcementBar.text}
                onChange={e => patchAnn({ text: e.target.value })}
              />
            </div>
            <div className="sm-field">
              <label>Theme</label>
              <ThemePicker value={store.announcementBar.theme} onChange={v => patchAnn({ theme: v })} />
            </div>
          </div>

          <div className="sm-actions">
            <button className="sm-btn-primary" onClick={saveAnnouncement} disabled={saving}>
              {saving ? "Saving..." : "Save Bar"}
            </button>
            {saved && <span className="sm-saved"><Check size={14} /> {saved}</span>}
          </div>
        </div>
      )}

      {/* ── Popup Banner ── */}
      {activeSection === "popup" && (
        <div className="sm-panel">
          <div className="sm-panel-head">
            <div>
              <h3 className="sm-panel-title">Popup Banner</h3>
              <p className="sm-panel-sub">A modal shown to logged-in users on first visit (once per session).</p>
            </div>
            <Toggle
              on={store.popupBanner.active}
              onToggle={() => { const updated = { ...store, popupBanner: { ...store.popupBanner, active: !store.popupBanner.active } }; save(updated); }}
            />
          </div>

          {/* Preview */}
          <div className={`sm-popup-preview sm-popup-preview-${store.popupBanner.theme}`}>
            <div className="sm-popup-preview-badge">{store.popupBanner.theme === "sale" ? "SALE" : store.popupBanner.theme === "new" ? "NEW" : "PROMO"}</div>
            <h4>{store.popupBanner.title || "Your popup title"}</h4>
            <p>{store.popupBanner.message || "Your message goes here"}</p>
            <button>{store.popupBanner.buttonText || "Shop Now"}</button>
          </div>

          <div className="sm-fields">
            <div className="sm-field-row">
              <div className="sm-field">
                <label>Title</label>
                <input className="sm-input" placeholder="e.g. New Arrivals Are Here!" value={store.popupBanner.title} onChange={e => patchPopup({ title: e.target.value })} />
              </div>
              <div className="sm-field">
                <label>Button Text</label>
                <input className="sm-input" placeholder="Shop Now" value={store.popupBanner.buttonText} onChange={e => patchPopup({ buttonText: e.target.value })} />
              </div>
            </div>
            <div className="sm-field">
              <label>Message</label>
              <textarea className="sm-input sm-textarea" placeholder="Describe the offer..." rows={3} value={store.popupBanner.message} onChange={e => patchPopup({ message: e.target.value })} />
            </div>
            <div className="sm-field">
              <label>Theme</label>
              <ThemePicker value={store.popupBanner.theme} onChange={v => patchPopup({ theme: v })} />
            </div>
          </div>

          <div className="sm-actions">
            <button className="sm-btn-primary" onClick={savePopup} disabled={saving}>
              {saving ? "Saving..." : "Save Popup"}
            </button>
            {saved && <span className="sm-saved"><Check size={14} /> {saved}</span>}
          </div>
        </div>
      )}

      {/* ── Promo Banner ── */}
      {activeSection === "promo" && (
        <div className="sm-panel">
          <div className="sm-panel-head">
            <div>
              <h3 className="sm-panel-title">Promo Banner</h3>
              <p className="sm-panel-sub">The full-width green banner on the home page. Toggle it on or off and edit all text.</p>
            </div>
            <Toggle
              on={store.promoBanner.active}
              onToggle={() => { const u = { ...store, promoBanner: { ...store.promoBanner, active: !store.promoBanner.active } }; save(u); }}
            />
          </div>

          {/* Live preview */}
          <div className="sm-promo-preview">
            <div className="sm-promo-preview-eyebrow">{store.promoBanner.eyebrow || "Eyebrow text"}</div>
            <div className="sm-promo-preview-title">{store.promoBanner.title || "Banner title"}</div>
            <div className="sm-promo-preview-sub">{store.promoBanner.subtitle || "Subtitle goes here"}</div>
            <div className="sm-promo-preview-btn">{store.promoBanner.buttonText || "Button text"}</div>
          </div>

          <div className="sm-fields">
            <div className="sm-field">
              <label>Eyebrow Label</label>
              <input className="sm-input" placeholder="e.g. Limited Time" value={store.promoBanner.eyebrow} onChange={e => patchPromo({ eyebrow: e.target.value })} />
            </div>
            <div className="sm-field">
              <label>Title</label>
              <input className="sm-input" placeholder="e.g. Free Delivery on Every Order" value={store.promoBanner.title} onChange={e => patchPromo({ title: e.target.value })} />
            </div>
            <div className="sm-field">
              <label>Subtitle</label>
              <textarea className="sm-input sm-textarea" rows={2} placeholder="e.g. No minimum. No conditions." value={store.promoBanner.subtitle} onChange={e => patchPromo({ subtitle: e.target.value })} />
            </div>
            <div className="sm-field">
              <label>Button Text</label>
              <input className="sm-input" placeholder="e.g. Shop the Collection" value={store.promoBanner.buttonText} onChange={e => patchPromo({ buttonText: e.target.value })} />
            </div>
          </div>

          <div className="sm-actions">
            <button className="sm-btn-primary" onClick={savePromoBanner} disabled={saving}>
              {saving ? "Saving..." : "Save Banner"}
            </button>
            {saved && <span className="sm-saved"><Check size={14} /> {saved}</span>}
          </div>
        </div>
      )}

      {/* ── Promotions ── */}
      {activeSection === "promotions" && (
        <div className="sm-panel">
          <div className="sm-panel-head">
            <div>
              <h3 className="sm-panel-title">Promotions</h3>
              <p className="sm-panel-sub">Styled sale/promo banners shown on the shop page above the product grid.</p>
            </div>
            <button className="sm-btn-outline" onClick={openAddPromo}>
              <Plus size={14} /> Add Promotion
            </button>
          </div>

          {store.promotions.length === 0 && !promoForm && (
            <div className="sm-empty">
              <p>No promotions yet. Add one to display sale banners on the shop.</p>
            </div>
          )}

          <div className="sm-promo-list">
            {store.promotions.map(p => (
              <div key={p.id} className={`sm-promo-item sm-promo-item-${p.theme} ${!p.active ? "inactive" : ""}`}>
                <div className="sm-promo-item-left">
                  <div className="sm-promo-item-preview">
                    <span className="sm-promo-badge">{p.badge || p.theme.toUpperCase()}</span>
                    <span className="sm-promo-item-title">{p.title}</span>
                  </div>
                  <span className={`sm-promo-status ${p.active ? "on" : "off"}`}>{p.active ? "Live" : "Hidden"}</span>
                </div>
                <div className="sm-promo-item-actions">
                  <button className="sm-icon-btn" onClick={() => togglePromo(p.id)} title={p.active ? "Hide" : "Show"}>
                    {p.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                  <button className="sm-icon-btn" onClick={() => openEditPromo(p)} title="Edit">
                    <span style={{ fontSize: 13 }}>Edit</span>
                  </button>
                  <button className="sm-icon-btn sm-icon-btn-danger" onClick={() => deletePromo(p.id)} title="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Promotion form */}
          {promoForm && (
            <div className="sm-promo-form">
              <h4 className="sm-promo-form-title">{store.promotions.find(p => p.id === promoForm.id) ? "Edit Promotion" : "New Promotion"}</h4>
              <div className="sm-fields">
                <div className="sm-field-row">
                  <div className="sm-field">
                    <label>Title</label>
                    <input className="sm-input" placeholder="e.g. Summer Sale" value={promoForm.title} onChange={e => setPromoForm(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div className="sm-field">
                    <label>Badge Text</label>
                    <input className="sm-input" placeholder="e.g. 30% OFF" value={promoForm.badge} onChange={e => setPromoForm(p => ({ ...p, badge: e.target.value }))} />
                  </div>
                </div>
                <div className="sm-field">
                  <label>Theme</label>
                  <ThemePicker value={promoForm.theme} onChange={v => setPromoForm(p => ({ ...p, theme: v }))} />
                </div>
              </div>
              <div className="sm-actions">
                <button className="sm-btn-primary" onClick={savePromo} disabled={saving}>
                  {saving ? "Saving..." : "Save Promotion"}
                </button>
                <button className="sm-btn-sec" onClick={() => setPromoForm(null)}>Cancel</button>
                {saved && <span className="sm-saved"><Check size={14} /> {saved}</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Payments ── */}
      {activeSection === "payments" && (
        <div className="sm-panel">
          <div className="sm-panel-head">
            <div>
              <h3 className="sm-panel-title">Payment Settings</h3>
              <p className="sm-panel-sub">Configure the payment methods available to customers at checkout. Enter your merchant numbers for mobile banking.</p>
            </div>
          </div>

          {/* bKash */}
          <div className="sm-pay-method">
            <div className="sm-pay-method-head">
              <div className="sm-pay-dot-label">
                <span className="sm-pay-badge" style={{ background: "#E2136E" }}>bKash</span>
                <span className="sm-pay-method-name">bKash</span>
              </div>
              <Toggle
                on={store.paymentSettings.bkash?.active}
                onToggle={() => patchPayment("bkash", { active: !store.paymentSettings.bkash?.active })}
              />
            </div>
            {store.paymentSettings.bkash?.active && (
              <div className="sm-field" style={{ marginTop: 14 }}>
                <label>Your bKash Merchant / Personal Number</label>
                <input
                  className="sm-input"
                  placeholder="e.g. 01712345678"
                  value={store.paymentSettings.bkash?.number || ""}
                  onChange={e => patchPayment("bkash", { number: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* Nagad */}
          <div className="sm-pay-method">
            <div className="sm-pay-method-head">
              <div className="sm-pay-dot-label">
                <span className="sm-pay-badge" style={{ background: "#F6821F" }}>Nagad</span>
                <span className="sm-pay-method-name">Nagad</span>
              </div>
              <Toggle
                on={store.paymentSettings.nagad?.active}
                onToggle={() => patchPayment("nagad", { active: !store.paymentSettings.nagad?.active })}
              />
            </div>
            {store.paymentSettings.nagad?.active && (
              <div className="sm-field" style={{ marginTop: 14 }}>
                <label>Your Nagad Merchant / Personal Number</label>
                <input
                  className="sm-input"
                  placeholder="e.g. 01712345678"
                  value={store.paymentSettings.nagad?.number || ""}
                  onChange={e => patchPayment("nagad", { number: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* Cash on Delivery */}
          <div className="sm-pay-method">
            <div className="sm-pay-method-head">
              <div className="sm-pay-dot-label">
                <span className="sm-pay-badge" style={{ background: "var(--green)" }}>COD</span>
                <span className="sm-pay-method-name">Cash on Delivery</span>
              </div>
              <Toggle
                on={store.paymentSettings.cod?.active !== false}
                onToggle={() => patchPayment("cod", { active: store.paymentSettings.cod?.active === false ? true : false })}
              />
            </div>
          </div>

          {/* Stripe Card Payments */}
          <div className="sm-pay-method">
            <div className="sm-pay-method-head">
              <div className="sm-pay-dot-label">
                <span className="sm-pay-badge" style={{ background: "#5469D4" }}>Card</span>
                <span className="sm-pay-method-name">Credit / Debit Card (Stripe)</span>
              </div>
              <Toggle
                on={!!store.paymentSettings.stripe?.active}
                onToggle={() => patchPayment("stripe", { active: !store.paymentSettings.stripe?.active })}
              />
            </div>
            {store.paymentSettings.stripe?.active && (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="sm-field">
                  <label>Stripe Publishable Key</label>
                  <input
                    className="sm-input"
                    placeholder="pk_live_... or pk_test_..."
                    value={store.paymentSettings.stripe?.publishableKey || ""}
                    onChange={e => patchPayment("stripe", { publishableKey: e.target.value })}
                  />
                </div>
                <div className="sm-stripe-note">
                  <strong>Secret Key</strong> is stored securely in Google Cloud Secret Manager — never paste it here.<br />
                  Run once in terminal to store it:<br />
                  <code>firebase functions:secrets:set STRIPE_SECRET_KEY</code><br />
                  (it will prompt you to paste the key), then deploy:<br />
                  <code>firebase deploy --only functions</code>
                </div>
              </div>
            )}
          </div>

          <div className="sm-actions" style={{ marginTop: 8 }}>
            <button className="sm-btn-primary" onClick={savePayment} disabled={saving}>
              {saving ? "Saving..." : "Save Payment Settings"}
            </button>
            {saved && <span className="sm-saved"><Check size={14} /> {saved}</span>}
          </div>
        </div>
      )}

      {/* ── Website Theme ── */}
      {activeSection === "theme" && (
        <div className="sm-panel">
          <div className="sm-panel-head">
            <div>
              <h3 className="sm-panel-title">Website Theme</h3>
              <p className="sm-panel-sub">Set the default theme for all visitors. Users can override this with their own preference.</p>
            </div>
          </div>

          <div className="sm-theme-cards">
            {[
              {
                key: "dark",
                label: "Dark Mode",
                desc: "Deep black background. Easy on the eyes at night.",
                icon: <Moon size={28} />,
                preview: { bg: "#0a0a0a", card: "#141414", text: "#F5F2EC", border: "#1e1e1e" },
              },
              {
                key: "light",
                label: "Light Mode",
                desc: "Clean white background. Classic and bright.",
                icon: <Sun size={28} />,
                preview: { bg: "#f5f5f5", card: "#ffffff", text: "#111111", border: "#e2e2e2" },
              },
            ].map(opt => (
              <button
                key={opt.key}
                className={`sm-theme-card ${store.globalTheme === opt.key ? "active" : ""}`}
                onClick={() => {
                  const updated = { ...store, globalTheme: opt.key };
                  save(updated);
                  setUserTheme(opt.key); // apply immediately to this session
                }}
              >
                {/* Mini browser preview */}
                <div className="sm-theme-preview" style={{ background: opt.preview.bg, border: `1px solid ${opt.preview.border}` }}>
                  <div className="sm-theme-preview-bar" style={{ background: opt.preview.card, borderBottom: `1px solid ${opt.preview.border}` }}>
                    <span style={{ background: opt.preview.border, width: 8, height: 8, borderRadius: "50%", display: "inline-block" }} />
                    <span style={{ background: opt.preview.border, width: 40, height: 6, borderRadius: 3, display: "inline-block", marginLeft: 6 }} />
                  </div>
                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ background: opt.preview.card, borderRadius: 6, height: 32, border: `1px solid ${opt.preview.border}` }} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <div style={{ background: opt.preview.card, borderRadius: 6, height: 48, border: `1px solid ${opt.preview.border}` }} />
                      <div style={{ background: opt.preview.card, borderRadius: 6, height: 48, border: `1px solid ${opt.preview.border}` }} />
                    </div>
                  </div>
                </div>

                <div className="sm-theme-card-body">
                  <div className="sm-theme-card-icon" style={{ color: opt.key === "dark" ? "#00FF8C" : "#A07840" }}>
                    {opt.icon}
                  </div>
                  <div>
                    <p className="sm-theme-card-label">{opt.label}</p>
                    <p className="sm-theme-card-desc">{opt.desc}</p>
                  </div>
                  {store.globalTheme === opt.key && (
                    <span className="sm-theme-card-active"><Check size={14} /> Active</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {saved && <div className="sm-actions" style={{ marginTop: 16 }}><span className="sm-saved"><Check size={14} /> {saved}</span></div>}

          <div className="sm-theme-note">
            Users who have set their own theme preference in their account will not be affected by this setting.
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreManagement;
