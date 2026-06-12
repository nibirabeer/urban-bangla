import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCbqbXx8Wl66DmnudZJnrw6pcwRvZpJlSE",
  authDomain: "urban-bangla.firebaseapp.com",
  projectId: "urban-bangla",
  storageBucket: "urban-bangla.firebasestorage.app",
  messagingSenderId: "650173002485",
  appId: "1:650173002485:web:a0a7fb7dd7f12f245c0bbc"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { firebaseConfig };
export default app;
