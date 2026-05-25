plugins {
    java
    id("org.springframework.boot") version "3.4.1"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.dms"
version = "1.0.0"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-mail")
    implementation("org.springframework.boot:spring-boot-starter-validation")

    // SQL Server
    runtimeOnly("com.microsoft.sqlserver:mssql-jdbc")

    // JWT
    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")

    // Excel + Word export (Apache POI)
    implementation("org.apache.poi:poi-ooxml:5.3.0")

    // Lombok
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

tasks.bootJar {
    archiveFileName.set("dms.jar")
}

// Copy React build output into Spring Boot static resources before packaging
tasks.register<Copy>("copyFrontend") {
    dependsOn(tasks.register<Exec>("buildFrontend") {
        workingDir(project.file("frontend"))
        commandLine(
            if (System.getProperty("os.name").lowercase().contains("win")) "cmd" else "sh",
            if (System.getProperty("os.name").lowercase().contains("win")) "/c" else "-c",
            if (System.getProperty("os.name").lowercase().contains("win")) "npm run build" else "npm run build"
        )
    })
    from(project.file("frontend/dist"))
    into(project.file("src/main/resources/static"))
}
