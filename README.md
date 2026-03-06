# Personal Cloud Server ☁️

A self-hosted personal cloud for uploading, downloading, and managing your files from anywhere — secured with email/password authentication.

**Tech Stack:** React (Vite) · Spring Boot · PostgreSQL · Docker

---

## Quick Start (Docker — Production)

> **Prerequisites:** Docker & Docker Compose installed on your Debian server.

```bash
# 1. Clone the project to your Debian server
git clone <your-repo-url> personal-cloud-server
cd personal-cloud-server

# 2. (Optional) Set a custom JWT secret
export JWT_SECRET=$(openssl rand -base64 44)

# 3. Build & start all services
docker compose up -d --build

# 4. Access the app
# → http://<your-server-ip>
```

**Default ports:**
| Service | Port |
|---------|------|
| Frontend (Nginx) | `80` |
| Backend API | `8080` |
| PostgreSQL | `5432` |

---

## Local Development

### Backend (Spring Boot + H2)

```bash
cd backend

# Using Maven Wrapper (no Maven install needed)
./mvnw spring-boot:run

# Or with Maven installed
mvn spring-boot:run
```

- API runs at `http://localhost:8080`
- H2 Console at `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:file:./data/clouddb`)

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

- Dev server at `http://localhost:5173`
- API calls automatically proxy to `localhost:8080`

---

## API Endpoints

### Authentication
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | `{ email, password, displayName? }` | Register new account |
| POST | `/api/auth/login` | `{ email, password }` | Login, returns JWT |

### Files (requires `Authorization: Bearer <token>`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/files` | List user's files |
| POST | `/api/files/upload` | Upload file (multipart) |
| GET | `/api/files/{id}/download` | Download a file |
| DELETE | `/api/files/{id}` | Delete a file |

---

## Debian Server Setup Guide

### 1. Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Re-login for group changes
logout
```

### 2. Firewall

```bash
sudo apt install ufw -y
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS (optional)
sudo ufw enable
```

### 3. Deploy

```bash
cd /opt/personal-cloud-server
docker compose up -d --build
```

### 4. Access from Other Devices

- **Same network:** `http://<server-local-ip>` (find it with `ip addr`)
- **Internet:** Set up port forwarding on your router (port 80 → server IP), then use your public IP or a Dynamic DNS service

### 5. HTTPS (Optional — recommended for internet access)

Use [Caddy](https://caddyserver.com/) as a reverse proxy for automatic HTTPS:

```bash
sudo apt install caddy -y
```

Edit `/etc/caddy/Caddyfile`:
```
your-domain.com {
    reverse_proxy localhost:80
}
```

```bash
sudo systemctl restart caddy
```

---

## Project Structure

```
personal-cloud-server/
├── backend/
│   ├── src/main/java/com/personalcloud/
│   │   ├── controller/      # REST controllers
│   │   ├── dto/              # Request/Response DTOs
│   │   ├── exception/        # Global error handling
│   │   ├── model/            # JPA entities
│   │   ├── repository/       # Data repositories
│   │   ├── security/         # JWT + Spring Security
│   │   └── service/          # Business logic
│   ├── src/main/resources/
│   │   └── application.yml   # App configuration
│   ├── Dockerfile
│   └── pom.xml
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── contexts/         # React context (Auth)
│   │   ├── pages/            # Login, Register, Dashboard
│   │   └── services/         # API client
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
└── docker-compose.yml
```

---

## License

MIT
