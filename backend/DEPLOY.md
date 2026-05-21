# Deployment Guide — ClinicApp Backend

## Architecture Overview

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Vercel    │─────▶│  Railway/Render   │─────▶│  Hosted MySQL   │
│  (Frontend) │ API  │    (Backend)      │ JDBC │ (Railway/Aiven) │
└─────────────┘      └──────────────────┘      └─────────────────┘
```

---

## Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SPRING_PROFILES_ACTIVE` | Activates production config | `prod` |
| `PORT` | Server port (set by platform) | `8085` |
| `SPRING_DATASOURCE_URL` | Full JDBC URL for hosted MySQL | `jdbc:mysql://host:3306/db?useSSL=true` |
| `DB_USERNAME` | MySQL username | `clinicuser` |
| `DB_PASSWORD` | MySQL password | `securepass123` |
| `APP_JWT_SECRET` | JWT signing key (min 32 chars) | `my-super-secure-jwt-key-min-32-bytes` |
| `APP_JWT_EXPIRATION_MS` | Token expiry in ms (default 24h) | `86400000` |

### Optional — Email Notifications

| Variable | Description | Example |
|----------|-------------|---------|
| `MAIL_HOST` | SMTP server | `smtp.gmail.com` |
| `MAIL_PORT` | SMTP port | `587` |
| `MAIL_USERNAME` | SMTP username | `app@gmail.com` |
| `MAIL_PASSWORD` | SMTP password or app password | `xxxx-xxxx-xxxx-xxxx` |
| `EMAIL_ENABLED` | Enable email sending | `true` |

### Optional — Razorpay Payments

| Variable | Description | Example |
|----------|-------------|---------|
| `RAZORPAY_KEY_ID` | Razorpay API key | `rzp_live_xxxxx` |
| `RAZORPAY_KEY_SECRET` | Razorpay secret | `secretxxxxx` |
| `PAYMENT_ENABLED` | Enable payment processing | `true` |

### Optional — AI Features

| Variable | Description | Example |
|----------|-------------|---------|
| `GROQ_API_KEY` | Groq API key for medical intake AI | `gsk_xxxxx` |

---

## Deploy to Railway

### Step 1: Create a Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project" → "Deploy from GitHub Repo"
3. Connect your GitHub repository
4. Set the root directory to `backend/`

### Step 2: Add MySQL Database

1. In your Railway project, click "New" → "Database" → "MySQL"
2. Railway will provision a MySQL 8 instance
3. Click the MySQL service → "Variables" tab
4. Copy `MYSQL_URL` — it looks like: `mysql://user:pass@host:port/railway`
5. Convert to JDBC format:
   ```
   jdbc:mysql://host:port/railway?useSSL=true&requireSSL=true
   ```

### Step 3: Configure Environment Variables

1. Click your backend service → "Variables" tab
2. Add the following:
   ```
   SPRING_PROFILES_ACTIVE=prod
   SPRING_DATASOURCE_URL=jdbc:mysql://<host>:<port>/railway?useSSL=true&requireSSL=true
   DB_USERNAME=<from MySQL service>
   DB_PASSWORD=<from MySQL service>
   APP_JWT_SECRET=<generate a secure 64-char string>
   ```
3. Railway automatically provides `PORT` — no need to set it manually

### Step 4: Deploy

1. Railway auto-deploys on push to your connected branch
2. Check the deploy logs for startup confirmation
3. Your backend URL will be: `https://<service-name>.up.railway.app`

### Step 5: First Run — Database Schema

On the very first deployment, you may want to temporarily set:
```
spring.jpa.hibernate.ddl-auto=update
```
This creates all tables. After the schema is set up, switch back to `validate`.

Alternatively, export your local schema and run it against the Railway MySQL:
```bash
mysqldump -u root clinic_app_db --no-data > schema.sql
mysql -h <railway-host> -P <port> -u <user> -p railway < schema.sql
```

---

## Deploy to Render

### Step 1: Create a Web Service

1. Go to [render.com](https://render.com) and sign in
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Set:
   - **Root Directory**: `backend`
   - **Runtime**: Docker
   - **Dockerfile Path**: `./Dockerfile`

### Step 2: Set Up MySQL

Option A — **Render does not offer managed MySQL**. Use one of:
- [Aiven for MySQL](https://aiven.io) (free tier available)
- [PlanetScale](https://planetscale.com) (serverless MySQL)
- [Railway MySQL](https://railway.app) (just the database)

Option B — Use Render PostgreSQL (requires changing JPA dialect — not recommended for this project)

### Step 3: Configure Environment Variables

In Render dashboard → your service → "Environment":
```
SPRING_PROFILES_ACTIVE=prod
PORT=8085
SPRING_DATASOURCE_URL=jdbc:mysql://<host>:<port>/<db>?useSSL=true
DB_USERNAME=<username>
DB_PASSWORD=<password>
APP_JWT_SECRET=<generate a secure 64-char string>
```

### Step 4: Deploy

1. Render auto-deploys on push to your connected branch
2. Your service URL: `https://<service-name>.onrender.com`

> Note: Render free tier spins down after 15 min of inactivity. First request after sleep takes ~30s.

---

## Frontend Deployment (Vercel)

### Step 1: Connect Repository

1. Go to [vercel.com](https://vercel.com) and import your repo
2. Set framework preset to "Vite"
3. Set root directory to `frontend/` (or keep project root with current vercel.json)

### Step 2: Update API URL

Edit `vercel.json` at the project root — replace the placeholder:
```json
{
  "source": "/api/:path*",
  "destination": "https://your-actual-backend-url.up.railway.app/api/:path*"
}
```

Or update `frontend/.env.production`:
```
VITE_API_BASE_URL=https://your-actual-backend-url.up.railway.app/api
```

Then update `frontend/src/services/api.js` to use the env variable:
```js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8085/api",
  timeout: 12000,
});
```

### Step 3: CORS Configuration

Ensure your backend allows the Vercel frontend origin. In production, update
`WebMvcConfig.java` or `SecurityConfig.java` to allow:
```
https://your-app.vercel.app
```

---

## Local Development with Docker

Run the full stack locally:

```bash
docker-compose up --build
```

This starts:
- MySQL 8 on port 3306
- Backend on port 8085

Frontend still runs via `npm run dev` on port 5173.

---

## Generating a Secure JWT Secret

```bash
openssl rand -base64 48
```

Or use any password generator to create a 64+ character random string.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Communications link failure` | Check SPRING_DATASOURCE_URL format and network access |
| `Access denied for user` | Verify DB_USERNAME and DB_PASSWORD match hosted DB credentials |
| `Table doesn't exist` | First deploy needs `ddl-auto=update` or manual schema import |
| `Port already in use` | Railway/Render set PORT automatically; don't hardcode it |
| CORS errors from frontend | Add your Vercel URL to allowed origins in SecurityConfig |
| Render cold start timeout | Upgrade from free tier or add a health check ping service |
