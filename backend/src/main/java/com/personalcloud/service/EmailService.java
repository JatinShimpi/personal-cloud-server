package com.personalcloud.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendWelcomeEmail(String toEmail, String temporaryPassword) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(toEmail);
            helper.setSubject("Welcome to Skyvault! Your Account Credentials");
            
            String htmlContent = 
                "<h2>Welcome to your Personal Cloud Server!</h2>" +
                "<p>An administrator has created an account for you.</p>" +
                "<p><strong>Your Temporary Password:</strong> <code>" + temporaryPassword + "</code></p>" +
                "<p>Please log in and update your profile.</p>" +
                "<p><em>- The Skyvault Team</em></p>";

            helper.setText(htmlContent, true);

            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Failed to send welcome email", e);
        }
    }
}
