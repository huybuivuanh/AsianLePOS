// app/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// This is public firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBF5rK8BlqdVpjI90Kkx2INa5Zk5L3RmZA",
  authDomain: "asianlepos.firebaseapp.com",
  projectId: "asianlepos",
  storageBucket: "asianlepos.firebasestorage.app",
  messagingSenderId: "173502388712",
  appId: "1:173502388712:web:234143e63b050935f72c5d",
  measurementId: "G-ZB1DGHFBFR",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
