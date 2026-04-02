# 🏥 DQMS — Digital Queue Management System
## NIT Warangal Healthcare Center

A full-stack MERN application replacing physical queues with a real-time digital solution.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 6.0+ (running locally on port 27017)

### 1. Install Dependencies
```bash
cd dqms/backend && npm install
cd ../frontend && npm install
```

### 2. Configure Environment
Edit `backend/.env` — update SMTP credentials if you want email notifications.

### 3. Seed the Database
```bash
cd backend
npm run seed
```

This creates:
| Role    | Email                          | Password     |
|---------|-------------------------------|--------------|
| Student | vamsi@student.nitw.ac.in      | Student@123  |
| Staff   | raju@nitw.ac.in               | Staff@123    |
| Doctor  | priya@nitw.ac.in              | Doctor@123   |
| Doctor2 | anil@nitw.ac.in               | Doctor@123   |

### 4. Start Backend
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

### 5. Start Frontend
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

---

## 🏗️ Architecture

```
dqms/
├── backend/                    # Node.js + Express + MongoDB + Socket.io
│   ├── src/
│   │   ├── config/             # DB, constants, seed
│   │   ├── models/             # 7 Mongoose schemas
│   │   ├── controllers/        # auth, queue, staff, doctor, timetable
│   │   ├── middleware/         # JWT auth, RBAC, rate limiter
│   │   ├── routes/             # REST API routes
│   │   └── services/           # Socket.io, Nodemailer
│   └── server.js
└── frontend/                   # React 18 + Tailwind CSS + Vite
    └── src/
        ├── pages/
        │   ├── Login.jsx
        │   ├── student/        # Dashboard, AddToQueue, QueueStatus, MoveSlot, Timetable, History
        │   ├── staff/          # Dashboard, Emergency, NoShow
        │   └── doctor/         # Dashboard (Next Patient button)
        ├── context/            # AuthContext, SocketContext
        ├── components/         # Navbar, StatusBadge
        └── services/           # Axios API service
```

---

## 🔌 API Endpoints

| Method | Route | Role | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/login` | All | Login with NITW email |
| POST | `/api/auth/logout` | All | Logout |
| GET | `/api/auth/me` | All | Get current user |
| POST | `/api/queue/join` | Student | Join queue |
| GET | `/api/queue/slots` | All | Available slots |
| GET | `/api/queue/status/:id` | Student | Active queue status |
| GET | `/api/queue/history/:id` | Student | 6-month history |
| PUT | `/api/queue/move` | Student | Move to later slot |
| DELETE | `/api/queue/cancel/:id` | Student/Staff | Cancel appointment |
| GET | `/api/staff/queue` | Staff | Live queue view |
| POST | `/api/staff/emergency` | Staff | Emergency override |
| POST | `/api/staff/noshow` | Staff | Mark no-show |
| GET | `/api/doctor/queue` | Doctor | Next 5 patients |
| POST | `/api/doctor/next` | Doctor | Call next patient |
| GET | `/api/timetable` | All | Doctor timetable |

---

## ⚡ Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `queue:update` | Server → All | Full queue refresh |
| `notification:next` | Server → Student | You're #1 — arrive now |
| `notification:second` | Server → Student | You're #2 — prepare |
| `notification:emergency` | Server → Students | Emergency reorder |
| `queue:empty` | Server → Doctor | Queue depleted |

---

## 🔐 Security Features
- JWT authentication (24hr expiry)
- Session timeout after 30 min idle
- Account lock after 5 failed logins
- bcrypt password hashing (12 rounds)
- RBAC — role-based access control
- Rate limiting: 100 req/min per user
- MongoDB sanitization (NoSQL injection prevention)
- Helmet.js security headers
- CORS configured for frontend origin

---

## 📋 Business Rules Implemented
| Rule | Description |
|------|-------------|
| BR-1 | One active entry per student per date |
| BR-2 | Queue cutoff 30 min before closing |
| BR-3 | Auto-assign next available slot |
| BR-4 | 12 min slot duration (configurable) |
| BR-5 | Slots movable to later times only |
| BR-6 | No slot changes within 30 min of appointment |
| BR-7 | Max 2 slot changes per appointment |
| BR-8 | No cancellation within 15 min of slot |
| BR-9 | No-show after 5 min of "Next" notification |
| BR-10 | Emergency override requires staff role + audit log |

---

## 👤 Roles & Access
| Feature | Student | Staff | Doctor |
|---------|---------|-------|--------|
| Join Queue | ✅ | ❌ | ❌ |
| View Own Status | ✅ | ❌ | ❌ |
| Move / Cancel Slot | ✅ | ✅ | ❌ |
| Live Queue Dashboard | ❌ | ✅ | ❌ |
| Emergency Override | ❌ | ✅ | ❌ |
| Mark No-Show | ❌ | ✅ | ❌ |
| Call Next Patient | ❌ | ❌ | ✅ |
| View Timetable | ✅ | ✅ | ✅ |
