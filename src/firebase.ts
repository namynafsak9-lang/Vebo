import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, query, where, orderBy, addDoc, updateDoc, deleteDoc, getDoc, getDocs, setDoc, Timestamp, getDocFromServer, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Connection check on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test_connection', 'ping'));
    console.log("Firebase connection test succeeded!");
  } catch (error) {
    console.error("Firebase connection test failed with error:", error);
    if (error instanceof Error && (error.message.includes('client is offline') || error.message.includes('offline'))) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
  serverTimestamp,
  signInWithPopup,
  onAuthStateChanged
};

export type { User };
