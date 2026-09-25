# Backend Setup Guide

Restaurant QR Food Ordering System — Backend Setup Reference

## 1. Project Init

\`\`\`bash
mkdir backend && cd backend
npm init -y
\`\`\`

## 2. Install Core Dependencies

\`\`\`bash
npm install express sequelize pg pg-hstore bcrypt jsonwebtoken socket.io cors dotenv cookie-parser
\`\`\`

## 3. Install Dev Dependencies

\`\`\`bash
npm install -D typescript@^5.7.0 tsx @types/node @types/express @types/bcrypt @types/jsonwebtoken @types/cors @types/cookie-parser
\`\`\`

> Note: `ts-node-dev` was removed due to compatibility issues with newer TypeScript/Node versions. `tsx` replaced it.

## 4. Initialize TypeScript Config

\`\`\`bash
npx tsc --init
\`\`\`

Then manually configure `tsconfig.json` with strict settings and `"module": "nodenext"`.

## 5. Create Folder Structure

\`\`\`bash
mkdir -p src/config src/models src/controllers src/routes src/middleware src/sockets src/utils

touch src/config/database.ts

touch src/models/User.ts src/models/Category.ts src/models/Product.ts \
      src/models/Table.ts src/models/TableSession.ts src/models/Order.ts \
      src/models/OrderItem.ts src/models/index.ts

touch src/middleware/auth.ts

touch src/sockets/index.ts

touch src/utils/jwt.ts src/utils/qrToken.ts src/utils/seedAdmin.ts src/utils/seedMenu.ts

touch src/controllers/authController.ts

touch src/routes/authRoutes.ts

touch src/app.ts src/server.ts

touch .env .env.example
\`\`\`

## 6. Database Setup (PostgreSQL)

\`\`\`bash
createdb food_ordering
\`\`\`

## 7. package.json Scripts

Add these manually to `package.json`:

\`\`\`json
"scripts": {
  "dev": "tsx watch src/server.ts",
  "seed:admin": "tsx src/utils/seedAdmin.ts",
  "seed:menu": "tsx src/utils/seedMenu.ts",
  "build": "tsc",
  "start": "node dist/server.js"
}
\`\`\`

## 8. Run Dev Server

\`\`\`bash
npm run dev
\`\`\`

## 9. Seed Initial Data

\`\`\`bash
npm run seed:admin
npm run seed:menu
\`\`\`

## 10. Verification / Debug Commands

**Health check:**
\`\`\`bash
curl http://localhost:5001/health
\`\`\`

**Test login:**
\`\`\`bash
curl -X POST http://localhost:5001/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@example.com","password":"admin123"}'
\`\`\`

**Inspect database via psql:**
\`\`\`bash
psql restaurant_qr_dev

\\dt                    -- list tables
\\d users               -- describe a table
SELECT * FROM users;
\\q                     -- quit
\`\`\`

**Port conflict debugging:**
\`\`\`bash
lsof -i :5000           -- find process using a port
kill -9 <PID>           -- kill it (replace <PID> with actual number)
\`\`\`

## Environment Variables (.env)

\`\`\`
PORT=5001
DATABASE_URL=postgres://user:password@localhost:5432/food_ordering
JWT_SECRET=replace_this_with_a_long_random_string
NODE_ENV=development
CLIENT_URL=http://localhost:5173
\`\`\`