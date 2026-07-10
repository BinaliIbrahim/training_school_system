// src/hooks/useUserRole.js
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase"; // your firebase config file

export const useUserRole = () => {
  const [role, setRole] = useState(null);
  const auth = getAuth();

  useEffect(() => {
    const loadRole = async () => {
      if (!auth.currentUser) return;

      const ref = doc(db, "users", auth.currentUser.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setRole(snap.data().role); // ADMIN | STUDENT | SUPER-ADMIN
      }
    };

    loadRole();
  }, [auth.currentUser]);

  return role;
};
