# Deployment

## Shape of a production setup

```text
Customers and staff ──HTTPS──> Frontend (static files)
                    └─HTTPS and WSS─> Backend (ONE Node instance) ──> PostgreSQL
                                          ├──> Cloudinary (images)
                                          └──<─> Stripe (payments, webhook)
```

| Part | Needs | Examples |
|---|---|---|
| Frontend | A static host with a fallback to `index.html` | Netlify, Vercel, Cloudflare Pages |
| Backend | A host that keeps a Node process running and supports WebSockets. Serverless functions cannot run it | Render, Railway, Fly.io, a VPS |
| Database | Managed PostgreSQL with automatic backups | Your backend host's, Neon, Supabase |
| Images | A Cloudinary account | cloudinary.com |
| Payments (optional) | A Stripe account | stripe.com |

Run **one** backend instance. Socket.IO rooms, the background jobs and the rate-limit counters live in that process's memory. Scaling out would need a Redis adapter and shared jobs.

Some free plans put the server to sleep when idle. That delays the first customer and drops live updates, so use an always-on plan for a real restaurant.

## 1. Make the backend runnable in production

The simplest dependable way is to run the TypeScript with `tsx`, as in development.

```bash
cd backend
npm install --save-prod tsx
```

Change `start` in `backend/package.json`:
```json
"start": "tsx src/server.ts"
```

`--save-prod` matters, because hosts usually install only production dependencies and would otherwise not find `tsx`. Test it locally before deploying:

```bash
NODE_ENV=production npm start
```

If you prefer compiled JavaScript, make `npm run build && node dist/server.js` work locally first. If it fails with a module error, fix that before deploying.

### Docker image (optional)

**`backend/Dockerfile`**
```dockerfile
FROM node:lts-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY tsconfig.json ./
COPY src ./src
ENV NODE_ENV=production
CMD ["npm", "start"]
```

**`backend/.dockerignore`**
```
node_modules
.env
dist
```

### Managed databases usually need SSL

In `backend/src/config/database.ts`:
```ts
const useSsl = process.env.DATABASE_SSL === 'true';

export const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: false,
  ...(useSsl ? { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } } : {}),
});
```
Set `DATABASE_SSL=true` only when your provider requires it. For stricter checking, give the provider's CA certificate instead of `rejectUnauthorized: false`.

## 2. Make the frontend routes survive a refresh

Without this, opening `/menu` or `/admin/orders` directly returns a 404.

- **Netlify:** create `frontend/public/_redirects` containing `/*  /index.html  200`
- **Vercel:** create `frontend/vercel.json`:
```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```
- **Other hosts:** configure a fallback to `index.html` for every path.

## 3. Environment variables

### Backend

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | Usually set by the host. Otherwise `5001` |
| `DATABASE_URL` | The managed database address |
| `DATABASE_SSL` | `true` if the provider requires SSL |
| `JWT_SECRET` | `openssl rand -hex 32`. Changing it logs everyone out |
| `CLIENT_URL` | The frontend address, **exactly**, for example `https://order.example.com` with no trailing slash. It is used for CORS, live updates and Stripe's return page |
| `TRUST_PROXY` | `1` behind the host's proxy |
| `TZ` | The restaurant's timezone, for example `Asia/Singapore`. Daily totals and pickup numbers restart at midnight in this zone |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Image storage |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CURRENCY` | Optional. Live keys, and `sgd` for PayNow |

### Frontend (set at build time, so rebuild after changing)

| Variable | Value |
|---|---|
| `VITE_API_URL` | The backend address, for example `https://api.example.com` |
| `VITE_PUBLIC_URL` | The customer-facing address. It goes inside every QR code |

Serve the frontend on one address. `CLIENT_URL` allows only one origin, so redirect `www` to the main address.

## 4. Deploy, in this order

1. **Database.** Create the managed PostgreSQL and copy its address.
2. **Backend.** Deploy with the variables above. Migrations run automatically on startup. Check `https://api.example.com/health`.
3. **First admin**, run once against the production database:
```bash
   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-passphrase' \
   DATABASE_URL='<production address>' DATABASE_SSL=true npm run seed:admin
```
   The password must be at least 12 characters. Never commit these values.
4. **Frontend.** Build with `VITE_API_URL` and `VITE_PUBLIC_URL` set, then deploy `frontend/dist`.
5. **HTTPS.** Both addresses must be `https://`. The browser blocks an HTTPS page that calls an HTTP API.
6. **Stripe live** (optional):
   - Switch to the live secret key.
   - In the dashboard add a webhook endpoint at `https://api.example.com/api/webhooks/stripe` for `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.expired`.
   - Copy its signing secret into `STRIPE_WEBHOOK_SECRET`, and redeploy the backend.
   - Make a small real payment, check the order appears, then cancel it to test the refund.
7. **QR codes.** Open **Tables** from the live site and print the table QR codes and the takeaway poster. QR codes printed from `localhost` are useless to customers.

## 5. Smoke test after every deploy

- [ ] `/health` returns `ok`
- [ ] You can log in
- [ ] Settings → System shows Database **Connected**, Order feed **Receiving**, and the right timezone
- [ ] A dine-in order from a phone rings the alarm and shows on the table's bill
- [ ] A takeaway order gets a pickup number
- [ ] Accept, Ready and Hand over update the customer's page live
- [ ] A cash payment prints a receipt that shows your restaurant name

## 6. Updating safely

1. Take a backup.
2. Deploy the **backend** first, because migrations run on startup. Then deploy the frontend, so the new frontend never calls an API that doesn't exist yet.
3. Run the smoke test.

To roll back, redeploy the previous version. Migrations are not reversed automatically, so if the old code cannot run on the new tables, restore the backup.

## 7. Backups

- Turn on your provider's automatic backups, and test a restore once.
- A manual copy of the production database:
```bash
  pg_dump "$DATABASE_URL" | gzip > backup_$(date +%Y%m%d).sql.gz
```
- To practice restoring, load a backup into a throwaway database and check the tables.
- `scripts/backup-db.sh` only works for the local Docker database.

## 8. Restaurant hardware

- **Staff tablet:** plugged in, with auto-lock turned off. Open Live orders and press Enable sound at the start of every shift.
- **Receipts:** set the printer as the browser's default. In the print dialog turn off headers and footers. The receipt is laid out for 80 mm paper.
- **Wifi:** the tablet needs a stable connection. A red "Connection lost" bar means orders may be delayed.

## 9. Monitoring

- Point an uptime monitor at `/health`.
- Read the backend logs after a bad service. Anything marked `AMOUNT MISMATCH` or `Webhook` deserves a look.
- Settings → System shows the database and live feed at a glance.

## 10. Security checklist

- [ ] `.env`, `backups/` and any keys are ignored by git
- [ ] A strong `JWT_SECRET`, and no default or demo accounts
- [ ] `TRUST_PROXY=1` behind a proxy
- [ ] Stripe uses live keys and a webhook secret
- [ ] Rotate any key that was ever pasted into chat, email or a commit
- [ ] Admin accounts only for people who need them

## Troubleshooting production

| Symptom | Likely cause |
|---|---|
| Browser console shows a CORS error | `CLIENT_URL` does not match the frontend address exactly |
| "Blocked: mixed content" | The API or the frontend is on `http://` |
| Refreshing `/menu` gives a 404 | The SPA fallback from step 2 is missing |
| Every visitor shares one rate limit | `TRUST_PROXY` is not set |
| Live updates never arrive | The host does not allow WebSockets, or the server is asleep |
| A QR code opens `localhost` | `VITE_PUBLIC_URL` was missing when the frontend was built |
| Stripe orders never appear | Wrong webhook secret or address. Check Stripe's webhook log |
| Daily totals reset at the wrong hour | `TZ` is not set |
| `column ... does not exist` | A migration failed on startup. Check the logs |