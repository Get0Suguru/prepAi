package com.prepai.controller;

import com.prepai.model.InterviewSession;
import com.prepai.model.Question;
import com.prepai.repository.SessionRepository;
import com.prepai.repository.QuestionRepository;
import com.prepai.service.GeminiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.regex.Matcher;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/interview")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class InterviewController {

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private QuestionRepository questionRepository;

    @PostMapping("/start")
    public InterviewSession startSession(@RequestBody Map<String, String> request) {
        InterviewSession session = new InterviewSession();
        session.setTopic(request.get("topic"));
        session.setUserId(request.get("userId"));
        session.setUserEmail(request.get("userEmail"));  // ← ADD THIS
        session.setStatus("active");
        return sessionRepository.save(session);
    }

    @PostMapping("/generate-question")
    public Map<String, String> generateQuestion(@RequestBody Map<String, String> request) {
        String topic = request.get("topic");
        String sessionId = request.get("sessionId");

        // Dynamic concept list based on topic (grows with each session)
        int questionCount = request.containsKey("previousQuestions") && request.get("previousQuestions") != null ?
                request.get("previousQuestions").split("\\|").length : 0;

        // Use timestamp + sessionId + questionCount for near-infinite variety
        long timestamp = System.currentTimeMillis();
        int seed = sessionId != null ?
                (int)((Long.parseLong(sessionId) * 1000 + timestamp + questionCount * 100) % 10000) :
                (int)((timestamp + questionCount * 100) % 10000);

        // Instead of fixed starters, use a dynamic prompt that forces creativity
        String prompt = String.format(
                "Generate 1 unique, creative interview question about %s. " +
                        "The question should be different from typical questions asked about this topic. " +
                        "Be specific and interesting. " +
                        "Maximum 15 words. Return ONLY the question text, no explanations.",
                topic
        );

        // Add a random modifier to ensure variety
        String[] modifiers = {"", "Focus on practical application.", "Focus on debugging.",
                "Focus on optimization.", "Focus on security.", "Focus on scalability.",
                "Focus on common pitfalls.", "Focus on best practices.",
                "Focus on real-world scenarios.", "Focus on edge cases."};

        int modifierIndex = seed % modifiers.length;
        if (!modifiers[modifierIndex].isEmpty()) {
            prompt = prompt.replace("Return ONLY", modifiers[modifierIndex] + " Return ONLY");
        }

        System.out.println("Generating question with seed: " + seed);

        String aiResponse = geminiService.callGemini(prompt);

        // Clean up
        if (aiResponse.length() > 180) {
            aiResponse = aiResponse.substring(0, 180);
            if (aiResponse.contains("?")) {
                aiResponse = aiResponse.substring(0, aiResponse.indexOf("?") + 1);
            }
        }

        if (!aiResponse.trim().endsWith("?")) {
            aiResponse = aiResponse + "?";
        }

        Map<String, String> response = new HashMap<>();
        response.put("question", aiResponse);
        return response;
    }

    // changed this
    @PostMapping("/evaluate-answer")
    public Map<String, Object> evaluateAnswer(@RequestBody Map<String, String> request) {
    String question = request.get("question");
    String answer = request.get("answer");
    String topic = request.get("topic");

    // SHORT, FAST prompt - no extra fluff
    String prompt = String.format(
            "Rate this answer 0-100. Question: %s Answer: %s. Return: Score: X/100 Feedback: (one sentence)",
            question, answer
    );

    long startTime = System.currentTimeMillis();
    String aiResponse = geminiService.callGemini(prompt);
    long endTime = System.currentTimeMillis();

    System.out.println("Evaluation took: " + (endTime - startTime) + "ms");

    Map<String, Object> response = new HashMap<>();
    String feedback = extractFeedback(aiResponse);
    Integer score = extractScore(aiResponse);

    response.put("feedback", feedback);
    response.put("score", score);
    return response;
}

    // Quick keyword check to avoid API calls for terrible answers
    private int quickKeywordCheck(String question, String answer) {
        if (answer == null || answer.trim().length() < 10) {
            return 35; // Very short answer
        }

        String lowerAnswer = answer.toLowerCase();
        String lowerQuestion = question.toLowerCase();

        // Check for key terms related to the question
        String[] commonTerms = {"because", "example", "such as", "for instance", "however", "additionally"};
        int qualityScore = 50;

        for (String term : commonTerms) {
            if (lowerAnswer.contains(term)) {
                qualityScore += 5;
            }
        }

        // Length check
        if (answer.length() > 100) qualityScore += 10;
        if (answer.length() > 200) qualityScore += 10;

        return Math.min(qualityScore, 85);
    }
// till that
    private String extractFeedback(String aiResponse) {
    try {
        // Don't truncate - get the full feedback
        int feedbackIndex = aiResponse.toLowerCase().indexOf("feedback:");
        int scoreIndex = aiResponse.toLowerCase().indexOf("score:");

        if (feedbackIndex != -1) {
            String feedback;
            if (scoreIndex != -1) {
                feedback = aiResponse.substring(feedbackIndex + 9, scoreIndex).trim();
            } else {
                feedback = aiResponse.substring(feedbackIndex + 9).trim();
            }
            // REMOVED the length limit - return full feedback
            return feedback;
        }
    } catch (Exception e) {
        System.err.println("Error extracting feedback: " + e.getMessage());
    }

    // Return full response if no "Feedback:" found
    return aiResponse;
}

    private Integer extractScore(String aiResponse) {
        System.out.println("Extracting score from: " + aiResponse); // Debug

        // Look for Score: X/100 pattern
        Pattern pattern = Pattern.compile("Score:\\s*(\\d+)", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(aiResponse);

        if (matcher.find()) {
            int score = Integer.parseInt(matcher.group(1));
            System.out.println("Found score: " + score);
            return score;
        }

        // Look for just a number near the end
        Pattern numPattern = Pattern.compile("\\b([0-9]{1,3})\\b");
        Matcher numMatcher = numPattern.matcher(aiResponse);
        int lastScore = 50;
        while (numMatcher.find()) {
            int possible = Integer.parseInt(numMatcher.group(1));
            if (possible >= 0 && possible <= 100) {
                lastScore = possible;
            }
        }

        System.out.println("Fallback score: " + lastScore);
        return lastScore;
    }

    // new methods
    @PostMapping("/save-question")
    public Map<String, String> saveQuestion(@RequestBody Map<String, Object> request) {
        Long sessionId = Long.valueOf(request.get("sessionId").toString());
        String questionText = (String) request.get("question");
        String userAnswer = (String) request.get("answer");
        String aiFeedback = (String) request.get("feedback");
        Integer aiScore = (Integer) request.get("score");
        Integer questionOrder = (Integer) request.get("questionOrder");

        // Find the session
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        // Create and save question
        Question question = new Question();
        question.setSession(session);
        question.setText(questionText);
        question.setUserAnswer(userAnswer);
        question.setAiFeedback(aiFeedback);
        question.setAiScore(aiScore);
        question.setQuestionOrder(questionOrder);

        questionRepository.save(question);

        Map<String, String> response = new HashMap<>();
        response.put("status", "saved");
        return response;
    }

    @PostMapping("/complete")
    public Map<String, String> completeSession(@RequestBody Map<String, Object> request) {
        Long sessionId = Long.valueOf(request.get("sessionId").toString());
        Integer finalScore = (Integer) request.get("finalScore");

        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        session.setStatus("completed");
        session.setFinalScore(finalScore);
        sessionRepository.save(session);

        Map<String, String> response = new HashMap<>();
        response.put("status", "completed");
        return response;
    }

    @GetMapping("/user-sessions")
    public List<InterviewSession> getUserSessions(@RequestParam String userEmail) {
        // You'll need to add this method to SessionRepository
        return sessionRepository.findByUserEmailAndStatusOrderByCreatedAtDesc(userEmail, "completed");
    }

    @GetMapping("/session-questions")
    public List<Question> getSessionQuestions(@RequestParam Long sessionId) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        return session.getQuestions();
    }
}