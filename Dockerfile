# Stage 1: Build Spring Boot backend
FROM eclipse-temurin:21-jdk-alpine AS backend-builder
WORKDIR /app
COPY build.gradle.kts settings.gradle.kts ./
COPY gradlew ./
COPY gradle ./gradle
RUN chmod +x gradlew

# Copy source (exclude static — frontend provides them)
COPY src/ src/
RUN rm -rf src/main/resources/static

# Copy pre-built React dist into static resources before building the JAR
COPY frontend/dist/ src/main/resources/static/

# Build without running tests
RUN ./gradlew bootJar -x test --no-daemon --no-build-cache

# Stage 2: Runtime image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create storage directory
RUN mkdir -p /app/storage/attachments

# Copy the JAR
COPY --from=backend-builder /app/build/libs/dms.jar app.jar

# Non-root user for security
RUN addgroup -S dms && adduser -S dms -G dms
RUN chown -R dms:dms /app
USER dms

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
