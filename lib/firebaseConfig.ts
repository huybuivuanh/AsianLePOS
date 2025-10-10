// app/lib/firebase.ts
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  Auth,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

// Public Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBF5rK8BlqdVpjI90Kkx2INa5Zk5L3RmZA",
  authDomain: "asianlepos.firebaseapp.com",
  projectId: "asianlepos",
  storageBucket: "asianlepos.firebasestorage.app",
  messagingSenderId: "173502388712",
  appId: "1:173502388712:web:234143e63b050935f72c5d",
  measurementId: "G-ZB1DGHFBFR",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
if (Platform.OS === "web") {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
}

export const db = getFirestore(app);
export { auth };
