import React, { useEffect, useState, useRef } from "react";
import { collection, getDocs, updateDoc, doc, deleteDoc, setDoc } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Camera } from "lucide-react";
import { db } from "../services/firebase";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};
import "../styles/UserManagement.css";

const emptyUser = { name: "", email: "", password: "", phone: "", role: "user" };

const cleanError = (code) => {
  const map = {
    "auth/email-already-in-use": "This email is already registered.",
    "auth/weak-password":        "Password must be at least 6 characters.",
    "auth/invalid-email":        "Invalid email address.",
    "auth/too-many-requests":    "Too many attempts. Try again later.",
  };
  return map[code] || null;
};

const UserManagement = () => {
  const [users, setUsers]       = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filter, setFilter]     = useState("all");
  const [search, setSearch]     = useState("");
  const [editingId, setEditingId] = useState(null);
  const [addOpen, setAddOpen]   = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [newUser, setNewUser]       = useState(emptyUser);
  const [editUser, setEditUser]     = useState(emptyUser);
  const [photoFile, setPhotoFile]   = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const fileInputRef = useRef(null);

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(data);
      applyFilter(filter, search, data);
    } catch (e) { setError("Failed to fetch users."); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const applyFilter = (f, s, list) => {
    let result = list;
    if (f === "admin") result = result.filter((u) => u.admin || u.role === "admin");
    if (f === "user")  result = result.filter((u) => !u.admin && u.role !== "admin");
    if (s) result = result.filter((u) =>
      u.name?.toLowerCase().includes(s.toLowerCase()) ||
      u.email?.toLowerCase().includes(s.toLowerCase())
    );
    setFiltered(result);
  };

  const handleSearch = (val) => { setSearch(val); applyFilter(filter, val, users); };
  const handleFilter = (val) => { setFilter(val); applyFilter(val, search, users); };

  const handleAdd = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      setError("Name, email and password are required."); return;
    }
    if (newUser.password.length < 6) {
      setError("Password must be at least 6 characters."); return;
    }
    setLoading(true); setError("");

    let secondaryApp = null;
    try {
      // Create auth account on a secondary app so admin stays signed in
      secondaryApp = initializeApp(firebaseConfig, `create_${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      const cred = await createUserWithEmailAndPassword(secondaryAuth, newUser.email, newUser.password);
      const uid = cred.user.uid;

      // Upload profile photo if one was selected
      let photoURL = "";
      if (photoFile) {
        const storage = getStorage();
        const storageRef = ref(storage, `profiles/${uid}`);
        await uploadBytes(storageRef, photoFile);
        photoURL = await getDownloadURL(storageRef);
      }

      await setDoc(doc(db, "users", uid), {
        uid,
        name:      newUser.name,
        email:     newUser.email,
        phone:     newUser.phone || "",
        role:      newUser.role || "user",
        photoURL,
        createdAt: new Date(),
      });

      await secondaryAuth.signOut();
      setAddOpen(false);
      setNewUser(emptyUser);
      setPhotoFile(null);
      setPhotoPreview("");
      fetchUsers();
    } catch (e) {
      console.error("Create user error:", e);
      setError(cleanError(e.code) || e.message || "Failed to create user.");
    } finally {
      if (secondaryApp) { try { await deleteApp(secondaryApp); } catch {} }
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editUser.name || !editUser.email) { setError("Name and email are required."); return; }
    setLoading(true); setError("");
    try {
      await updateDoc(doc(db, "users", editingId), {
        name: editUser.name, email: editUser.email,
        phone: editUser.phone, role: editUser.role,
      });
      setEditOpen(false); fetchUsers();
    } catch (e) { console.error(e); setError(e?.message || "Failed to update user."); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await deleteDoc(doc(db, "users", id));
      fetchUsers();
    } catch (e) { console.error(e); setError(e?.message || "Failed to delete user."); }
  };

  const handleToggleAdmin = async () => {
    const isAdminNow = editUser.role === "admin";
    try {
      await updateDoc(doc(db, "users", editingId), { role: isAdminNow ? "user" : "admin" });
      setEditUser((p) => ({ ...p, role: isAdminNow ? "user" : "admin" }));
      fetchUsers();
    } catch (e) { console.error(e); setError(e?.message || "Failed to update role."); }
  };

  const isAdmin = (u) => u.admin || u.role === "admin";

  return (
    <div className="um-wrap">

      {/* Top bar */}
      <div className="um-topbar">
        <div className="um-search-wrap">
          <svg className="um-search-icon" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            className="um-search"
            placeholder="Search users..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="um-controls">
          <select className="um-select" value={filter} onChange={(e) => handleFilter(e.target.value)}>
            <option value="all">All users</option>
            <option value="admin">Admins</option>
            <option value="user">Users</option>
          </select>
          <button className="um-add-btn" onClick={() => { setError(""); setAddOpen(true); }}>
            + Add user
          </button>
        </div>
      </div>

      {error && <p className="um-error">{error}</p>}

      {/* Stats */}
      <div className="um-stats">
        <div className="um-stat">
          <span className="um-stat-label">Total</span>
          <span className="um-stat-val">{users.length}</span>
        </div>
        <div className="um-stat">
          <span className="um-stat-label">Admins</span>
          <span className="um-stat-val">{users.filter(isAdmin).length}</span>
        </div>
        <div className="um-stat">
          <span className="um-stat-label">Showing</span>
          <span className="um-stat-val">{filtered.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="um-table-wrap">
        <div className="um-table-header">
          <span>User</span>
          <span>Email</span>
          <span>Phone</span>
          <span>Role</span>
          <span></span>
        </div>
        {filtered.length === 0 ? (
          <div className="um-empty">No users found.</div>
        ) : filtered.map((u) => (
          <div key={u.id} className="um-row">
            <div className="um-user-cell">
              <div className="um-avatar">
                {u.photoURL
                  ? <img src={u.photoURL} alt={u.name} />
                  : <span>{u.name?.[0] || "U"}</span>
                }
              </div>
              <span className="um-name">{u.name}</span>
            </div>
            <span className="um-cell">{u.email}</span>
            <span className="um-cell um-muted">{u.phone || "—"}</span>
            <span className="um-cell">
              <span className={`um-badge ${isAdmin(u) ? "um-badge-admin" : "um-badge-user"}`}>
                {isAdmin(u) ? "Admin" : "User"}
              </span>
            </span>
            <div className="um-actions">
              <button className="um-btn-edit" onClick={() => {
                setEditingId(u.id);
                setEditUser({ name: u.name, email: u.email, phone: u.phone || "", role: u.role || "user" });
                setError("");
                setEditOpen(true);
              }}>Edit</button>
              <button className="um-btn-del" onClick={() => handleDelete(u.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Add User Modal ── */}
      {addOpen && (
        <div className="um-overlay">
          <div className="um-modal">
            <div className="um-modal-header">
              <h3>Create new user</h3>
              <button className="um-modal-close" onClick={() => { setAddOpen(false); setError(""); }}>✕</button>
            </div>
            {error && <p className="um-error" style={{ margin: "0 26px 4px" }}>{error}</p>}
            <div className="um-fields">

              {/* Photo upload */}
              <div className="um-photo-row">
                <div
                  className="um-photo-circle"
                  onClick={() => fileInputRef.current?.click()}
                  title="Click to upload photo"
                >
                  {photoPreview
                    ? <img src={photoPreview} alt="preview" />
                    : <Camera size={22} />
                  }
                  <div className="um-photo-overlay"><Camera size={14} /></div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setPhotoFile(file);
                    setPhotoPreview(URL.createObjectURL(file));
                  }}
                />
                <div className="um-photo-hint">
                  <p>Profile photo <span className="um-optional">(optional)</span></p>
                  <p>Click the circle to upload</p>
                </div>
              </div>

              <div className="um-field-row">
                <div className="um-field">
                  <label>Full Name</label>
                  <input placeholder="e.g. John Doe" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
                </div>
                <div className="um-field">
                  <label>Email</label>
                  <input type="email" placeholder="user@email.com" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                </div>
              </div>
              <div className="um-field-row">
                <div className="um-field">
                  <label>Password</label>
                  <input type="password" placeholder="Min. 6 characters" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                </div>
                <div className="um-field">
                  <label>Phone <span className="um-optional">(optional)</span></label>
                  <input placeholder="+880..." value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} />
                </div>
              </div>
              <div className="um-field">
                <label>Role</label>
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="um-modal-footer">
              <button className="um-btn-sec" onClick={() => {
                setAddOpen(false); setError("");
                setPhotoFile(null); setPhotoPreview("");
              }}>Cancel</button>
              <button className="um-btn-primary" onClick={handleAdd} disabled={loading}>
                {loading ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {editOpen && (
        <div className="um-overlay">
          <div className="um-modal">
            <div className="um-modal-header">
              <h3>Edit user</h3>
              <button className="um-modal-close" onClick={() => { setEditOpen(false); setError(""); }}>✕</button>
            </div>
            {error && <p className="um-error" style={{ margin: "0 26px 4px" }}>{error}</p>}
            <div className="um-fields">
              <div className="um-field-row">
                <div className="um-field">
                  <label>Name</label>
                  <input value={editUser.name} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} />
                </div>
                <div className="um-field">
                  <label>Email</label>
                  <input type="email" value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} />
                </div>
              </div>
              <div className="um-field-row">
                <div className="um-field">
                  <label>Phone</label>
                  <input value={editUser.phone} onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })} />
                </div>
                <div className="um-field">
                  <label>Role</label>
                  <select value={editUser.role} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="um-modal-footer">
              <button className="um-btn-toggle" onClick={handleToggleAdmin} disabled={loading}>
                {editUser.role === "admin" ? "Remove admin" : "Make admin"}
              </button>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="um-btn-sec" onClick={() => { setEditOpen(false); setError(""); }}>Cancel</button>
                <button className="um-btn-primary" onClick={handleUpdate} disabled={loading}>
                  {loading ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
