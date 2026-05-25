---
name: project-dms-conversion
description: PHP Laravel DMS app fully converted to Spring Boot 3.4 + React 18 single Docker image
metadata: 
  node_type: memory
  type: project
  originSessionId: e151cb4f-fdc2-488d-b537-2badf3c21de1
---

Converted dms_new (PHP Laravel 12 + SQL Server) to dms_java (Spring Boot 3.4 + React 18).

**Why:** Full stack technology migration from PHP to Java/React for Spring Boot + React deployment.

**Stack decisions made:**
- Database: SQL Server (kept existing, no migration)
- Auth: JWT tokens (stateless, stored in localStorage)
- Java: 21 + Gradle (Kotlin DSL)
- File storage: Docker volume bind mount at /app/storage
- Frontend: React 18 + TypeScript + Vite + Bootstrap 5

**Architecture:**
- Spring Boot serves React static files from resources/static/ (SPA fallback to index.html)
- All API at /api/**, React SPA at all other paths
- Multi-stage Dockerfile: Node (frontend build) → Java (bootJar) → runtime
- docker-compose.yml with named volume `dms-storage`

**Key implementation details:**
- 13 JPA entities with @SQLRestriction("is_deleted = 0") for soft deletes
- LegalActExecutorLink uses @EmbeddedId composite key
- DepartmentHierarchyService: in-memory tree traversal (not recursive CTE)
- JWT includes role, userId, executorId, departmentId, mustChangePassword claims
- `gradle/wrapper/gradle-wrapper.jar` downloaded from GitHub releases (v8.11.1)

**GitHub:** https://github.com/samidshixeliyev/dms_java

**How to apply:** When resuming this project, the full structure is in dms_java/. The existing SQL Server DB at 555-PTSVBZ\SQLEXPRESS stays intact.
