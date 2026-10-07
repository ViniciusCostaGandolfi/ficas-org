package br.org.ficas.api.infra.exception;

/** Domain exception mapped to HTTP 409. */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
