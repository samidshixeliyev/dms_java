# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Spring Boot backend
FROM eclipse-temurin:21-jdk-alpine AS backend-builder
WORKDIR /app
COPY build.gradle.kts settings.gradle.kts ./
COPY gradle/ gradle/ 2>/dev/null || true

# Copy Gradle wrapper
COPY gradlew ./
COPY gradle ./gradle
RUN chmod +x gradlew

# Copy source
COPY src/ src/

# Copy React build into static resources before building the JAR
COPY --from=frontend-builder /app/frontend/dist/ src/main/resources/static/

# Build without running tests
RUN ./gradlew bootJar -x test --no-daemon

# Stage 3: Runtime image
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
