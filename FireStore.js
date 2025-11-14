import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA2MEjYgdMkvXMw9_dHKRDSgbK0DH2Hppg",
  authDomain: "fundora-a66eb.firebaseapp.com",
  projectId: "fundora-a66eb",
  storageBucket: "fundora-a66eb.firebasestorage.app",
  messagingSenderId: "1046894730551",
  appId: "1:1046894730551:web:ad6005997fcfef8b808eb2",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
