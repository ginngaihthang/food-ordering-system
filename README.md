# Restaurant QR Food Ordering System

A full-stack web application for QR-based restaurant ordering — dine-in and takeaway.

## Tech Stack

**Frontend:** React, TypeScript, Vite, React Router, Tailwind CSS, shadcn/ui
**Backend:** Node.js, Express, TypeScript, Sequelize
**Database:** PostgreSQL (via Docker)
**Auth:** JWT, bcrypt
**Real-time:** Socket.IO

## Project Structure

\`\`\`
food-ordering-system/
├── backend/       # Express API
├── frontend/      # React app
├── docker-compose.yml
└── README.md
\`\`\`

## Quick Start

### 1. Start the database
\`\`\`bash
docker compose up -d
\`\`\`

### 2. Set up and run the backend
See [backend/SETUP.md](backend/SETUP.md)
\`\`\`bash
cd backend
npm install
npm run dev
\`\`\`

### 3. Set up and run the frontend
See [frontend/SETUP.md](frontend/SETUP.md)
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

### 4. Open the app
- Customer menu: `http://localhost:5173/menu?table=<qr_token>`
- Admin dashboard: `http://localhost:5173/admin/login`

## License

Apache 2.0 — see [LICENSE](LICENSE)