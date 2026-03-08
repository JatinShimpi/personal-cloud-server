# Personal Cloud Server

## Project Overview
The Personal Cloud Server is a full-stack, responsive web application designed to turn any old PC or server into a private, accessible cloud storage solution. It provides secure user authentication, an intuitive modern interface, and robust file management capabilities.

## Key Features
- **Secure Authentication:** JWT-based stateless authentication with password hashing (BCrypt).
- **File Management:** Upload, download, list, and delete files securely.
- **Drag & Drop Uploads:** Seamless intuitive file uploads with progress tracking.
- **Server Discovery (Symlinks):** Navigate and discover symlinked folders on the host machine to make existing external drives or folders accessible.
- **Search & Filtering:** Quickly locate files with real-time text search.
- **Premium UI:** Designed with a dark theme, glassmorphism, dynamic gradients, and modern micro-animations.

## Technology Stack
- **Frontend:** React 18, Vite, Axios, Lucide React (Icons), Vanilla CSS
- **Backend:** Java 17, Spring Boot 3.2, Spring Security
- **Database:** H2 (Development) / PostgreSQL (Production)
- **Deployment:** Docker, Docker Compose, Nginx

---

## Showcase

### 1. Login Screen
A beautiful, glassmorphic login interface to secure your instance.
![Login Page](./1_login_page.png)

### 2. Registration
Easy onboarding for new users (can be locked down in production).
![Register Page](./2_register_page.png)

### 3. User Dashboard
The core interface where you can upload, manage, search, and preview your stored files.
![Dashboard Page](./3_dashboard_page.png)

---

## Deployment & Access

The project is fully encapsulated in Docker containers, making it trivial to deploy on Debian or any other Linux distribution:

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url> /opt/personal-cloud-server
   cd /opt/personal-cloud-server
   ```

2. **Run with Docker Compose:**
   ```bash
   docker compose up -d --build
   ```

**(Optional) Access from Anywhere:** 
Connect a Cloudflare Tunnel to expose the local Docker instance securely to the internet via HTTPS, without needing to open any ports on the router.
```bash
cloudflared tunnel --url http://localhost:80
```
