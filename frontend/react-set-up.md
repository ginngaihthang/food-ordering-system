# Frontend Setup

React + TypeScript + Vite + Tailwind CSS + shadcn/ui

## 1. Install Node.js

Use Node 20 LTS or later. Check your version:
\`\`\`bash
node -v
\`\`\`

## 2. Navigate to frontend folder

\`\`\`bash
cd frontend
\`\`\`

## 3. Install dependencies

\`\`\`bash
npm install
\`\`\`

This installs everything in `package.json`, including:
- react, react-dom, react-router-dom, axios, socket.io-client
- tailwindcss, @tailwindcss/vite
- lucide-react

## 4. Create your `.env` file

\`\`\`bash
cp .env.example .env
\`\`\`

Edit `.env`:
\`\`\`
VITE_API_URL=http://localhost:5001
\`\`\`

## 5. Run the frontend dev server

\`\`\`bash
npm run dev
\`\`\`

Vite will print the local URL, typically:
\`\`\`
http://localhost:5173
\`\`\`

## 6. Verify

Open `http://localhost:5173/admin/login` in your browser. Log in with the seeded admin credentials (see backend setup) to confirm the frontend can reach the backend.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## shadcn/ui components

To add more components later:
\`\`\`bash
npx shadcn@latest add <component-name>
\`\`\`