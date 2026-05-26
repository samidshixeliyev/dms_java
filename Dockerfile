# Stage 0: Build React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --prefer-offline
COPY frontend/ ./
RUN npm run build

# Stage 1: Build Spring Boot backend
FROM eclipse-temurin:21-jdk-alpine AS backend-builder
WORKDIR /app
COPY build.gradle.kts settings.gradle.kts ./
COPY gradlew ./
COPY gradle ./gradle
RUN chmod +x gradlew

# Copy backend source
COPY src/ src/
RUN rm -rf src/main/resources/static

# Inject pre-built frontend into static resources
COPY --from=frontend-builder /app/dist/ src/main/resources/static/

# Build JAR without tests
RUN ./gradlew bootJar -x test --no-daemon --no-build-cache

# Stage 2: Runtime image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN mkdir -p /app/storage/attachments

COPY --from=backend-builder /app/build/libs/dms.jar app.jar

RUN addgroup -S dms && adduser -S dms -G dms
RUN chown -R dms:dms /app
USER dms

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
