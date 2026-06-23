package com.prepai.repository;

import com.prepai.model.InterviewSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SessionRepository extends JpaRepository<InterviewSession, Long> {
    List<InterviewSession> findByUserEmailAndStatusOrderByCreatedAtDesc(String userEmail, String status);
}