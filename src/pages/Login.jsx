import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../services/firebase";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, GoogleAuthProvider,
  signInWithPopup, signInWithRedirect, getRedirectResult,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ensureUserProfile } from "../services/userProfile";
import "../styles/Login.css";

const cleanError = (msg = "") => {
  if (msg.includes("user-not-found") || msg.includes("invalid-credential") || msg.includes("invalid-email"))
    return "No account found with this email or password.";
  if (msg.includes("wrong-password"))
    return "Incorrect password.";
  if (msg.includes("email-already-in-use"))
    return "An account with this email already exists.";
  if (msg.includes("too-many-requests"))
    return "Too many attempts. Please try again later.";
  if (msg.includes("network-request-failed"))
    return "No internet connection. Please check your network.";
  if (msg.includes("weak-password"))
    return "Password must be at least 6 characters.";
  if (msg.includes("popup-closed-by-user") || msg.includes("popup-blocked"))
    return null; // suppress — redirect fallback will handle it
  return msg.replace(/Firebase:\s*/i, "").replace(/\s*\(auth\/[\w-]+\)\.?\s*$/i, "").trim();
};

const Login = ({ setIsLoggedIn }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ firstName: "", lastName: "", phone: "", email: "", password: "" });
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (user) { setIsLoggedIn(true); navigate("/"); }
    });
    return () => unsub();
  }, []);

  // Handle the result when returning from Google's redirect sign-in on mobile
  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (!result?.user) return;
        await ensureUserProfile(result.user);
        setIsLoggedIn(true);
        navigate("/");
      })
      .catch((err) => {
        setLoading(false);
        const msg = cleanError(err.message);
        if (msg) setError(msg);
      });
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(""); setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) { setError("Email and password are required."); return; }
    if (formData.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await setDoc(doc(db, "users", cred.user.uid), {
          uid:   cred.user.uid,
          name:  `${formData.firstName} ${formData.lastName}`.trim(),
          phone: formData.phone,
          email: formData.email,
          role:  "user",
        });
      }
      setIsLoggedIn(true); navigate("/");
    } catch (err) {
      const msg = cleanError(err.message);
      if (msg) setError(msg);
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();
    try {
      // Popup works on both desktop and mobile (triggered from a user gesture).
      // Redirect is unreliable on mobile Safari due to ITP blocking cross-site cookies.
      const result = await signInWithPopup(auth, provider);
      await ensureUserProfile(result.user);
      setIsLoggedIn(true); navigate("/");
    } catch (err) {
      if (err.code === "auth/popup-blocked") {
        // Genuine popup block — fall back to redirect
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectErr) {
          setLoading(false);
          const msg = cleanError(redirectErr.message);
          if (msg) setError(msg);
        }
        return;
      }
      const msg = cleanError(err.message);
      if (msg) setError(msg);
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!formData.email) { setError("Enter your email address first."); return; }
    try {
      await sendPasswordResetEmail(auth, formData.email);
      setSuccess("Password reset email sent — check your inbox.");
      setError("");
    } catch (err) {
      const msg = cleanError(err.message);
      if (msg) setError(msg);
    }
  };

  return (
    <div className="login-page">

      {/* ── Left branding panel (desktop only) ── */}
      <div className="login-left">
        <div className="login-left-bg" />
        <div className="login-left-content">
          <img src="/urban-bangla-logo.png" alt="logo" className="login-logo" />
          <h1 className="login-brand">URBAN বাংলা</h1>
          <p className="login-tagline">Bangladesh style.<br />Street fashion, delivered.</p>
          <div className="login-features">
            {["Jerseys", "Bangladesh Flags", "Streetwear", "Fast Delivery"].map(f => (
              <div key={f} className="login-feature-item">✓ {f}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="login-right">
        <div className="login-card">

          {/* Mobile-only compact brand header */}
          <div className="login-mobile-brand">
            <img src="/urban-bangla-logo.png" alt="logo" className="login-mobile-logo" />
            <div>
              <div className="login-mobile-name">URBAN বাংলা</div>
              <div className="login-mobile-sub">Bangladesh Street Fashion</div>
            </div>
          </div>

          <h2 className="login-card-title">{isLoginMode ? "Sign In" : "Create Account"}</h2>

          {error   && <div className="login-error"   role="alert">{error}</div>}
          {success && <div className="login-success" role="status">{success}</div>}

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {!isLoginMode && (
              <>
                <div className="login-row">
                  <input
                    name="firstName" placeholder="First name"
                    value={formData.firstName} onChange={handleChange}
                    className="login-input"
                    autoComplete="given-name"
                    autoCapitalize="words"
                  />
                  <input
                    name="lastName" placeholder="Last name"
                    value={formData.lastName} onChange={handleChange}
                    className="login-input"
                    autoComplete="family-name"
                    autoCapitalize="words"
                  />
                </div>
                <input
                  name="phone" placeholder="Phone number"
                  value={formData.phone} onChange={handleChange}
                  className="login-input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </>
            )}
            <input
              name="email" placeholder="Email address"
              value={formData.email} onChange={handleChange}
              className="login-input"
              type="email"
              inputMode="email"
              autoComplete={isLoginMode ? "username" : "email"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
            <input
              name="password" placeholder="Password"
              value={formData.password} onChange={handleChange}
              className="login-input"
              type="password"
              autoComplete={isLoginMode ? "current-password" : "new-password"}
            />
            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? "Please wait…" : isLoginMode ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="login-divider"><span>or</span></div>

          <button onClick={handleGoogle} className="login-google" type="button" disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A9.006 9.006 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            {loading ? "Opening Google..." : "Continue with Google"}
          </button>

          <div className="login-footer">
            <p className="login-toggle">
              {isLoginMode ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => { setIsLoginMode(m => !m); setError(""); setSuccess(""); }}
                className="login-toggle-btn"
              >
                {isLoginMode ? "Sign Up" : "Sign In"}
              </button>
            </p>
            {isLoginMode && (
              <button type="button" onClick={handleForgot} className="login-forgot">
                Forgot password?
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
