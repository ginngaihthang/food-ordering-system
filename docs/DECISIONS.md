# Design decisions

Each entry says what we chose, why, and what it costs.

### 1. Customers have no accounts
Access comes from QR codes and private tokens. Ordering is fast, and there are no passwords to look after. The cost is that a customer who clears their browser data loses their "My orders" list for takeaway. Table customers can always scan again.

### 2. The server sets every price
The browser sends product ids and quantities, never prices. Each order item stores the price it was sold at, and each order stores the tax rate, so editing a product later never changes an old receipt.

### 3. Menu prices already include tax
Customers pay the number on the menu. Tax on receipts is `total × rate ÷ (100 + rate)`, calculated per order. Nothing can change a total at checkout. There is one rate for the whole restaurant, so zero-rated items are not supported.

### 4. A table session is one visit
The first order opens a session, and every order joins it, so there is one bill per visit. A row lock plus a database index guarantees only one open session per table, even if two phones order at the same instant.

### 5. Order links use private tokens, not ids
Sequential ids would let anyone read other customers' orders by counting. The cost is that a lost link means a lost order page. Customers can find takeaway orders in "My orders".

### 6. Online takeaway orders exist only after payment
The cart waits in a `checkouts` table. The order is created when Stripe's signed webhook confirms payment, and the server checks the amount and currency. Unpaid carts never reach the kitchen, history or revenue. A background job catches missed webhooks, and cancelling a paid order refunds it. The cost is a table and a job, and no partial refunds.

### 7. Stripe Checkout, not a custom card form
Stripe's hosted page keeps card details off the server and supports PayNow for Singapore accounts. The cost is a redirect, and the provider's fees.

### 8. Dine-in bills are paid in cash at the counter
Staff enter the amount received, and the server verifies it covers the bill and works out the change. It is simple and matches how small restaurants work. Table payment online is not supported.

### 9. Migrations, not `sequelize.sync()`
`sync` can silently fail on enum columns and can damage data. Numbered migrations are explicit and run once. The cost is that every model change needs a migration file.

### 10. Staff can use the live feed only when logged in
Staff are placed in the admin room at connection after their token is checked. Customers join their own room by proving they know the order or table token, so strangers cannot listen to new orders.

### 11. Roles are read from the database on every request
Deleting or demoting a user takes effect immediately instead of when the token expires. The cost is one small query per request.

### 12. Cancelled orders are kept
They stay in history and on the customer's page, but are never charged and never counted in a bill, receipt or revenue. This keeps the record honest, and the cost is that every total must remember to skip them.

### 13. Pickup numbers restart every day
Staff call small numbers, and the next number is chosen under a database lock so two orders never share one. The "day" follows the server timezone, so `TZ` must be set correctly.

### 14. Idle tables close themselves, carefully
A session closes automatically only when nothing is cooking, and only if it is empty (after 60 minutes) or already paid (after 30 minutes). An unpaid bill is never closed, because that would hide money owed.

### 15. Sold-out dishes stay on the menu
They appear greyed out and cannot be ordered. Customers know the dish exists, and carts and checkout handle a dish that sells out mid-order.

### 16. Categories are hidden, not deleted
Hiding keeps history intact. Deleting is blocked while products use the category.

### 17. Images live on Cloudinary
Local disk is wiped on most hosts when they redeploy. The cost is a third-party account. Images that were uploaded but not saved, replaced or deleted are removed from Cloudinary.

### 18. One backend instance
Live rooms, jobs and rate-limit counters are in memory. This is simple and enough for one restaurant. Scaling out would need shared state such as Redis.

### 19. Settings are one database row
Restaurant details, tax, currency and ordering switches change without a deploy. The currency is only a display symbol, so multi-currency is not supported.

## Known limitations

- A photo of a table's QR code can be used to order for an empty table or see an occupied table's bill. Staff accepting every order is the safeguard. Planned fix: tables opened by staff with a code.
- `DELETE /api/upload` can be called by any staff account.
- There is no log of which staff member accepted, cancelled or took payment.
- Receipts print through the browser's print dialog. There is no direct thermal printer support.
- No customer accounts, loyalty points, delivery, item options or multiple branches.