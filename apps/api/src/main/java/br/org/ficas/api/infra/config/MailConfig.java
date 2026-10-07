package br.org.ficas.api.infra.config;

import java.util.Properties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

/**
 * Creates a {@link JavaMailSender} only when {@code app.mail.enabled=true}. No {@code spring.mail.*}
 * properties are configured, so Spring Boot's own mail auto-configuration stays out of the way and
 * the API boots without SMTP in dev.
 */
@Configuration
public class MailConfig {

    @Bean
    @ConditionalOnProperty(prefix = "app.mail", name = "enabled", havingValue = "true")
    JavaMailSender javaMailSender(AppProperties properties) {
        AppProperties.Mail mail = properties.mail();
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(mail.host());
        sender.setPort(mail.port());
        if (mail.username() != null && !mail.username().isBlank()) {
            sender.setUsername(mail.username());
            sender.setPassword(mail.password());
        }
        Properties javaMail = sender.getJavaMailProperties();
        javaMail.put("mail.smtp.auth", String.valueOf(mail.username() != null && !mail.username().isBlank()));
        javaMail.put("mail.smtp.starttls.enable", "true");
        javaMail.put("mail.transport.protocol", "smtp");
        return sender;
    }
}
