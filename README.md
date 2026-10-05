# GreenBasket: shop with automatic MoMo / Orange Money payments

Folder layout
- public/index.html     the shop page
- functions/api/pay.js  starts the payment (holds your secret keys, checks prices)
- functions/api/status.js  checks if the payment succeeded

## 1. Create your Campay account
1. Sign up at campay.net and create an "application" in the dashboard.
2. Copy the application's username and password (the API credentials).
3. Start in DEMO mode. Use the demo base URL and Campay's demo test numbers (see the Campay docs).

## 2. Deploy on Cloudflare Pages (free plan; check Cloudflare's current terms)
From this folder, with Node.js installed:
    npx wrangler pages deploy public
(Or connect a GitHub repo containing this folder. Plain drag-and-drop upload may not include the functions folder.)

## 3. Add the secret settings (Cloudflare dashboard > your project > Settings > Variables and Secrets)
    CAMPAY_USERNAME = your application username
    CAMPAY_PASSWORD = your application password   (store as a Secret)
    CAMPAY_BASE_URL = https://demo.campay.net/api     (for testing)

## 4. Test, then go live
- Place a test order with a Campay demo number and confirm the page shows "Payment received".
- To take real money: finish Campay's account verification, then change
    CAMPAY_BASE_URL = https://campay.net/api
  and use your live application's credentials.

## Things to keep in mind
- Prices are checked on the server in functions/api/pay.js. When you change a price or add a product,
  change it in BOTH index.html and pay.js.
- Delivery fees are not added automatically. Agree them with the customer on WhatsApp or add them to the code.
- Put your real WhatsApp number in the CFG block at the top of the script in index.html.
- You see every payment in your Campay dashboard. For automatic order alerts (email or WhatsApp) a
  Campay webhook can be added later.
- Check Campay's fees and withdrawal rules before going live.
