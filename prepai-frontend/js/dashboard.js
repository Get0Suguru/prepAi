import { auth, signOut } from './firebase-config.js';

const API_BASE_URL = 'http://localhost:8080';

// Display user info
const userNameSpan = document.getElementById('userName');
const userEmailSpan = document.getElementById('userEmail');

if (userNameSpan) {
    const userName = localStorage.getItem('userName') || 'User';
    userNameSpan.textContent = userName;
}

if (userEmailSpan) {
    const userEmail = localStorage.getItem('userEmail') || '';
    userEmailSpan.textContent = userEmail;
}

// Handle logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout error:', error);
        }
    });
}

// Handle history button
const historyBtn = document.getElementById('historyBtn');
if (historyBtn) {
    historyBtn.addEventListener('click', () => {
        window.location.href = 'history.html';
    });
}

// Handle start interview
const startBtn = document.getElementById('startInterviewBtn');
const topicSelect = document.getElementById('topicSelect');
const customTopic = document.getElementById('customTopic');

if (startBtn) {
    startBtn.addEventListener('click', async () => {
        let topic = topicSelect.value;
        if (customTopic.value.trim()) {
            topic = customTopic.value.trim();
        }
        
        const userId = localStorage.getItem('userId');
        const userEmail = localStorage.getItem('userEmail');
        
        if (!userId || !userEmail) {
            alert('Please login again');
            window.location.href = 'index.html';
            return;
        }
        
        startBtn.disabled = true;
        startBtn.textContent = 'Starting...';
        
        try {
            // Start session with userEmail
            const sessionResponse = await fetch(`${API_BASE_URL}/api/interview/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    topic: topic, 
                    userId: userId,
                    userEmail: userEmail  // ← Send email to backend
                })
            });
            
            if (!sessionResponse.ok) throw new Error('Failed to start session');
            
            const session = await sessionResponse.json();
            localStorage.setItem('sessionId', session.id);
            localStorage.setItem('interviewTopic', topic);
            localStorage.setItem('questionsAnswered', '0');
            localStorage.setItem('totalScore', '0');
            localStorage.setItem('previousQuestions', '');
            
            // Redirect to interview page
            window.location.href = 'interview.html';
        } catch (error) {
            console.error('Error starting session:', error);
            alert('Failed to start interview: ' + error.message);
            startBtn.disabled = false;
            startBtn.textContent = 'Start Interview 🚀';
        }
    });
}