import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export const ensureUserProfile = async (user) => {
  if (!user?.uid) return;

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      name: user.displayName || "",
      email: user.email || "",
      phone: "",
      photoURL: user.photoURL || "",
      role: "user",
    });
  }
};
