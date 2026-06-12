import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import ClothingList from "../components/ClothingList";
import WelcomeHero from "../components/WelcomeHero";

const Home = () => {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return () => unsub();
  }, []);
  return <div>{user ? <WelcomeHero /> : <ClothingList />}</div>;
};

export default Home;
