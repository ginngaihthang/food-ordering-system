# Restaurant QR Food Ordering System

A full-stack web app where restaurant customers scan a QR code to order food, and staff manage everything from an admin dashboard. It supports **dine-in** (a QR code on each table) and **takeaway** (a QR code at the counter), with live order updates and no customer accounts.

## Features

### Customers
- Scan a **table QR** (dine-in) or the **takeaway QR** (counter) and open the menu in the browser, with no app or account
- Search, category filters, sold-out dishes shown greyed out and not orderable
- Cart with quantity controls and "Add something else?" suggestions
- Dine-in: order several times in one visit and follow every order on a live bill
- Takeaway: get a **pickup number** and a live progress tracker
- Optional **online payment** for takeaway (PayNow and cards through Stripe)
- Works on phones first, with offline warnings and sold-out handling at checkout

### Staff and admin
- **Live Orders** board with scrollable columns, an alarm sound for new orders, and Accept / Ready / Hand over / Cancel
- **Dashboard** with revenue, orders, top items, a 7-day chart and table status
- **Tables**: create tables, print QR codes, see each table's running total, take **cash payment with change calculation**, print the bill, close the session
- **Takeaway orders** and **Order history** with daily stats, a week strip, filters and search
- **Products** (Cloudinary images), **Categories** (show or hide), **Users** (admin or staff)
- **Settings**: restaurant details, currency, tax, ordering on or off, payment instructions
- Printable **receipts** (80mm friendly) with tax shown, and a printable **takeaway QR poster**
- Idle table sessions close themselves

### Security and reliability
- Passwords hashed with bcrypt, JWT login, role-based access on every route
- Prices are always calculated on the server, and each order stores the price at the time
- Private order links, so orders can't be found by guessing numbers
- The live admin feed accepts only logged-in staff
- Rate limiting, Helmet, input validation, and caps on orders waiting for acceptance
- Stripe payments are confirmed only by a signed webhook, never by the browser
- One active session per table, enforced in the database

## Screenshots

| Customer menu | Cart | Order tracking |
|---|---|---|
| ![Menu](docs/screenshots/menu.png) | ![Cart](docs/screenshots/cart.png) | ![Order status](docs/screenshots/order-status.png) |

| Live orders | Dashboard | Table bill |
|---|---|---|
| ![Live orders](docs/screenshots/live-orders.png) | ![Dashboard](docs/screenshots/dashboard.png) | ![Session bill](docs/screenshots/session-bill.png) |

## Tech stack

| Area | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, React Router, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express, TypeScript, Sequelize |
| Database | PostgreSQL (Docker) |
| Auth | JWT, bcrypt |
| Real time | Socket.IO |
| Images | Cloudinary |
| Payments | Stripe Checkout (optional) |

## How it works

**Dine-in**
```text
Table QR  ->  menu for that table  ->  first order starts a table session
          ->  more orders join the same session
          ->  staff take payment, mark orders served, close the session
```

**Takeaway**
```text
Takeaway QR  ->  menu  ->  pay (online, if switched on)  ->  pickup number
             ->  kitchen accepts  ->  Ready  ->  customer collects
```

Order status: `PENDING` (shown as Received) -> `PREPARING` -> `READY` -> `COMPLETED` (shown as Served), or `CANCELLED`.

## Project structure

```text
food-ordering-system/
├── backend/
│   └── src/
│       ├── config/        database, Cloudinary, Stripe
│       ├── controllers/   request handlers
│       ├── jobs/          background jobs (idle sessions)
│       ├── middleware/    auth, uploads, rate limits
│       ├── migrations/    numbered database changes
│       ├── models/        Sequelize models and associations
│       ├── routes/        Express routers
│       ├── services/      payment logic
│       ├── sockets/       Socket.IO setup
│       └── utils/         helpers and seed scripts
├── frontend/
│   └── src/
│       ├── api/           API calls
│       ├── components/    UI by feature (admin, orders, tables, ...)
│       ├── context/       auth, cart, settings
│       ├── hooks/
│       ├── lib/
│       └── pages/         admin/ and customer/
├── scripts/backup-db.sh   database backup
├── docker-compose.yml     PostgreSQL
└── docs/                  SRS and screenshots
```

## Getting started

### Prerequisites
- Node.js 20 or later
- Docker Desktop
- A free [Cloudinary](https://cloudinary.com) account (needed for product image upload)
- A Stripe account in test mode (optional, only for online takeaway payment)

### 1. Clone and start the database

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
docker compose up -d
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env     # then fill in the values (see below)
npm run migrate          # creates the tables
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-passphrase-12+' npm run seed:admin
npm run seed:menu        # optional sample menu
npm run dev
```

Check it works: `curl http://localhost:5001/health` returns `{"status":"ok"}`. The admin password must be at least 12 characters.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### 4. Open the app

| What | Address |
|---|---|
| Admin login | http://localhost:5173/admin/login |
| Takeaway menu | http://localhost:5173/menu |
| Dine-in menu | http://localhost:5173/menu?table=`<qr-token>` |

Log in, open **Tables**, add a table and press **QR** to get its code. Press **Takeaway QR** to print the counter poster.

## Environment variables

### `backend/.env`

| Variable | Description |
|---|---|
| `PORT` | Server port. Use `5001`, because macOS uses 5000 for AirPlay |
| `NODE_ENV` | `development` or `production` |
| `DATABASE_URL` | e.g. `postgres://postgres:yourpassword@localhost:5432/food_ordering` |
| `JWT_SECRET` | Long random string, e.g. `openssl rand -hex 32` |
| `CLIENT_URL` | Frontend address allowed by CORS. Stripe sends customers back here |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Product image storage |
| `TRUST_PROXY` | Set to `1` behind a proxy such as Render, Railway or Nginx |
| `TZ` | Restaurant timezone, e.g. `Asia/Singapore`. Daily totals and pickup numbers restart at midnight in this zone |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CURRENCY` | Optional. Online takeaway payment (`sgd` for PayNow) |

### `frontend/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend address, e.g. `http://localhost:5001` |
| `VITE_PUBLIC_URL` | The address customers' phones open. Used inside QR codes, so set it to your real domain before printing |

## Online payment for takeaway (optional)

1. Create a Stripe account, stay in test mode, and copy the secret key.
2. In the Stripe Dashboard, go to **Settings -> Payment methods** and turn on PayNow and cards.
3. Forward webhooks to your computer:
```bash
   stripe listen --forward-to localhost:5001/api/webhooks/stripe
```
4. Put the keys in `backend/.env`, restart the backend, then switch on **Settings -> Payments -> Require online payment for takeaway**.

A takeaway order only reaches the kitchen after Stripe's signed webhook confirms payment. Cancelling a paid order refunds it automatically.

## Scripts

| Where | Command | What it does |
|---|---|---|
| backend | `npm run dev` | Start with hot reload (runs migrations on startup) |
| backend | `npm run build` / `npm start` | Compile and run the production build |
| backend | `npm run migrate` | Run pending database migrations |
| backend | `npm run seed:admin` | Create an admin user from `ADMIN_EMAIL` and `ADMIN_PASSWORD` |
| backend | `npm run seed:menu` | Add a sample menu |
| frontend | `npm run dev` | Start Vite |
| frontend | `npm run build` | Production build |
| frontend | `npm run lint` | Run ESLint |

## Roles and permissions

| Action | Admin | Staff |
|---|:--:|:--:|
| Live orders: accept, serve, cancel | ✓ | ✓ |
| Take payment, print receipts, close table sessions | ✓ | ✓ |
| Add categories, products and tables | ✓ | ✓ |
| Mark a product sold out | ✓ | ✓ |
| Edit or delete categories, products and tables; regenerate a table QR | ✓ | |
| Settings | ✓ | |
| Manage users | ✓ | |
| Change own password | ✓ | ✓ |

## API overview

| Access | Endpoints |
|---|---|
| Public | `POST /api/auth/login`, `GET /api/menu`, `GET /api/settings`, `GET /api/tables/by-token/:token`, `POST /api/orders`, `POST /api/orders/takeaway-checkout`, `GET /api/orders/session/:tableToken`, `GET /api/orders/track/:token`, `GET /health` |
| Stripe only | `POST /api/webhooks/stripe` (checked by signature) |
| Staff and admin | Orders (list, status, cancel, history, takeaway, receipt), table sessions (bill, pay, close), dashboard, uploads, create categories, products and tables |
| Admin only | Users, settings, system status, edit and delete categories, products and tables |

## Database

Tables: `users`, `categories`, `products`, `tables`, `table_sessions`, `orders`, `order_items`, `settings`, `checkouts`.

- **Migrations** are numbered files in `backend/src/migrations` and run automatically when the server starts. To change the database, add a new migration and register it in `migrations/index.ts`. Never edit one that has already run.
- **Backups:** `./scripts/backup-db.sh` writes a compressed dump to `backups/`. Restore with:
```bash
  gunzip -c backups/<file>.sql.gz | docker exec -i food_ordering psql -U postgres -d food_ordering
```

## Deployment checklist

- [ ] Serve everything over HTTPS
- [ ] Set `NODE_ENV=production`, a strong `JWT_SECRET`, and `CLIENT_URL` to your real frontend address
- [ ] Set `TRUST_PROXY=1` if behind a proxy, and `TZ` to the restaurant's timezone
- [ ] Set `VITE_API_URL` and `VITE_PUBLIC_URL`, then print the table and takeaway QR codes from the live site
- [ ] Stripe: live keys, and a webhook endpoint at `/api/webhooks/stripe` for `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.expired`
- [ ] Create your own admin and delete any default account
- [ ] Schedule database backups
- [ ] Run a quiet shift with real staff before opening

## Troubleshooting

- **Port 5000 is already in use (macOS):** use `PORT=5001`.
- **`database "food_ordering" does not exist`:** the Docker volume was created with a different database name. `docker compose down -v` deletes the data, then `docker compose up -d` recreates it.
- **`column ... does not exist`:** run `npm run migrate`. The app changes tables only through migrations.
- **QR code opens `localhost` on a phone:** set `VITE_PUBLIC_URL` and restart the frontend.
- **Testing through a dev tunnel (HTTPS):** forward both ports and use the HTTPS addresses in both `.env` files, or the browser blocks the requests.
- **Alarm sound is silent:** browsers allow audio only after a click, so press **Enable sound** on Live Orders after each page load.
- **TypeScript errors in tooling:** use TypeScript 5.x.

## Roadmap

- Table access codes, so a photo of a table QR can't be used to order or view a bill
- Activity log of who accepted, cancelled or took payment
- End-of-day cash-up and CSV export
- Staff "Create order", "Call waiter" and "Request bill", and moving a table's session
- Out of scope for now: customer accounts, loyalty points, delivery, multiple branches

## Documentation

The full requirements are in [docs/SRS.md](docs/SRS.md).

## License

Licensed under the Apache License 2.0. See [LICENSE](LICENSE).