package com.saas.pm.repository;

import com.saas.pm.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, String> {
    List<Comment> findByTaskId(String taskId);
    List<Comment> findByTaskIdOrderByCreatedAtAsc(String taskId);
}
