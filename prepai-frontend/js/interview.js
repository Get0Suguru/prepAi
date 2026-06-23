import { auth, signOut } from './firebase-config.js';

const API_BASE_URL = 'http://localhost:8080';

let currentQuestion = '';
let currentQuestionOrder = 0;
let totalQuestions = 5;
let sessionComplete = false;
let totalScore = 0;
let sessionId = null;
let interviewTopic = null;

// DOM Elements
const topicDisplay = document.getElementById('topicDisplay');
const questionCounter = document.getElementById('questionCounter');
const totalQuestionsSpan = document.getElementById('totalQuestions');
const progressFill = document.getElementById('progressFill');
const questionText = document.getElementById('questionText');
const answerInput = document.getElementById('answerInput');
const submitBtn = document.getElementById('submitAnswerBtn');
const skipBtn = document.getElementById('skipQuestionBtn');
const feedbackSection = document.getElementById('feedbackSection');
const scoreBadge = document.getElementById('scoreBadge');
const feedbackContent = document.getElementById('feedbackContent');
const nextBtn = document.getElementById('nextQuestionBtn');
const sessionCompleteDiv = document.getElementById('sessionComplete');
const questionCard = document.getElementById('questionCard');
const endSessionBtn = document.getElementById('endSessionBtn');

// Save question to database
async function saveQuestionToDB(question, answer, feedback, score, order) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/interview/save-question`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: sessionId,
                question: question,
                answer: answer,
                feedback: feedback,
                score: score,
                questionOrder: order
            })
        });
        
        if (!response.ok) {
            console.error('Failed to save question to DB');
        } else {
            console.log('Question saved to DB successfully');
        }
    } catch (error) {
        console.error('Error saving question:', error);
    }
}

// Initialize interview
async function initInterview() {
    sessionId = localStorage.getItem('sessionId');
    interviewTopic = localStorage.getItem('interviewTopic');
    
    if (!sessionId || !interviewTopic) {
        alert('No active interview session. Please start from dashboard.');
        window.location.href = 'dashboard.html';
        return;
    }
    
    topicDisplay.textContent = `Topic: ${interviewTopic}`;
    totalQuestionsSpan.textContent = totalQuestions;
    
    await generateQuestion();
}

// Generate question from AI
async function generateQuestion() {
    questionText.textContent = 'Generating question...';
    submitBtn.disabled = true;
    skipBtn.disabled = true;
    
    try {
        // Get previous questions from localStorage
        let previousQuestions = localStorage.getItem('previousQuestions') || '';
        
        // Log to debug
        console.log('Previous questions:', previousQuestions);
        
        const requestBody = {
            topic: interviewTopic,
            previousQuestions: previousQuestions  // Sends like: "Q1|Q2|Q3"
        };
        
        const response = await fetch(`${API_BASE_URL}/api/interview/generate-question`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        currentQuestion = data.question;
        questionText.textContent = currentQuestion;
        
        // Append new question to previous questions
        const updatedQuestions = previousQuestions 
            ? previousQuestions + '|' + currentQuestion 
            : currentQuestion;
        localStorage.setItem('previousQuestions', updatedQuestions);
        
        console.log('Updated previous questions:', updatedQuestions);
        
        submitBtn.disabled = false;
        skipBtn.disabled = false;
        answerInput.value = '';
        feedbackSection.classList.add('hidden');
        
    } catch (error) {
        console.error('Error generating question:', error);
        questionText.textContent = 'Error generating question. Please try again.';
        submitBtn.disabled = false;
        skipBtn.disabled = false;
    }
}

// Evaluate answer
async function evaluateAnswer(skip = false) {
    const answer = skip ? "I don't know this question." : answerInput.value.trim();
    
    if (!skip && !answer) {
        alert('Please enter your answer before submitting.');
        return;
    }
    
    submitBtn.disabled = true;
    skipBtn.disabled = true;
    answerInput.disabled = true;
    
    questionText.textContent = 'Evaluating your answer...';
    
    try {
        const requestBody = {
            question: currentQuestion,
            answer: answer,
            topic: interviewTopic
        };
        
        console.log('Sending evaluation:', requestBody);
        
        const response = await fetch(`${API_BASE_URL}/api/interview/evaluate-answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to evaluate answer: ${errorText}`);
        }
        
    const data = await response.json();

    console.log('Evaluation response:', data);

    // Debug log to see what backend actually sent
    console.log('Backend sent - Score:', data.score, 'Feedback:', data.feedback);

    // Use EXACTLY what backend returns
    const actualScore = typeof data.score === 'number' ? data.score : parseInt(data.score) || 0;
    const actualFeedback = data.feedback || 'No feedback available.';

    scoreBadge.textContent = `Score: ${actualScore}/100`;
    feedbackContent.innerHTML = actualFeedback.replace(/\n/g, '<br>');
    feedbackSection.classList.remove('hidden');

    // Store answer locally
    storeAnswer(currentQuestion, answer, actualFeedback, actualScore);

    // SAVE TO DATABASE - THIS IS THE NEW PART
    await saveQuestionToDB(currentQuestion, answer, actualFeedback, actualScore, currentQuestionOrder + 1);

    const currentTotal = parseInt(localStorage.getItem('totalScore') || '0');
    const newTotal = currentTotal + actualScore;
    localStorage.setItem('totalScore', newTotal);

    // Update question count (but don't show 6/5)
    currentQuestionOrder++;

    // Only update progress if we haven't exceeded total
    if (currentQuestionOrder <= totalQuestions) {
        updateProgress();
    }

    // If this was the last question, change button text
    if (currentQuestionOrder >= totalQuestions) {
        nextBtn.textContent = 'Complete Interview 🎉';

        // Disable answer input for last question after submission
        answerInput.disabled = true;
        submitBtn.disabled = true;
        skipBtn.disabled = true;
    }

    answerInput.disabled = false;
        
    } catch (error) {
        console.error('Error evaluating answer:', error);
        alert('Error evaluating answer. Please try again.');
        submitBtn.disabled = false;
        skipBtn.disabled = false;
        answerInput.disabled = false;
        questionText.textContent = currentQuestion;
    }
}

function storeAnswer(question, answer, feedback, score) {
    const answers = JSON.parse(localStorage.getItem('interviewAnswers') || '[]');
    answers.push({
        question,
        answer,
        feedback,
        score,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('interviewAnswers', JSON.stringify(answers));
}

function updateProgress() {
    // Don't show more than totalQuestions
    const displayOrder = Math.min(currentQuestionOrder, totalQuestions);
    const progress = (displayOrder / totalQuestions) * 100;
    progressFill.style.width = `${progress}%`;
    questionCounter.textContent = displayOrder;
}

async function loadNextQuestion() {
    // If we've completed all questions, complete the session
    if (currentQuestionOrder >= totalQuestions) {
        await completeSession();
    } else {
        await generateQuestion();
        submitBtn.disabled = false;
        skipBtn.disabled = false;
        answerInput.disabled = false;
        answerInput.value = '';
    }
}

async function completeSession() {
    sessionComplete = true;
    questionCard.classList.add('hidden');
    sessionCompleteDiv.classList.remove('hidden');
    
    const totalScoreValue = parseInt(localStorage.getItem('totalScore') || '0');
    const averageScore = Math.round(totalScoreValue / totalQuestions);
    
    const finalScoreSpan = document.getElementById('finalScore');
    const finalFeedbackDiv = document.getElementById('finalFeedback');
    
    finalScoreSpan.textContent = averageScore;
    
    let feedbackText = '';
    if (averageScore >= 80) {
        feedbackText = '🎉 Excellent performance! You have strong technical knowledge. Keep up the great work!';
    } else if (averageScore >= 60) {
        feedbackText = '👍 Good job! You have solid fundamentals. Review the feedback to improve further.';
    } else if (averageScore >= 40) {
        feedbackText = '📚 Good attempt! Focus on learning core concepts and practice more.';
    } else {
        feedbackText = '💪 Keep practicing! Review the topics thoroughly and try again. Every interview is a learning opportunity.';
    }
    
    finalFeedbackDiv.innerHTML = `<p style="margin-top: 15px;">${feedbackText}</p>`;
    
    // Send completion to backend
    try {
        await fetch(`${API_BASE_URL}/api/interview/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: sessionId,
                finalScore: averageScore
            })
        });
    } catch (error) {
        console.error('Error completing session:', error);
    }
    
    localStorage.removeItem('sessionId');
    localStorage.removeItem('previousQuestions');
    localStorage.removeItem('interviewAnswers');
    localStorage.removeItem('sessionQuestions');
    localStorage.removeItem('totalScore');
}

function endSession() {
    if (confirm('Are you sure you want to end this interview session? Progress will be lost.')) {
        clearSessionData();
        window.location.href = 'dashboard.html';
    }
}

function clearSessionData() {
    localStorage.removeItem('sessionId');
    localStorage.removeItem('interviewTopic');
    localStorage.removeItem('previousQuestions');
    localStorage.removeItem('interviewAnswers');
    localStorage.removeItem('sessionQuestions');
    localStorage.removeItem('questionsAnswered');
    localStorage.removeItem('totalScore');
}

// Event listeners
if (submitBtn) {
    submitBtn.addEventListener('click', () => evaluateAnswer(false));
}

if (skipBtn) {
    skipBtn.addEventListener('click', () => evaluateAnswer(true));
}

if (nextBtn) {
    nextBtn.addEventListener('click', loadNextQuestion);
}

if (endSessionBtn) {
    endSessionBtn.addEventListener('click', endSession);
}

const dashboardBtn = document.getElementById('dashboardBtn');
if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
        window.location.href = 'dashboard.html';
    });
}

auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        initInterview();
    }
});

const logoutBtnInterview = document.getElementById('logoutBtn');
if (logoutBtnInterview) {
    logoutBtnInterview.addEventListener('click', async () => {
        await signOut(auth);
        clearSessionData();
        window.location.href = 'index.html';
    });
}