# MentriQIQ — Test & Placement Preparation Platform

A full-stack MCQ test platform inspired by Upwork-style assessments.

---

## 📁 Project Structure

```
mentriqiq/
├── backend/                   # Node.js + Express API
│   ├── models/
│   │   ├── User.js            # Student/Admin schema (bcrypt passwords)
│   │   ├── Test.js            # Test + questions schema
│   │   └── Result.js          # Test attempt results
│   ├── routes/
│   │   ├── authRoutes.js      # /api/auth  (register, login, me)
│   │   ├── testRoutes.js      # /api/tests (list, get, submit)
│   │   ├── resultRoutes.js    # /api/results (my results, leaderboard)
│   │   └── adminRoutes.js     # /api/admin  (CRUD tests, students, export)
│   ├── middleware/
│   │   └── authMiddleware.js  # JWT verify, adminOnly guard
│   ├── utils/
│   │   ├── emailService.js    # Nodemailer result notifications
│   │   └── seedData.js        # Creates admin + sample test
│   ├── server.js              # Express app entry point
│   ├── .env.example           # Environment variable template
│   └── package.json
│
└── frontend/                  # React app
    ├── public/index.html
    └── src/
        ├── context/
        │   └── AuthContext.js  # Global auth state + dark mode
        ├── components/
        │   └── common/
        │       └── Navbar.js   # Shared top navigation
        ├── pages/
        │   ├── LoginPage.js
        │   ├── RegisterPage.js
        │   ├── NotFoundPage.js
        │   ├── student/
        │   │   ├── StudentDashboard.js  # Stats + score history chart
        │   │   ├── TestListPage.js      # Browse available tests
        │   │   ├── TestPage.js          # Timer MCQ interface + anti-cheat
        │   │   ├── ResultPage.js        # Score display (no answer details)
        │   │   └── LeaderboardPage.js   # Top 20 per test
        │   └── admin/
        │       ├── AdminDashboard.js    # Analytics + recent activity
        │       ├── AdminTests.js        # List/publish/delete tests
        │       ├── TestEditor.js        # Create/edit test + questions
        │       └── AdminStudents.js     # Student list + export CSV
        ├── App.js              # Routes + auth guards
        ├── index.js
        ├── index.css           # Global styles + CSS variables (dark/light)
        └── package.json
```

---

## ⚙️ Prerequisites

- **Node.js** v18 or higher — https://nodejs.org
- **MongoDB** — Install locally or use MongoDB Atlas (free cloud)
- **Git** (optional)

---

## 🚀 Setup Instructions

### Step 1 — Clone / download the project

```bash
# If using git:
git clone <your-repo-url>
cd mentriqiq

# Or just place the mentriqiq folder wherever you want
```

---

### Step 2 — Backend setup

```bash
cd backend

# Install dependencies
npm install

# Copy the example env file and fill in your values
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/mentriqiq   # or your Atlas URI
JWT_SECRET=replace_with_a_long_random_secret
ADMIN_EMAIL=admin@mentriqiq.com
ADMIN_PASSWORD=Admin@123456

# Optional: Gmail email notifications
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password        # Use Gmail App Password
FRONTEND_URL=http://localhost:3000
```

**Seed the database** (creates admin user + sample test):
```bash
node utils/seedData.js
```

You'll see:
```
✅ MongoDB Connected
✅ Admin created: admin@mentriqiq.com
✅ Sample test created: JavaScript Basics
🎉 Seed completed!
Admin Login: admin@mentriqiq.com / Admin@123456
```

**Start the backend**:
```bash
npm run dev      # Development (auto-restart with nodemon)
# or
npm start        # Production
```

Backend runs at: **http://localhost:5000**

---

### Step 3 — Frontend setup

Open a **new terminal** window:

```bash
cd frontend

# Install dependencies
npm install

# Start the React dev server
npm start
```

Frontend runs at: **http://localhost:3000**

> The `"proxy": "http://localhost:5000"` in `frontend/package.json` automatically forwards `/api` calls to the backend — no CORS issues during development.

---

### Step 4 — Access the app

| Role    | URL                            | Credentials                         |
|---------|--------------------------------|--------------------------------------|
| Student | http://localhost:3000/register | Register a new account               |
| Admin   | http://localhost:3000/login    | admin@mentriqiq.com / Admin@123456   |

---

## 🌐 API Reference

### Auth Routes
| Method | Endpoint           | Auth     | Description            |
|--------|--------------------|----------|------------------------|
| POST   | /api/auth/register | —        | Register student       |
| POST   | /api/auth/login    | —        | Login (student/admin)  |
| GET    | /api/auth/me       | Student  | Get current user       |

### Test Routes (Student)
| Method | Endpoint                 | Auth    | Description                    |
|--------|--------------------------|---------|--------------------------------|
| GET    | /api/tests               | Student | List available tests           |
| GET    | /api/tests/:id           | Student | Get test (no correct answers!) |
| POST   | /api/tests/:id/submit    | Student | Submit answers, get score      |

### Result Routes (Student)
| Method | Endpoint                        | Auth    | Description         |
|--------|---------------------------------|---------|---------------------|
| GET    | /api/results/my                 | Student | My results          |
| GET    | /api/results/leaderboard/:testId| Student | Test leaderboard    |

### Admin Routes (Admin only)
| Method | Endpoint                       | Description               |
|--------|--------------------------------|---------------------------|
| GET    | /api/admin/tests               | All tests with stats      |
| POST   | /api/admin/tests               | Create test               |
| PUT    | /api/admin/tests/:id           | Update test               |
| PATCH  | /api/admin/tests/:id/publish   | Toggle publish            |
| DELETE | /api/admin/tests/:id           | Delete test               |
| GET    | /api/admin/students            | All students + results    |
| GET    | /api/admin/analytics           | Dashboard analytics       |
| GET    | /api/admin/export/students     | Download CSV              |

---

## 🔒 Security Features

- **Passwords** hashed with bcrypt (salt rounds: 12)
- **JWT** tokens expire in 7 days
- **Score calculated server-side** — frontend never sends the correct answers
- **Correct answers never sent** to the browser (stripped from API responses)
- **Rate limiting** — 100 requests per 15 minutes per IP
- **Helmet.js** — secure HTTP headers
- **Admin routes** protected with double middleware (JWT + role check)

---

## 🛡️ Anti-Cheating Features

1. **Tab switch detection** — warns after 1st switch, auto-submits after 3rd
2. **Auto-submit on timer expiry** — server records `isAutoSubmitted: true`
3. **Server-side scoring** — score cannot be tampered with by the client
4. **Correct answers hidden** — never included in any student-facing API response

---

## ✨ Key Features

| Feature                    | Details                                              |
|----------------------------|------------------------------------------------------|
| Timer-based MCQ tests      | Per-test duration, auto-submits when time expires    |
| Score-only results         | Students see score %, NOT which answers were wrong   |
| Dark / Light mode          | Toggle persists to localStorage                      |
| Leaderboard                | Top 20 per test, ranked by score then time           |
| Test scheduling            | Set start/end date-time for timed availability       |
| Performance chart          | Bar chart of recent test scores on student dashboard |
| Admin analytics            | Daily attempts line chart, tests by category         |
| CSV export                 | Name, Email, Phone, Score — one row per attempt      |
| Email notifications        | Result email sent on submission (configurable)       |
| Question shuffle            | Optional per-test randomisation                      |
| Retake control             | Admin can allow/disallow retakes per test            |
| Mobile responsive          | Flexbox/grid layout works on phones                  |

---

## 💡 3 Innovative Feature Ideas (Bonus)

### 1. 🤖 AI Question Generator
Integrate OpenAI API — admin enters a topic and difficulty level, and Claude/GPT auto-generates 10 MCQs with correct answers and explanations. One click to import into the test editor.

```
Admin clicks "Generate with AI" → enters "React Hooks, Medium difficulty"
→ AI returns 10 structured MCQs → admin reviews → one-click add to test
```

### 2. 🎯 Adaptive Difficulty Engine
Track per-topic performance across tests. If a student scores <50% in "JavaScript Closures" across 3 tests, the system automatically recommends a "Closures Remedial Test" and sends them a personalised study nudge email.

### 3. 📊 Proctoring Score
During a test, silently track: tab switches, idle time, copy-paste attempts (via clipboard events), and completion speed relative to test average. Generate a "Integrity Score" (0-100) shown only to admin per attempt — helps flag suspicious results without punishing students outright.

---

## 🏭 Production Deployment

**Backend** — Deploy to Render, Railway, or AWS EC2:
```bash
npm start   # uses PORT from environment
```

**Frontend** — Build and deploy to Vercel or Netlify:
```bash
cd frontend
REACT_APP_API_URL=https://your-backend.com/api npm run build
# Upload the build/ folder
```

**MongoDB** — Use MongoDB Atlas for production (free tier available).

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| `ECONNREFUSED` on backend start | MongoDB not running — start MongoDB service |
| `401 Unauthorized` on API calls | JWT expired — log out and log in again |
| Email not sending | Check `EMAIL_USER` / `EMAIL_PASS` in `.env`; use Gmail App Password |
| CORS errors | Ensure `FRONTEND_URL` in backend `.env` matches your React URL |
| Admin login fails | Run `node utils/seedData.js` to create admin user |

#   M e n t r i Q I Q  
 