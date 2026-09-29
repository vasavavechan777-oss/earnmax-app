EarnMax Step 6 — Full Stack Demo
==================================
This is a LOCAL DEVELOPMENT DEMO, not a production earning/payment service.

Run:
1. Install Node.js 18+
2. Open terminal in this folder
3. npm install
4. npm start
5. Open http://localhost:3000
6. Admin: http://localhost:3000/admin.html

Flow:
Register -> Tasks/Offers -> Demo verified completion -> Wallet Coins -> Withdrawal request -> Admin approve/reject.

Rules:
100 Coins = ₹1
Minimum withdrawal = 1,000 Coins = ₹10

Important:
The /api/dev/complete endpoint is only a development simulator. In production, rewards must be credited only after trusted provider verification/postback, with fraud prevention, rate limits, database transactions, KYC/age/location/tax requirements where applicable, secure payout handling, and proper admin authentication.
