# VPS Setup Guide — DMS Java

Complete guide to clone, configure, and run the DMS application on a fresh VPS using Docker.

---

## Prerequisites

Install on the VPS:

```bash
# Docker Engine
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Docker Compose v2
sudo apt-get install -y docker-compose-plugin

# Git
sudo apt-get install -y git
```

---

## 1. Clone the repository

```bash
git clone https://github.com/samidshixeliyev/dms_java.git
cd dms_java
```

---

## 2. Configure environment

```bash
cp .env.example .env
nano .env
```

Edit `.env` — the minimum required changes:

```env
# SQL Server password (must be strong: uppercase + lowercase + digit + special, min 8 chars)
SA_PASSWORD=DmsStr0ng!Pass

# JWT secret (any long random string, min 32 chars)
JWT_SECRET=change-this-to-a-very-long-random-string-in-production-min-32

# Mail (optional — app works without it, just no email notifications)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=your-email@gmail.com

# Database name (leave as-is unless you renamed it)
DB_NAME=dms_new
```

---

## 3. Build and start everything

```bash
docker compose up --build -d
```

This will:
1. Pull SQL Server 2022 Express image
2. Start SQL Server and wait until healthy
3. Restore `db/dms_new.bak` into a database called `dms_new` (skips if already exists)
4. Build the Spring Boot + React application
5. Start the application on port `8080`

---

## 4. Monitor startup

```bash
# Watch all containers
docker compose logs -f

# Watch only the restore step
docker logs dms-db-restore

# Watch only the app
docker logs -f dms-app
```

First startup takes 2–4 minutes (downloads images, builds JAR).

---

## 5. Verify it works

```bash
# Check all containers are running
docker compose ps

# Test the API
curl http://localhost:8080/api/act-types
```

Open in browser: `http://<your-vps-ip>:8080`

---

## 6. Login

Use the same credentials as the original PHP app (user accounts are restored from the backup).

---

## File attachment storage

Uploaded files are stored in Docker volume `dms-storage` → mounted at `/app/storage` inside the container.

```bash
# See where volumes are on disk
docker volume inspect dms-storage
docker volume inspect dms-sql-data
```

---

## Useful commands

```bash
# Stop everything
docker compose down

# Stop and delete volumes (DESTROYS ALL DATA)
docker compose down -v

# Rebuild app only (after code changes)
docker compose up --build -d dms-app

# Connect to SQL Server directly
docker exec -it dms-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "DmsStr0ng!Pass" -C

# Create a new database backup
docker exec dms-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "DmsStr0ng!Pass" -C \
  -Q "BACKUP DATABASE dms_new TO DISK='/db-init/dms_new_new.bak' WITH FORMAT, INIT;"

# View app logs
docker compose logs -f dms-app

# View SQL Server logs
docker compose logs -f sqlserver
```

---

## Firewall (if using ufw)

```bash
sudo ufw allow 8080/tcp
sudo ufw allow 1433/tcp   # only if you need direct SQL Server access from outside
```

---

## Nginx reverse proxy with HTTPS

Nginx is included in `docker-compose.yml` and listens on ports 80 (redirect) and 443 (HTTPS).
Before starting, generate a self-signed TLS certificate:

```bash
# On the VPS, from the project root:
bash nginx/gen-ssl.sh
```

This creates `nginx/ssl/cert.pem` and `nginx/ssl/key.pem` (10-year self-signed cert).
Then start normally:

```bash
docker compose up --build -d
```

Access the app at `https://<your-vps-ip>` (browser will warn about self-signed cert — click Advanced → Proceed).

### Using a real domain with Let's Encrypt

If you have a domain pointing to this server:

```bash
sudo apt install certbot -y
sudo certbot certonly --standalone -d your-domain.com
# Copy certs to nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
# Update nginx.conf server_name
sed -i 's/server_name _;/server_name your-domain.com;/' nginx/nginx.conf
docker compose restart nginx
```

---

## Continue development with Claude Code on VPS

Install Claude Code on the VPS:

```bash
npm install -g @anthropic-ai/claude-code
```

Then from inside the project directory:

```bash
cd dms_java
claude
```

The `claude-memory/` directory in this repo contains the full context of all decisions made during the initial conversion. Load it by copying to the Claude memory location:

```bash
mkdir -p ~/.claude/projects/$(pwd | sed 's|/|-|g; s|^-||')/memory
cp claude-memory/* ~/.claude/projects/$(pwd | sed 's|/|-|g; s|^-||')/memory/
```
