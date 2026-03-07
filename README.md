# 🛡️ E-POLIX — Crime Record Management System

A secure, multi-role crime record management platform for law enforcement agencies.

## 🏗 Architecture

```
E-POLIX/
├── frontend/           # React + Vite (deployed on Vercel)
├── backend/            # Node.js + Express (deployed on Render)
├── database/           # SQL schemas and DB logic
│   └── supabase_sql.sql
├── package.json        # Root management
└── render.yaml         # Render deployment config
```

## 👥 User Roles & Portals

| Role | Portal | ID Format | Route |
|------|--------|-----------|-------|
| Citizen | `/user` | Aadhaar (12 digits) | Public login |
| Police Officer | `/police` | `OFF-XXX` | Terminal login |
| Staff Member | `/staff` | `STF-XXX` | Terminal login |
| Administrator | `/admin` | `ADM-KL-YYYY-XXXX` or email | Terminal login |

## 🔒 Security Features

- ✅ **Multi-step 2FA** — OTP required for all roles (60s expiry, max 3 attempts)
- ✅ **Account lockout** — Locked for 30 minutes after 5 failed login attempts
- ✅ **Strict ID validation** — Format enforced on both frontend and backend
- ✅ **JWT authentication** — Token expiry check on every protected route
- ✅ **bcrypt hashing** — 12 rounds for all passwords, Aadhaar stored hashed
- ✅ **Rate limiting** — Tiered (API: 100/15min, Auth: 10/15min, OTP: 5/5min)
- ✅ **Role-based access** — Each dashboard accessible only by correct role
- ✅ **Auto logout** — 15-minute inactivity timeout
- ✅ **Row Level Security** — Enabled on all Supabase tables
- ✅ **CORS** — Strict origin whitelist enforced

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- Supabase project (free tier works)

### 1. Clone the repository
```bash
git clone https://github.com/realfx7736/epolix-crime-management-system.git
cd epolix-crime-management-system
```

### 2. Set up the database
1. Go to your [Supabase project](https://supabase.com/dashboard)
2. Open **SQL Editor**
3. Run the contents of `supabase_sql.sql`

### 3. Configure environment variables
```bash
# Backend
cp backend/.env.example backend/.env
# Fill in your Supabase URL, keys, and JWT secrets

# Frontend
cp frontend/.env.example frontend/.env
# Fill in your Supabase URL, anon key, and backend API URL
```

### 4. Install dependencies & run
```bash
npm run install:all   # Install all dependencies
npm run dev           # Start frontend + backend concurrently
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### 5. Seed super admin
```bash
curl -X POST http://localhost:5000/api/auth/seed
```
Default admin credentials:
- **Admin ID:** `ADM-KL-2026-0001`
- **Email:** `admin@epolix.gov.in`
- **Password:** `EPolixAdmin@2026#Secure`
- ⚠️ Change this password immediately after first login!

## 🌐 Deployment

### Frontend → Vercel
1. Push to GitHub (already done)
2. Connect repo to [Vercel](https://vercel.com)
3. Set **Root Directory** to `frontend`
4. Add environment variables from `frontend/.env.example`

### Backend → Render
1. Connect repo to [Render](https://render.com)
2. `render.yaml` auto-configures the service
3. Add secret environment variables in Render dashboard

## 📋 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/citizen/login` | Citizen Aadhaar login | None |
| POST | `/api/auth/terminal/login` | Police/Staff/Admin login | None |
| POST | `/api/auth/verify-otp` | OTP verification (all roles) | None |
| POST | `/api/auth/seed` | Seed super admin | None |
| GET | `/api/auth/profile` | Get own profile | JWT |
| POST | `/api/auth/register/police` | Register officer | Admin JWT |
| POST | `/api/auth/register/staff` | Register staff | Admin JWT |
| POST | `/api/auth/register/admin` | Register admin | Super Admin JWT |
| GET | `/api/health` | Health check | None |

## 🗄️ Database Tables

| Table | Purpose |
|-------|---------|
| `users` | Citizen accounts (Aadhaar hashed) |
| `police_officers` | Police officer accounts |
| `staff_members` | Staff member accounts |
| `admin_users` | Admin accounts (14+ char passwords) |
| `otp_tokens` | Active OTP codes (auto-cleaned after use) |
| `complaints` | Crime complaints |
| `evidence` | Evidence files metadata |
| `login_activity_logs` | Full audit trail of all login events |
| `support_messages` | Public contact/support messages |
| `system_logs` | Admin action audit trail |

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Framer Motion, TailwindCSS, Lucide Icons |
| Backend | Node.js, Express.js, JWT, bcryptjs |
| Database | Supabase (PostgreSQL) with RLS |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |

---
*E-POLIX — Securing communities through technology* 🛡️
