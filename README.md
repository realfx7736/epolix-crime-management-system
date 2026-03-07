# E‑POLIX: Digital Crime Record Management System

This project is divided into two main parts:
1. **Frontend**: A modern, React-based web application with sophisticated animations and role-based themes.
2. **Backend**: A Node.js/Express server providing authentication and case management APIs.

## How to Run the Project

### 1. Frontend Setup
1. Open a terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open the provided URL (usually `http://localhost:5173`) in your browser.

### 2. Backend Setup
1. Open another terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   node server.js
   ```
   *Note: Ensure you have MongoDB running locally, or update the `.env` file with your MongoDB URI.*

## Role-Based Portals
- **Citizen (User)**: Blue theme, focus on reporting and tracking.
- **Police**: Indigo theme, tactical HUD for dispatch and investigations.
- **Staff**: Emerald theme, record management and administrative tasks.
- **Administrator**: Rose theme, global command center and security logs.

## Verification Features
- **Aadhaar/Dept ID**: Integrated in the multi-step login flow.
- **OTP Verification**: Simulated backend flow (Default test OTP: `123456`).
- **Secure Access**: Role-based routing and restricted department terminals.
