import { useEffect, useState, useRef } from "react";
import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import {
  Pencil, Plus, Trash2, Check, User, MapPin, Lock,
  Phone, Mail, Camera, Eye, EyeOff, ShoppingBag, ChevronRight,
} from "lucide-react";
import "../styles/Profile.css";

const auth = getAuth();
const db   = getFirestore();
const emptyAddress = { label: "Home", street: "", city: "", district: "", postalCode: "", isDefault: false };

const Profile = () => {
  const [userData, setUserData]         = useState(null);
  const [activeTab, setActiveTab]       = useState("info");
  const [editingInfo, setEditingInfo]   = useState(false);
  const [updatedData, setUpdatedData]   = useState({});
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent]   = useState(false);
  const [showNew, setShowNew]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [msg, setMsg]                   = useState({ text: "", type: "", section: "" });
  const [photoFile, setPhotoFile]       = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoURL, setPhotoURL]         = useState("");
  const [addresses, setAddresses]       = useState([]);
  const [addressForm, setAddressForm]   = useState(null);
  const [orderCount, setOrderCount]     = useState(0);
  const [saving, setSaving]             = useState(false);
  const fileInputRef = useRef(null);
  const navigate     = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (!user) { navigate("/login"); return; }
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setUserData(d);
        setUpdatedData({ name: d.name || "", phone: d.phone || "" });
        if (d.photoURL) setPhotoURL(d.photoURL);
        setAddresses(d.addresses || []);
      }
      try {
        const ordSnap = await getDocs(collection(doc(db, "users", user.uid), "orders"));
        setOrderCount(ordSnap.size);
      } catch { /* order count is non-critical */ }
    };
    fetchUser();
  }, [navigate]);

  const flash = (text, type, section) => {
    setMsg({ text, type, section });
    setTimeout(() => setMsg({ text: "", type: "", section: "" }), 4000);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const saveInfo = async () => {
    const user = auth.currentUser; if (!user) return;
    setSaving(true);
    try {
      let newPhotoURL = photoURL;
      if (photoFile) {
        const storage   = getStorage();
        const storageRef = ref(storage, `profiles/${user.uid}`);
        await uploadBytes(storageRef, photoFile);
        newPhotoURL = await getDownloadURL(storageRef);
      }
      await updateDoc(doc(db, "users", user.uid), { ...updatedData, photoURL: newPhotoURL });
      setUserData(prev => ({ ...prev, ...updatedData, photoURL: newPhotoURL }));
      setPhotoURL(newPhotoURL);
      setPhotoPreview("");
      setPhotoFile(null);
      setEditingInfo(false);
      flash("Account updated successfully.", "success", "info");
    } catch (e) { flash(e.message, "error", "info"); }
    finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (!newPassword || !currentPassword) return flash("Please fill in all password fields.", "error", "password");
    if (newPassword.length < 6) return flash("New password must be at least 6 characters.", "error", "password");
    if (newPassword !== confirmPassword) return flash("Passwords do not match.", "error", "password");
    const user = auth.currentUser; if (!user) return;
    setSaving(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      flash("Password changed successfully.", "success", "password");
    } catch (e) {
      const msg = e.code === "auth/wrong-password" || e.code === "auth/invalid-credential"
        ? "Current password is incorrect."
        : e.message;
      flash(msg, "error", "password");
    }
    finally { setSaving(false); }
  };

  const saveAddress = async () => {
    const user = auth.currentUser; if (!user) return;
    const form = addressForm.data;
    if (!form.street || !form.city) return flash("Street and city are required.", "error", "address");
    let updated = [...addresses];
    if (addressForm.index === null) {
      if (form.isDefault) updated = updated.map(a => ({ ...a, isDefault: false }));
      updated.push(form);
    } else {
      if (form.isDefault) updated = updated.map((a, i) => i === addressForm.index ? a : { ...a, isDefault: false });
      updated[addressForm.index] = form;
    }
    try {
      await updateDoc(doc(db, "users", user.uid), { addresses: updated });
      setAddresses(updated); setAddressForm(null);
      flash("Address saved.", "success", "address");
    } catch (e) { flash(e.message, "error", "address"); }
  };

  const deleteAddress = async (i) => {
    if (!window.confirm("Remove this address?")) return;
    const user = auth.currentUser; if (!user) return;
    try {
      const updated = addresses.filter((_, idx) => idx !== i);
      await updateDoc(doc(db, "users", user.uid), { addresses: updated });
      setAddresses(updated);
    } catch (e) { flash(e.message, "error", "address"); }
  };

  const setDefault = async (i) => {
    const user = auth.currentUser; if (!user) return;
    const updated = addresses.map((a, idx) => ({ ...a, isDefault: idx === i }));
    await updateDoc(doc(db, "users", user.uid), { addresses: updated });
    setAddresses(updated);
  };

  if (!userData) return (
    <div className="profile-loading">
      <div className="profile-loading-spinner" />
      <p>Loading your profile...</p>
    </div>
  );

  const user     = auth.currentUser;
  const initials = userData.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "U";
  const displayPhoto = photoPreview || photoURL;

  const tabs = [
    { id: "info",     label: "Account Info",    icon: <User size={15} /> },
    { id: "address",  label: "Address Book",    icon: <MapPin size={15} /> },
    { id: "password", label: "Change Password", icon: <Lock size={15} /> },
  ];

  return (
    <div className="profile-page">
      <div className="profile-layout">

        {/* ── Sidebar ── */}
        <aside className="profile-sidebar">
          {/* Avatar + banner */}
          <div className="profile-sidebar-banner">
            <div className="profile-avatar-wrap">
              <div className="profile-avatar-ring">
                <div className="profile-avatar-lg">
                  {displayPhoto
                    ? <img src={displayPhoto} alt="avatar" />
                    : <span>{initials}</span>}
                </div>
                {editingInfo && (
                  <button className="profile-avatar-camera" onClick={() => fileInputRef.current?.click()}>
                    <Camera size={14} />
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
              </div>
              <h3 className="profile-sidebar-name">{userData.name || "User"}</h3>
              <p className="profile-sidebar-email">{user?.email}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="profile-stats">
            <div className="profile-stat">
              <span className="profile-stat-val">{orderCount}</span>
              <span className="profile-stat-label">Orders</span>
            </div>
            <div className="profile-stat-divider" />
            <div className="profile-stat">
              <span className="profile-stat-val">{addresses.length}</span>
              <span className="profile-stat-label">Addresses</span>
            </div>
            <div className="profile-stat-divider" />
            <div className="profile-stat">
              <span className={`profile-stat-val ${userData.admin === true || userData.role === "admin" ? "profile-stat-admin" : "profile-stat-member"}`}>
                {userData.admin === true || userData.role === "admin" ? "Admin" : "Member"}
              </span>
            </div>
          </div>

          {/* Quick link */}
          <button className="profile-sidebar-orders-link" onClick={() => navigate("/orders")}>
            <ShoppingBag size={15} />
            View My Orders
            <ChevronRight size={14} className="profile-sidebar-chevron" />
          </button>

          {/* Nav */}
          <nav className="profile-nav">
            {tabs.map(t => (
              <button
                key={t.id}
                className={`profile-nav-item ${activeTab === t.id ? "active" : ""}`}
                onClick={() => { setActiveTab(t.id); setEditingInfo(false); setAddressForm(null); }}
              >
                {t.icon}
                {t.label}
                <ChevronRight size={13} className="profile-nav-chevron" />
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main className="profile-main">

          {/* Account Info */}
          {activeTab === "info" && (
            <div className="profile-panel">
              <div className="profile-panel-header">
                <div>
                  <h2>Account Information</h2>
                  <p className="profile-panel-sub">Manage your personal details</p>
                </div>
                {!editingInfo && (
                  <button className="profile-edit-btn" onClick={() => setEditingInfo(true)}>
                    <Pencil size={14} /> Edit Profile
                  </button>
                )}
              </div>

              {editingInfo ? (
                <div className="profile-fields">
                  <div className="profile-field">
                    <label>Full Name</label>
                    <input className="profile-input" value={updatedData.name} placeholder="Your full name" onChange={e => setUpdatedData({ ...updatedData, name: e.target.value })} />
                  </div>
                  <div className="profile-field">
                    <label>Email Address</label>
                    <input className="profile-input" value={user?.email || ""} disabled style={{ opacity: 0.5, cursor: "not-allowed" }} />
                    <p className="profile-field-hint">Email cannot be changed here.</p>
                  </div>
                  <div className="profile-field">
                    <label>Phone Number</label>
                    <input className="profile-input" value={updatedData.phone} placeholder="+880..." onChange={e => setUpdatedData({ ...updatedData, phone: e.target.value })} />
                  </div>
                </div>
              ) : (
                <div className="profile-info-rows">
                  <div className="profile-info-row">
                    <div className="profile-info-icon"><User size={16} /></div>
                    <div className="profile-info-content">
                      <span className="profile-info-label">Full Name</span>
                      <span className="profile-info-value">{userData.name || "—"}</span>
                    </div>
                  </div>
                  <div className="profile-info-row">
                    <div className="profile-info-icon"><Mail size={16} /></div>
                    <div className="profile-info-content">
                      <span className="profile-info-label">Email Address</span>
                      <span className="profile-info-value profile-info-muted">{user?.email || "—"}</span>
                    </div>
                  </div>
                  <div className="profile-info-row">
                    <div className="profile-info-icon"><Phone size={16} /></div>
                    <div className="profile-info-content">
                      <span className="profile-info-label">Phone Number</span>
                      <span className="profile-info-value">{userData.phone || <span className="profile-info-empty">Not added yet</span>}</span>
                    </div>
                  </div>
                </div>
              )}

              {msg.section === "info" && (
                <div className={`profile-msg profile-msg-${msg.type}`}>{msg.text}</div>
              )}

              {editingInfo && (
                <div className="profile-row-actions">
                  <button className="profile-btn-primary" onClick={saveInfo} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button className="profile-btn-sec" onClick={() => { setEditingInfo(false); setPhotoFile(null); setPhotoPreview(""); }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Address Book */}
          {activeTab === "address" && (
            <div className="profile-panel">
              <div className="profile-panel-header">
                <div>
                  <h2>Address Book</h2>
                  <p className="profile-panel-sub">Manage your delivery addresses</p>
                </div>
                {!addressForm && (
                  <button className="profile-edit-btn" onClick={() => setAddressForm({ index: null, data: { ...emptyAddress } })}>
                    <Plus size={14} /> Add Address
                  </button>
                )}
              </div>

              {addresses.length === 0 && !addressForm && (
                <div className="profile-empty-state">
                  <div className="profile-empty-icon"><MapPin size={28} /></div>
                  <p className="profile-empty-title">No saved addresses</p>
                  <p className="profile-empty-sub">Add an address to speed up checkout.</p>
                  <button className="profile-edit-btn" onClick={() => setAddressForm({ index: null, data: { ...emptyAddress } })}>
                    <Plus size={14} /> Add your first address
                  </button>
                </div>
              )}

              {!addressForm && addresses.length > 0 && (
                <div className="address-grid">
                  {addresses.map((addr, i) => (
                    <div key={i} className={`address-card ${addr.isDefault ? "address-default" : ""}`}>
                      <div className="address-card-head">
                        <div className="address-card-label-row">
                          <MapPin size={13} className="address-card-pin" />
                          <span className="address-label">{addr.label}</span>
                        </div>
                        {addr.isDefault && <span className="address-badge">Default</span>}
                      </div>
                      <p className="address-street">{addr.street}</p>
                      <p className="address-city">
                        {addr.city}{addr.district ? `, ${addr.district}` : ""}
                        {addr.postalCode ? ` ${addr.postalCode}` : ""}
                      </p>
                      <div className="address-actions">
                        {!addr.isDefault && (
                          <button className="addr-link" onClick={() => setDefault(i)}>
                            <Check size={12} /> Set Default
                          </button>
                        )}
                        <button className="addr-link" onClick={() => setAddressForm({ index: i, data: { ...addr } })}>
                          <Pencil size={12} /> Edit
                        </button>
                        <button className="addr-link addr-link-danger" onClick={() => deleteAddress(i)}>
                          <Trash2 size={12} /> Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {addressForm && (
                <div className="address-form">
                  <h3 className="address-form-title">
                    {addressForm.index === null ? "New Address" : "Edit Address"}
                  </h3>
                  <div className="profile-fields">
                    <div className="profile-field">
                      <label>Label</label>
                      <div className="address-label-picker">
                        {["Home", "Work", "Other"].map(l => (
                          <button
                            key={l}
                            type="button"
                            className={`address-label-btn ${addressForm.data.label === l ? "active" : ""}`}
                            onClick={() => setAddressForm({ ...addressForm, data: { ...addressForm.data, label: l } })}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="profile-field">
                      <label>Street / Area</label>
                      <input className="profile-input" placeholder="e.g. 12 Green Road, Dhanmondi" value={addressForm.data.street} onChange={e => setAddressForm({ ...addressForm, data: { ...addressForm.data, street: e.target.value } })} />
                    </div>
                    <div className="profile-field-row">
                      <div className="profile-field">
                        <label>City</label>
                        <input className="profile-input" placeholder="Dhaka" value={addressForm.data.city} onChange={e => setAddressForm({ ...addressForm, data: { ...addressForm.data, city: e.target.value } })} />
                      </div>
                      <div className="profile-field">
                        <label>District</label>
                        <input className="profile-input" placeholder="Dhaka" value={addressForm.data.district} onChange={e => setAddressForm({ ...addressForm, data: { ...addressForm.data, district: e.target.value } })} />
                      </div>
                      <div className="profile-field">
                        <label>Postal Code</label>
                        <input className="profile-input" placeholder="1205" value={addressForm.data.postalCode} onChange={e => setAddressForm({ ...addressForm, data: { ...addressForm.data, postalCode: e.target.value } })} />
                      </div>
                    </div>
                    <label className="profile-checkbox">
                      <input type="checkbox" checked={addressForm.data.isDefault} onChange={e => setAddressForm({ ...addressForm, data: { ...addressForm.data, isDefault: e.target.checked } })} />
                      Set as default delivery address
                    </label>
                  </div>
                  {msg.section === "address" && (
                    <div className={`profile-msg profile-msg-${msg.type}`}>{msg.text}</div>
                  )}
                  <div className="profile-row-actions">
                    <button className="profile-btn-primary" onClick={saveAddress}>Save Address</button>
                    <button className="profile-btn-sec" onClick={() => setAddressForm(null)}>Cancel</button>
                  </div>
                </div>
              )}

              {msg.section === "address" && !addressForm && (
                <div className={`profile-msg profile-msg-${msg.type}`}>{msg.text}</div>
              )}
            </div>
          )}

          {/* Change Password */}
          {activeTab === "password" && (
            <div className="profile-panel">
              <div className="profile-panel-header">
                <div>
                  <h2>Change Password</h2>
                  <p className="profile-panel-sub">Keep your account secure</p>
                </div>
              </div>

              <div className="profile-fields">
                <div className="profile-field">
                  <label>Current Password</label>
                  <div className="profile-input-wrap">
                    <input type={showCurrent ? "text" : "password"} className="profile-input profile-input-pw" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter current password" />
                    <button className="profile-pw-toggle" onClick={() => setShowCurrent(v => !v)}>
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="profile-field">
                  <label>New Password</label>
                  <div className="profile-input-wrap">
                    <input type={showNew ? "text" : "password"} className="profile-input profile-input-pw" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters" />
                    <button className="profile-pw-toggle" onClick={() => setShowNew(v => !v)}>
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {newPassword.length > 0 && (
                    <div className="profile-pw-strength">
                      <div className={`profile-pw-bar ${newPassword.length >= 10 ? "strong" : newPassword.length >= 6 ? "medium" : "weak"}`} />
                      <span>{newPassword.length >= 10 ? "Strong" : newPassword.length >= 6 ? "Fair" : "Too short"}</span>
                    </div>
                  )}
                </div>
                <div className="profile-field">
                  <label>Confirm New Password</label>
                  <div className="profile-input-wrap">
                    <input type={showConfirm ? "text" : "password"} className="profile-input profile-input-pw" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" />
                    <button className="profile-pw-toggle" onClick={() => setShowConfirm(v => !v)}>
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                    <p className="profile-field-hint profile-field-hint-error">Passwords do not match</p>
                  )}
                </div>
              </div>

              {msg.section === "password" && (
                <div className={`profile-msg profile-msg-${msg.type}`}>{msg.text}</div>
              )}

              <div className="profile-row-actions" style={{ marginTop: "28px" }}>
                <button className="profile-btn-primary" onClick={savePassword} disabled={saving}>
                  {saving ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default Profile;
