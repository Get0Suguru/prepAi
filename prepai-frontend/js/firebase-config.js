import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyARzhH-tO7AWOmsJghJH5WntZp0eyJfS3w",
    authDomain: "prepai-db580.firebaseapp.com",
    projectId: "prepai-db580",
    storageBucket: "prepai-db580.firebasestorage.app",
    messagingSenderId: "168445171922",
    appId: "1:168445171922:web:69d85b6d2686c1b924b50b",
    measurementId: "G-2M479HYZB2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider, signInWithPopup, onAuthStateChanged, signOut };