# API reference

Base URL in development: `http://localhost:5001`

## Conventions

- JSON in, JSON out. Dates are ISO 8601 strings.
- **Login:** send `Authorization: Bearer <token>`. The token comes from `POST /api/auth/login` and is valid for 1 day. The server re-checks the user and role in the database on every request, so a deleted or demoted user is cut off at once.
- **Who can call it:** *Public* needs no login. *Staff* means an admin or a staff account. *Admin* means admins only.
- **Errors** look like `{ "message": "..." }`, sometimes with extra fields such as `unavailableProductIds`.
- **Money:** `price`, `unitPrice`, `subtotal` and `taxRate` come back as strings such as `"6.50"`. Totals the server calculates are numbers.
- **Rate limits:** 1500 requests per 15 minutes per address on `/api`, 10 failed logins per 15 minutes, and 60 order or checkout requests per 10 minutes per address.

| Status | Meaning |
|---|---|
| 400 | Invalid input |
| 401 | Not signed in, token expired, or the account no longer exists |
| 403 | Not allowed, or ordering is paused |
| 404 | Not found |
| 409 | Conflict, for example a sold-out item or a bill that was already paid |
| 410 | An online payment expired, so no order exists |
| 429 | Too many requests, or too many orders waiting for staff |
| 502, 503 | The payment provider is unavailable or not configured |

## Authentication

| Method | Path | Who | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Body `{ email, password }`. Returns `{ token, user: { id, username, role } }` |
| POST | `/api/auth/change-password` | Staff | Body `{ currentPassword, newPassword }` (8 to 72 characters) |

## Menu

| Method | Path | Who | Description |
|---|---|---|---|
| GET | `/api/menu` | Public | Visible categories, each with a `Products` array. Sold-out products are included with `isAvailable: false` |
| GET | `/api/settings` | Public | Restaurant name, currency, tax, whether ordering is on, closed message, payment instructions |
| GET | `/api/tables/by-token/:token` | Public | Table details for a QR token: `{ id, tableNumber, status }` |

## Orders: customers

| Method | Path | Who | Description |
|---|---|---|---|
| POST | `/api/orders` | Public | Place a dine-in or takeaway order |
| POST | `/api/orders/takeaway-checkout` | Public | Start online payment for a takeaway order |
| GET | `/api/orders/session/:tableToken` | Public | Every order and the running total for the table's open session |
| GET | `/api/orders/track/:token` | Public | One order by its private token |
| GET | `/api/orders/by-tokens?tokens=a,b` | Public | Takeaway orders for up to 10 tokens ("My orders") |

### Place an order

```http
POST /api/orders
{
  "orderType": "DINE_IN",
  "tableToken": "a8x92k3f9d1e2b7c",
  "items": [
    { "productId": 1, "quantity": 2 },
    { "productId": 3, "quantity": 1 }
  ]
}
```

`tableToken` is only for dine-in. Prices are never accepted from the client. Limits: 30 items per order, 20 of one item, and 5 unaccepted orders per table (30 for takeaway).

```json
{
  "id": 101,
  "publicToken": "4f1c9a...32 characters",
  "orderType": "DINE_IN",
  "status": "PENDING",
  "pickupNumber": null,
  "tableSessionId": 25,
  "paymentStatus": "UNPAID",
  "paymentMethod": null,
  "taxRate": "9.00",
  "createdAt": "2026-10-16T11:30:00.000Z",
  "OrderItems": [
    {
      "id": 1,
      "productId": 1,
      "quantity": 2,
      "unitPrice": "6.50",
      "subtotal": "13.00",
      "Product": { "id": 1, "name": "Chicken Rice" }
    }
  ]
}
```

| Status | Cause |
|---|---|
| 400 | Invalid type, items or quantities |
| 403 | Ordering is paused in Settings, or takeaway requires online payment |
| 404 | Unknown table QR |
| 409 | A product is unavailable (the response lists `unavailableProductIds`), or the table's bill is already paid |
| 429 | Too many orders are waiting for staff to accept |

### Takeaway online payment

`POST /api/orders/takeaway-checkout` takes `{ items }` and returns `201 { url, publicToken }`. Send the customer to `url` (Stripe's page). After paying, Stripe returns them to `/order/<publicToken>?paid=1`. The order is created only when Stripe's webhook confirms the payment. It returns 400 if online payment is off, 403 if takeaway is paused, 409 for sold-out items, 429 when busy, and 502 or 503 if Stripe is unreachable or not set up.

### Track an order

`GET /api/orders/track/:token` returns:

| Status | Body |
|---|---|
| 200 | The order |
| 202 | `{ "awaitingPayment": true }`: the payment is not confirmed yet, so poll again |
| 410 | The payment was not completed and no order exists |
| 404 | Unknown token |

## Orders: staff

| Method | Path | Who | Description |
|---|---|---|---|
| GET | `/api/orders` | Staff | Live orders, with table details. Optional `status` and `orderType` filters |
| PATCH | `/api/orders/:id/status` | Staff | Body `{ status }` with `PENDING`, `PREPARING`, `READY` or `COMPLETED`. Cancelled and completed orders cannot change, and `CANCELLED` is rejected here |
| PATCH | `/api/orders/:id/cancel` | Staff | Cancel an order. Refuses completed orders and paid table bills. A takeaway order paid online is refunded in full |
| PATCH | `/api/orders/:id/pay` | Staff | Body `{ method: "CASH" \| "ONLINE" }`. Records a takeaway payment taken at the counter |
| GET | `/api/orders/:id/receipt` | Staff | Receipt data with a `tax` object |
| GET | `/api/orders/takeaway` | Staff | Takeaway orders. Optional `date` (`YYYY-MM-DD`) and `paymentStatus` |
| GET | `/api/orders/takeaway/week?date=` | Staff | Seven days ending at `date`: `{ days: [{ date, revenue, count }] }` |
| GET | `/api/orders/history?date=` | Staff | Orders for one day with revenue, average order, cancelled count, peak hour and status counts. `date` is required |
| GET | `/api/orders/history/week?date=` | Staff | Seven-day revenue strip |

## Tables

| Method | Path | Who | Description |
|---|---|---|---|
| GET | `/api/tables` | Staff | Tables, each with `activeSession`: `{ id, startedAt, orderCount, total, paymentStatus, paymentMethod }` or `null` |
| POST | `/api/tables` | Staff | Body `{ tableNumber }`. Creates the table and its QR token |
| PUT | `/api/tables/:id` | Admin | Change the table number |
| DELETE | `/api/tables/:id` | Admin | Refused while the table is occupied |
| PATCH | `/api/tables/:id/regenerate-qr` | Admin | Makes the old QR code stop working |
| GET | `/api/tables/:id/session` | Staff | The open session's bill |
| POST | `/api/tables/:id/pay` | Staff | Take cash for the whole bill |
| POST | `/api/tables/:id/close-session` | Staff | Needs every order served and the bill paid |
| GET | `/api/tables/:id/receipt` | Staff | Receipt for the most recent session |

### Table bill

```json
{
  "session": { "id": 25, "startedAt": "2026-10-16T10:15:00.000Z" },
  "paymentStatus": "UNPAID",
  "paymentMethod": null,
  "paidAt": null,
  "cashReceived": null,
  "orders": [],
  "total": 15.5
}
```

`total` skips cancelled orders. `POST /api/tables/:id/pay` takes `{ "method": "CASH", "amountReceived": 20 }` and returns `{ "total": 15.5, "cashReceived": 20, "change": 4.5 }`. The server calculates the total itself. It returns 400 if the cash is less than the bill, or there is nothing to pay, and 409 if the bill was already paid.

## Catalogue

| Method | Path | Who | Description |
|---|---|---|---|
| GET | `/api/categories` | Public | All categories with `productCount` and `isActive` |
| POST | `/api/categories` | Staff | Body `{ name }`. Names must be unique, ignoring case |
| PUT | `/api/categories/:id` | Admin | Rename |
| PATCH | `/api/categories/:id/active` | Admin | Show or hide on the menu |
| DELETE | `/api/categories/:id` | Admin | Refused with 409 while products use it |
| GET | `/api/products` | Public | All products with their category |
| POST | `/api/products` | Staff | Body `{ categoryId, name, description, price, imageUrl, isAvailable }` |
| PUT | `/api/products/:id` | Admin | Edit. A replaced image is deleted from Cloudinary |
| PATCH | `/api/products/:id/availability` | Staff | Toggle sold out |
| DELETE | `/api/products/:id` | Admin | Also deletes its image |
| POST | `/api/upload` | Staff | Multipart field `image` (jpg, png or webp, up to 5 MB). Returns `{ imageUrl }` |
| DELETE | `/api/upload` | Staff | Body `{ imageUrl }`. Removes an image that was uploaded but never saved |

## Administration

| Method | Path | Who | Description |
|---|---|---|---|
| GET | `/api/dashboard` | Staff | Today's revenue, orders, average order and changes versus yesterday, live orders by status, 7-day revenue, top items, tables grid |
| GET | `/api/users` | Admin | Users without passwords |
| POST | `/api/users` | Admin | Body `{ username, email, password, role }` where role is `ADMIN` or `STAFF` |
| PUT | `/api/users/:id` | Admin | Same fields. Leave the password out to keep it |
| DELETE | `/api/users/:id` | Admin | You cannot delete yourself or the last admin |
| PUT | `/api/settings` | Admin | Partial update, validated field by field |
| GET | `/api/settings/system` | Admin | Database status, server time, timezone, uptime, version, whether Stripe is configured |
| GET | `/health` | Public | `{ "status": "ok" }` |

Users: duplicate emails return 409, and you cannot change your own role or demote the last admin.

## Stripe webhook

`POST /api/webhooks/stripe` is called by Stripe, never by the app. It needs the raw body and the `Stripe-Signature` header. A bad signature gets 400. Handled events are `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.expired`.

## Live updates (Socket.IO)

Connect to the backend address with `auth: { token }`, using the admin login token. Customers connect without a token.

| Client sends | Payload | Effect |
|---|---|---|
| `join_admin_room` | none | Staff only. Staff are already added at connect |
| `join_order_room` | `{ token }` | Follow one order, proven by its private token |
| `join_session_room` | `{ tableToken }` | Follow a table's bill |

| Server sends | To | When |
|---|---|---|
| `new_order` | staff | An order was created, or an online payment was confirmed |
| `order_updated` | staff | Status, cancel or payment changed |
| `order_status_updated` | the customer who owns the order | Their order changed |
| `session_order_updated` | the table's guests | An order in the session changed |
| `tables_changed` | staff | A bill was paid or a session was closed |

Rooms are lost when a connection drops, so clients must rejoin on every `connect`.

## Try it

```bash
# log in
curl -X POST localhost:5001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"your-password"}'

# live orders (use the token from above)
curl localhost:5001/api/orders -H "Authorization: Bearer <token>"

# place a takeaway order
curl -X POST localhost:5001/api/orders \
  -H 'Content-Type: application/json' \
  -d '{"orderType":"TAKEAWAY","items":[{"productId":1,"quantity":1}]}'
```