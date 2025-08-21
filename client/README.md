# Fetchly Client

Dev Setup
1. cd client
2. npm install
3. npm run dev (http://localhost:5173)

Flow
- Open Products page -> Auto Register button (creates temp user).
- Add products to cart (stored locally).
- Apply coupon on /cart (NEW10).
- Checkout: simulates Razorpay (no real money).
- After verify redirect to order page which polls until partner assigned (~3 min).
- Orders list shows history.

Security & Payment
- All payment + signature logic is mocked for demo.
- Replace simulateRazorpayVerify with actual Razorpay Checkout flow + server verification.
