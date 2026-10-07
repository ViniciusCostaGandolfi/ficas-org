package br.org.ficas.api.service;

import br.org.ficas.api.infra.exception.ConflictException;
import br.org.ficas.api.infra.exception.NotFoundException;
import br.org.ficas.api.infra.repository.UserRepository;
import br.org.ficas.api.dto.user.UserDto;
import br.org.ficas.api.dto.user.UserUpsertRequest;
import br.org.ficas.api.model.entity.User;
import java.util.Comparator;
import java.util.List;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<UserDto> list() {
        return userRepository.findAll().stream()
                .sorted(Comparator.comparing(User::getId))
                .map(UserService::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserDto get(Long id) {
        return toDto(require(id));
    }

    @Transactional(readOnly = true)
    public User requireByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User not found: " + email));
    }

    @Transactional
    public UserDto create(UserUpsertRequest request) {
        if (request.password() == null || request.password().isBlank()) {
            throw new br.org.ficas.api.infra.exception.BadRequestException("password is required");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new ConflictException("Email already in use: " + request.email());
        }
        User user = new User(request.name(), request.email(),
                passwordEncoder.encode(request.password()), request.role());
        return toDto(userRepository.save(user));
    }

    @Transactional
    public UserDto update(Long id, UserUpsertRequest request) {
        User user = require(id);
        userRepository.findByEmail(request.email())
                .filter(other -> !other.getId().equals(id))
                .ifPresent(other -> {
                    throw new ConflictException("Email already in use: " + request.email());
                });
        user.setName(request.name());
        user.setEmail(request.email());
        user.setRole(request.role());
        if (request.password() != null && !request.password().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        return toDto(user);
    }

    @Transactional
    public void delete(Long id) {
        User user = require(id);
        userRepository.delete(user);
    }

    @Transactional(readOnly = true)
    public User require(Long id) {
        return userRepository.findById(id).orElseThrow(() -> NotFoundException.of("User", id));
    }

    public static UserDto toDto(User user) {
        return new UserDto(user.getId(), user.getName(), user.getEmail(), user.getRole().name());
    }
}
