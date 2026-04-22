# Developer Setup Guide

## Prerequisites

| Tool       | Minimum version | Notes                              |
|------------|-----------------|------------------------------------|
| Node.js    | 20.x LTS        | Use nvm or fnm for version management |
| npm        | 10.x            | Bundled with Node 20               |
| MongoDB    | 7.x             | Local instance or Atlas cluster    |
| Git        | 2.x             | —                                  |

---

## Repository Structure

```
ediscovery-platform/
├── client/          # React 19 + Vite frontend
├── server/          # Express.js + TypeScript backend
└── shared/          # TypeScript types shared by both
```

---

## 1. Clone and Install

```bash
git clone <repo-url>
cd ediscovery-platform

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
```

---

## 2. Environment Variables

### Backend — `server/.env`

Create this file before starting the server. The server will **throw an error at startup** if required variables are missing.

```env
# ── Required ──────────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/ediscovery_db

# JWT — generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=<64-byte hex string>
JWT_REFRESH_SECRET=<64-byte hex string>

# ── Optional ──────────────────────────────────────────────────────────────────
# Allowed CORS origin (defaults to http://localhost:5173)
CORS_ORIGIN=http://localhost:5173

# JWT expiry (defaults shown)
JWT_ACCESS_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# Email transport for password reset (omit to skip email delivery in dev)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=<smtp-password>
```

> **Security:** Never commit `.env` files. `.env` is included in `.gitignore`.

### Frontend — `client/.env`

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 3. Database Setup

### Local MongoDB

Start a local MongoDB instance. The application creates the `ediscovery_db` database automatically on first connection.

```powershell
# Windows — start MongoDB service
net start MongoDB

# macOS / Linux
mongod --dbpath ./data/db
```

### Atlas (cloud)

Replace `MONGO_URI` in `server/.env` with your Atlas connection string:
```
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/ediscovery_db?retryWrites=true&w=majority
```

### Seed an Admin User

There is no seed script included. Create the first Admin user directly in the database:

```javascript
// Run in mongosh
use ediscovery_db

db.users.insertOne({
  firstName: "Admin",
  lastName: "User",
  email: "admin@lawfirm.com",
  passwordHash: "<bcrypt hash of your password>",  // bcrypt salt 10
  role: "ADMIN",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

To generate a bcrypt hash:
```bash
node -e "const b=require('bcryptjs');b.hash('YourPassword123!',10).then(console.log)"
```

All subsequent users are created via `POST /api/auth/register` (requires Admin JWT).

---

## 4. Run in Development

Open two terminal sessions:

**Terminal 1 — Backend**
```bash
cd server
npm run dev
```
The server starts on `http://localhost:5000` with `ts-node` hot reload.

**Terminal 2 — Frontend**
```bash
cd client
npm run dev
```
Vite starts on `http://localhost:5173` with HMR.

---

## 5. Build for Production

### Backend
```bash
cd server
npm run build   # outputs to server/dist/
npm start       # runs dist/server.js
```

### Frontend
```bash
cd client
npm run build   # outputs to client/dist/
```

Serve `client/dist/` from any static host (Netlify, Vercel, S3 + CloudFront, etc.).  
Point the API at your hosted backend by setting `VITE_API_URL` at build time.

---

## 6. TypeScript Compilation Check

The backend is configured with strict TypeScript (`tsconfig.json` has `"strict": true`). Run a type-check at any time without emitting output:

```bash
cd server
npx tsc --noEmit
```

Expected output: no errors.

---

## 7. Available Scripts

### Server (`server/package.json`)

| Script         | Description                                  |
|----------------|----------------------------------------------|
| `npm run dev`  | Start with `ts-node-dev` (hot reload)         |
| `npm run build` | Compile TypeScript to `dist/`               |
| `npm start`    | Run compiled `dist/server.js`                |

### Client (`client/package.json`)

| Script           | Description                             |
|------------------|-----------------------------------------|
| `npm run dev`    | Start Vite dev server                   |
| `npm run build`  | Production build to `dist/`             |
| `npm run preview`| Preview production build locally        |
| `npm run lint`   | ESLint check                            |

---

## 8. File Uploads

Uploaded files are stored under `server/uploads/{caseId}/{custodianId}/`.  
This directory is created automatically on first upload.  
In production, consider replacing local storage with object storage (S3-compatible) by modifying `document.controller.ts`.

Maximum file size: **50 MB per file**.  
Allowed types: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.msg`, `.eml`, `.txt`

---

## 9. Common Issues

**Server fails to start with "JWT secret not set"**  
Ensure both `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are present in `server/.env`.

**MongoDB connection refused**  
Confirm `mongod` is running and `MONGO_URI` in `.env` is correct.

**CORS errors in the browser**  
Make sure `CORS_ORIGIN` in `server/.env` matches exactly the URL the frontend is served from (including port number, no trailing slash).

**Vite cannot reach the API**  
Confirm `VITE_API_URL` in `client/.env` matches the server address. Restart Vite after changing `.env`.

**TypeScript errors on `req.user`**  
`AuthRequest` is defined in `middleware/authMiddleware.ts`. All protected route handlers should cast `req` to `AuthRequest` and use `req.user!` (the `!` is safe because `protect` guarantees the field is set).
