import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { auth } from "./services/firebase";
import { ThemeProvider } from "./context/ThemeContext";
import { CartProvider } from "./context/CartContext";
import Navbar from "./components/Navbar";
import LoggedNavbar from "./components/LoggedNavbar";
import Footer from "./components/Footer";
import AnnouncementBar from "./components/AnnouncementBar";
import PopupBanner from "./components/PopupBanner";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import MobileBottomNav from "./components/MobileBottomNav";
import CartDrawer from "./components/CartDrawer";
import Preloader from "./components/Preloader";
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";
import Orders from "./pages/Orders";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import AdminPanel from "./pages/AdminPanel";
import ProductPage from "./pages/ProductPage";
import "./App.css";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => setIsLoggedIn(!!user));
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try { await auth.signOut(); setIsLoggedIn(false); }
    catch (e) { console.error(e); }
  };

  return (
    <ThemeProvider>
    <CartProvider>
    <Router>
      <div className="App">
        {!loaded && <Preloader onDone={() => setLoaded(true)} />}
        <AnnouncementBar />

        {isLoggedIn
          ? <LoggedNavbar isLoggedIn={isLoggedIn} onLogout={handleLogout} />
          : <Navbar isLoggedIn={isLoggedIn} />
        }

        {isLoggedIn && <PopupBanner />}

        <Routes>
          <Route path="/"          element={<Home isLoggedIn={isLoggedIn} />} />
          <Route path="/home"      element={<Home isLoggedIn={isLoggedIn} />} />
          <Route path="/login"     element={<Login setIsLoggedIn={setIsLoggedIn} />} />
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/orders"  element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/cart"    element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin"   element={<AdminRoute><AdminPanel /></AdminRoute>} />
          <Route path="/product/:id" element={<ProtectedRoute><ProductPage /></ProtectedRoute>} />
        </Routes>

        <Footer />
        {/* Spacer so content clears the fixed bottom nav on phones */}
        <div className="mob-nav-spacer" aria-hidden="true" />
        <MobileBottomNav isLoggedIn={isLoggedIn} />
        {isLoggedIn && <CartDrawer />}
        <ScrollToTop />
      </div>
    </Router>
    </CartProvider>
    </ThemeProvider>
  );
}

export default App;
