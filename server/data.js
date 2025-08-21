export const users = [];
export const products = [
  { id: 'p1', name: 'Sample A', price: 1200 },
  { id: 'p2', name: 'Sample B', price: 2500 }
];
export const coupons = [
  { code: 'NEW10', percentOff: 10, active: true }
];
export const orders = [];
export const pendingOrders = new Map(); // orderId -> { userId, items, subtotal, discount, total }
