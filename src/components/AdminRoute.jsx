import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";

const AdminRoute = ({ children }) => {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setStatus("unauth"); return; }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const d = snap.data();
        const isAdmin = d?.admin === true || d?.role === "admin";
        setStatus(isAdmin ? "ok" : "forbidden");
      } catch {
        setStatus("forbidden");
      }
    });
    return () => unsub();
  }, []);

  if (status === "loading")   return <div style={{ minHeight: "60vh" }} />;
  if (status === "unauth")    return <Navigate to="/login" replace />;
  if (status === "forbidden") return <Navigate to="/" replace />;
  return children;
};

export default AdminRoute;
