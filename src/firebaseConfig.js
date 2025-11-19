import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCAmcYQXqyxMbeNSfyVXQEuuanWQz72MCM",
  authDomain: "orchestra-dafolle.firebaseapp.com",
  projectId: "orchestra-dafolle",
  storageBucket: "orchestra-dafolle.firebasestorage.app",
  messagingSenderId: "264758104604",
  appId: "1:264758104604:web:72a78cc19ffcedd2f585d9",
  measurementId: "G-5RXVEJEJEQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;