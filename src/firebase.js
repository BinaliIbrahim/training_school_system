// src/firebase.js
"use client";

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDSY5qE0F9PIsggCGd4PlX46jKyNHq1g6Y",
  authDomain: "hostelrentalapp.firebaseapp.com",
  projectId: "hostelrentalapp",
  storageBucket: "hostelrentalapp.firebasestorage.app",
  messagingSenderId: "347443024230",
  appId: "1:347443024230:web:7ddce67ec9b6079ec7f8a7",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth, signInWithEmailAndPassword, signOut };