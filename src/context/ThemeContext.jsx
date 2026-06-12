import { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";

const ThemeContext = createContext({ theme: "light", preference: "light", setUserTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

const resolveSystem = () =>
  window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";

export const ThemeProvider = ({ children }) => {
  const saved = localStorage.getItem("ub_theme"); // "light" | "dark" | "system" | null

  const [preference, setPreference] = useState(saved || "");
  const [theme, setTheme] = useState(
    saved === "light" || saved === "dark" ? saved :
    saved === "system" ? resolveSystem() : "light"
  );

  useEffect(() => {
    if (saved && saved !== "") {
      if (saved === "system") setTheme(resolveSystem());
      else setTheme(saved);
    } else {
      // No user preference — use admin's global setting from Firestore
      getDoc(doc(db, "config", "store"))
        .then(snap => {
          const global = snap.exists() ? snap.data().globalTheme : null;
          setTheme(global === "light" || global === "dark" ? global : "light");
        })
        .catch(() => setTheme("light"));
    }
  }, []);

  // Apply theme to <html> element so every CSS variable picks it up
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Listen to system preference changes when user chose "system"
  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e) => setTheme(e.matches ? "light" : "dark");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  const setUserTheme = (pref) => {
    localStorage.setItem("ub_theme", pref);
    setPreference(pref);
    setTheme(pref === "system" ? resolveSystem() : pref);
  };

  return (
    <ThemeContext.Provider value={{ theme, preference, setUserTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
