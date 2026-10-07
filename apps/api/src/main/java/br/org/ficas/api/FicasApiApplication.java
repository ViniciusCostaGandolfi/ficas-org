package br.org.ficas.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * FICAS API entry point.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class FicasApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(FicasApiApplication.class, args);
    }
}
