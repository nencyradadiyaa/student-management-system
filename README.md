# Full Stack Student Management System

A high-fidelity, production-ready college student management platform built with **Node.js, Express.js, MySQL, Bootstrap 5, and EJS**. 

This platform allows administrators to register students, manage demographic records, upload profile photos, track daily class attendance sheets, issue subject grades, and export registry summaries to Excel/PDF.

---

## Technical Stack Overview

* **Backend**: Node.js, Express.js (MVC Architecture)
* **Frontend**: EJS Templates, Bootstrap 5, FontAwesome, Chart.js
* **Database**: MySQL (Connection Pool via `mysql2/promise`)
* **Session Handler**: Database-persisted session store (`express-mysql-session`)
* **Authentication**: Password hashing with `bcryptjs`
* **File Uploads**: Image parser with `multer`
* **Exports Engine**: `pdfkit` (PDF report cards) & `xlsx` (Excel sheets data dump)
* **Notifications**: `nodemailer` (welcome enrollment automated alerts)

---

## Features

1. **Secure Admin Authentication**:
   - Login, logout, session expiration, and protected administrative route guards.
   - Secure server-side password hashing.
2. **Interactive Analytics Dashboard**:
   - Total students registry counts.
   - High-fidelity Chart.js bar charts representing class/department enrollment splits.
   - Demographics doughnut chart for gender distribution.
   - Dynamic theme integration (instant re-coloring of charts when toggling themes).
3. **Student Directory & Profiles**:
   - Complete CRUD operations (Add, Edit, View Profile, Delete Student).
   - Search by name, email, phone, or enrollment number.
   - Multi-column sorting (Alphabetical, enrollment code, department, semester).
   - Dynamic pagination for directory grids.
   - Photo uploads with safe initials avatar falls-backs.
4. **Automated welcome notifications**:
   - Sends customized HTML emails to new students containing their registration parameters upon registration.
5. **Class Attendance Management**:
   - Select date, department, and semester to load class sheets.
   - Bulk mark student status (Present, Absent, Late, Excused) with optional remarks.
   - "Mark All Present" utility button for fast entries.
6. **Grades & Marks Ledger**:
   - Subject-wise scores (Obtained vs Maximum Marks) mapping.
   - Automatic GPA percentage and report card transcript compilation.
   - Aggregated class statistics (Average, Minimum, Maximum score) per subject.
7. **Report Printing & Downloads**:
   - Export filtered students database to Excel spreadsheets.
   - Generate administrative PDF transcripts with profile photos, academic marks, and attendance percentages.
   - Custom print CSS rules to hide UI chrome when clicking "Print Report" inside the browser.
8. **Modern Responsive Design**:
   - Light Mode & Dark Mode layouts with active state persistence.
   - Responsive sidebar navigations and drawer panels on mobile.

---

## Folder Structure

```
student-management-system/
├── config/
│   └── db.js                   # Database pool and connection configuration
├── controllers/
│   ├── authController.js       # Admin authentication logic
│   ├── dashboardController.js  # Dashboard aggregations and API feeds
│   ├── studentController.js    # Student CRUD and profile collator
│   ├── attendanceController.js # Attendance roll sheet manager
│   ├── marksController.js      # Student grades ledger
│   └── exportController.js     # PDF transcripts and Excel generator
├── middleware/
│   ├── auth.js                 # Authentication route protectors
│   └── upload.js               # Multer file upload settings
├── models/
│   ├── Admin.js                # Admin operations
│   ├── Student.js              # Student operations, search, filters & paging
│   ├── Department.js          # Department lookups
│   ├── Attendance.js           # Attendance tracking
│   └── Marks.js                # Marks management and calculations
├── routes/
│   ├── authRoutes.js           # Login & logout endpoints
│   ├── dashboardRoutes.js      # Dashboard routes and charts APIs
│   ├── studentRoutes.js        # Student pages
│   ├── attendanceRoutes.js     # Attendance pages
│   ├── marksRoutes.js          # Grading sheets
│   └── exportRoutes.js         # Report downloads
├── public/
│   ├── css/
│   │   └── style.css           # Glassmorphism, theme styling & sidebar layouts
│   ├── js/
│   │   ├── main.js             # Mobile drawers, toast dismissals, theme toggle
│   │   └── charts.js           # Chart.js layout configs
│   └── uploads/                # Directory storing student photos
├── views/
│   ├── partials/               # EJS Page layout pieces (header, sidebar, etc.)
│   ├── auth/                   # Authentication view templates
│   ├── students/               # Student directory and creation views
│   ├── attendance/             # Daily attendance checklists
│   ├── marks/                  # Grades sheets and report cards
│   ├── error.ejs               # User-friendly error panel
│   └── dashboard.ejs           # Main dashboard panel
├── schema.sql                  # MySQL database initialization script
├── seed.js                     # Seed script for initial setup (Admins, Students)
├── .env.example                # Sample environment variables
├── .env                        # Active environment variables
├── package.json                # Project dependencies and scripts
└── app.js                      # Express server entry point
```

---

## Local Installation & Setup

### Prerequisites

Ensure you have **Node.js** (v18+) and **MySQL** (v8.0+) installed on your machine.

### Step 1: Clone or Navigate to Project Directory

If navigating locally:
```bash
cd student-management-system
```

### Step 2: Install Node Dependencies

```bash
npm install
```

### Step 3: Configure Database and Environments

1. Make sure your local MySQL server is active.
2. Open the active `.env` file and configure your database parameters:
   ```env
   PORT=3000
   NODE_ENV=development

   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=student_management

   SESSION_SECRET=your_secret_session_key

   # SMTP Configuration (Optional welcome emails)
   SMTP_HOST=smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_USER=your_smtp_username
   SMTP_PASS=your_smtp_password
   ```

### Step 4: Run Seeding & Migrations

Initialize database schemas and insert mock records (Admins, Departments, Students, Marks, and Attendance Logs) by running:
```bash
npm run seed
```

This script will:
* Verify or create the target database.
* Execute `schema.sql` statement structures.
* Hash administrative credentials.
* Seed starter directories.

**Default Seed Credentials:**
* **Username**: `admin`
* **Password**: `admin123`

### Step 5: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Vercel Serverless Preview (Alasql Fallback)

To support immediate database-free previewing, this project includes a pure-JavaScript in-memory fallback using **Alasql**. If no MySQL connection variables are configured or available, the platform automatically initializes and seeds an in-memory SQL database on the fly.

To make the application fully compatible with Vercel's serverless container scaling:
* **Stateless Cookie Sessions**: Sessions are encrypted and stored entirely in client-side cookies via `cookie-session` in fallback mode, ensuring active logins persist across different serverless executions.
* **SQL Query Translators**: An automatic query patcher is integrated into `config/db.js` to translate pagination syntax (`LIMIT`/`OFFSET`) and quotes around reserved SQL words (`as count`, `as total`) to make standard MySQL queries parse correctly in Alasql.
* **Route Mapping**: Configured with `vercel.json` to handle all application requests using the serverless Node.js entry point.

---

## Production Deployment Instructions

### 1. Database Hosting (Railway, Aiven, or Supabase)

You can host a remote MySQL instance using platforms like Railway:
1. Log in to [Railway](https://railway.app/).
2. Select **New Project** -> **Provision MySQL**.
3. Once active, copy the connection variables: `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`.
4. Use these parameters to populate your production environment configuration.

### 2. Backend Hosting (Render)

Deploy the Express.js application on Render:
1. Log in to [Render](https://render.com/).
2. Click **New +** -> **Web Service**.
3. Link your repository.
4. Specify the build parameters:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node app.js`
5. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `DB_HOST`: *Your Railway MySQL Host*
   - `DB_PORT`: `3306`
   - `DB_USER`: *Your Railway MySQL User*
   - `DB_PASSWORD`: *Your Railway MySQL Password*
   - `DB_NAME`: *Your Railway MySQL Database Name*
   - `SESSION_SECRET`: *A secure random string*
   - `SMTP_USER` / `SMTP_PASS` / `SMTP_HOST`: *Your mail server settings (optional)*
6. Click **Deploy Web Service**.
7. Once successfully deployed, Render will provide a **Live Demo URL** (e.g. `https://student-management-system.onrender.com`).
