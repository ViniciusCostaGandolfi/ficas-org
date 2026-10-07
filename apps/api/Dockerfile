# ---- Build stage ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Cache dependencies first
COPY pom.xml .
RUN mvn -q -B -DskipTests dependency:go-offline

# Build the application
COPY src ./src
RUN mvn -q -B -DskipTests package

# ---- Runtime stage ----
FROM eclipse-temurin:21-jre
WORKDIR /app

# Non-root user
RUN groupadd --system ficas && useradd --system --gid ficas ficas \
    && mkdir -p /app/storage && chown -R ficas:ficas /app
USER ficas

COPY --from=build /build/target/ficas-api-*.jar /app/app.jar

ENV SPRING_PROFILES_ACTIVE=prod \
    APP_STORAGE_LOCAL_DIR=/app/storage
EXPOSE 8080

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
