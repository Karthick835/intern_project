package com.saas.pm.service;

import com.saas.pm.model.Comment;
import com.saas.pm.model.Task;
import com.saas.pm.model.User;
import com.saas.pm.repository.CommentRepository;
import com.saas.pm.repository.TaskRepository;
import com.saas.pm.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
public class CommentService {

    private final CommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    @Autowired
    public CommentService(CommentRepository commentRepository, 
                         TaskRepository taskRepository,
                         UserRepository userRepository) {
        this.commentRepository = commentRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    public Comment addComment(String taskId, String userId, String content) {
        log.info("Adding comment to task: {}", taskId);
        
        Optional<Task> taskOpt = taskRepository.findById(taskId);
        Optional<User> userOpt = userRepository.findById(userId);
        
        if (taskOpt.isEmpty() || userOpt.isEmpty()) {
            throw new RuntimeException("Task or User not found");
        }
        
        Comment comment = Comment.builder()
                .id(UUID.randomUUID().toString())
                .task(taskOpt.get())
                .user(userOpt.get())
                .content(content)
                .build();
        
        return commentRepository.save(comment);
    }

    public Optional<Comment> getComment(String commentId) {
        log.info("Fetching comment: {}", commentId);
        return commentRepository.findById(commentId);
    }

    public List<Comment> getCommentsByTask(String taskId) {
        log.info("Fetching comments for task: {}", taskId);
        return commentRepository.findByTaskId(taskId);
    }

    public void deleteComment(String commentId) {
        log.info("Deleting comment: {}", commentId);
        commentRepository.deleteById(commentId);
    }

    public Comment updateComment(String commentId, String newContent) {
        log.info("Updating comment: {}", commentId);
        
        Optional<Comment> commentOpt = commentRepository.findById(commentId);
        if (commentOpt.isEmpty()) {
            throw new RuntimeException("Comment not found");
        }
        
        Comment comment = commentOpt.get();
        comment.setContent(newContent);
        return commentRepository.save(comment);
    }
}
