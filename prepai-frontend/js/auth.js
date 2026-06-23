import { auth, provider, signInWithPopup, onAuthStateChanged, signOut } from './firebase-config.js';

// Handle Google Login
const googleLoginBtn = document.getElementById('googleLoginBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');

if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        googleLoginBtn.disabled = true;
        loadingSpinner.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            console.log('User logged in:', user.email);
            
            // Store user info in localStorage
            localStorage.setItem('userId', user.uid);
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('userName', user.displayName || user.email.split('@')[0]);
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = 'Login failed: ' + error.message;
            errorMessage.classList.remove('hidden');
            googleLoginBtn.disabled = false;
            loadingSpinner.classList.add('hidden');
        }
    });
}

// Check auth state on page load
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        localStorage.setItem('userId', user.uid);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userName', user.displayName || user.email.split('@')[0]);
        
        // If on login page, redirect to dashboard
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
            window.location.href = 'dashboard.html';
        }
    } else {
        // User is signed out
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        localStorage.removeItem('sessionId');
        
        // If not on login page, redirect to login
        if (!window.location.pathname.includes('index.html') && 
            window.location.pathname !== '/' && 
            !window.location.pathname.endsWith('/')) {
            window.location.href = 'index.html';
        }
    }
});