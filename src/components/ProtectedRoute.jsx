import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";

const ProtectedRoute = ({ children }) => {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setStatus(user ? "ok" : "unauth");
    });
    return () => unsub();
  }, []);

  if (status === "loading") return <div style={{ minHeight: "60vh" }} />;
  if (status === "unauth") return <Navigate to="/login" replace />;
  return children;
};

export default ProtectedRoute;
