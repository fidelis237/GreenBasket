# GreenBasket: shop + admin dashboard + MoMo / Orange Money payments

Everything runs on Cloudflare Pages. No PHP and no other hosting needed.

## What is in this folder
- public/index.html            the shop (reads its products from the dashboard)
- public/admin/index.html      admin sign-in / create account page (not linked from the shop)
- public/admin/app.html        the dashboard (only delivered to a signed-in admin)
- (customer sign-up / sign-in lives inside public/index.html, in the cart side panel)
- functions/api/...            the server code: payments, products, orders, sign-in
- functions/_lib/...           shared code (database, passwords, sessions)
- functions/admin/_middleware.js   keeps the dashboard page and search engines away from visitors

## Set it up (about 10 minutes)

### 1. Upload the new files to GitHub
Open your GreenBasket repository, click Add file, then Upload files, and drag in the
`functions` and `public` folders from this folder. GitHub replaces the files that have the same name
and adds the new ones. Check that these now exist: `functions/_lib`, `functions/admin`,
`functions/api/auth`, `functions/api/customer`, `public/admin`. Click Commit changes.
If you already set up the database earlier, nothing else is needed: it upgrades itself and keeps your orders.

### 2. Create the database (free)
Cloudflare dashboard > Storage & Databases > D1 SQL Database > Create database.
Name it `greenbasket-db`. You do not need to create tables. The shop does that by itself.

### 3. Connect the database to your shop
Workers & Pages > greenbasket > Settings > Bindings > Add > D1 database.
- Variable name: `DB`   (exactly, capital letters)
- D1 database: greenbasket-db
Save.

### 4. Choose your secret setup key
Settings > Variables and secrets > Add:
- Type: Secret
- Name: `ADMIN_SETUP_KEY`
- Value: a long private phrase of 12 or more characters. Write it down. Do not share it.
This key is the only thing that lets someone create an admin account.

### 5. Redeploy
Deployments > menu on the newest one > Retry deployment. Wait for the green tick.

### 6. Create your admin account
Open  https://YOUR-SHOP-ADDRESS/admin/
Click Create account, fill in your name, email, a password (10+ characters) and the setup key.
You land in the dashboard. Open the shop and check that your products appear.

### 7. After your staff have accounts
Delete the `ADMIN_SETUP_KEY` variable (then redeploy). Nobody can create accounts until you add it back.

## Customer accounts (in the shop)
- A "Sign in" button sits in the green top bar. It opens the same side panel as the cart.
- Customers can create an account (name, email, mobile number, password of 8+ characters, optional
  address), sign in, edit their saved details and see their past orders under "My account".
- At checkout, signed-in customers have their name, number and address filled in. Orders they pay for
  are attached to their account. Checking out as a guest still works.
- Customer accounts and admin accounts are completely separate. A customer cannot open the dashboard.
- Not included yet: "forgot password" and email confirmation (they need an email service). For now, a
  customer who forgets a password can be removed in Dashboard > Customers and then sign up again.

## Using the dashboard
- Overview: revenue from paid orders, orders to prepare, products live, low stock.
- Products: add, edit, delete. Untick "Show this product in the shop" to hide without deleting.
  Photos are shrunk automatically. Price changes appear on the shop straight away.
- Customers: everyone who made an account, with order counts. You can delete an account (their past orders stay).
- Orders: created automatically when a customer starts a payment. Status moves to Paid when Campay
  confirms, and stock goes down by the quantity bought. You then set Preparing, Delivered or Cancelled.

## Security notes
- The /admin/ address is not linked anywhere and is hidden from search engines, but hiding is not
  the protection. The sign-in is. Every dashboard action is checked on the server.
- Passwords are stored as salted hashes. Five wrong passwords lock that email for 15 minutes.
- Prices and stock are checked on the server when a customer pays.
- The database holds customer names, phone numbers and delivery addresses. Use strong, unique admin
  passwords and remove accounts of people who leave.

## Payments (Campay)
Settings > Variables and secrets (unchanged from before):
- CAMPAY_USERNAME, CAMPAY_PASSWORD (Secret), CAMPAY_BASE_URL
- Demo mode: base URL https://demo.campay.net/api and TEST_AMOUNT = 5 (Campay demo accepts 25 XAF max)
- Live mode: base URL https://campay.net/api, your live credentials, and DELETE TEST_AMOUNT.
