import dotenv from "dotenv";            // NEW: ensure env loaded before reading keys
dotenv.config();                        // NEW: ESM import order means server.js body runs AFTER this file
import { Router } from "express";
import crypto from "crypto";
import Product from "../models/product.js";
import Order from "../models/order.js";
import Coupon from "../models/coupon.js";
import DeliveryPartner from "../models/deliveryPartner.js";
import Razorpay from "razorpay";

const router = Router();

// In-memory provisional orders: orderId -> provisional pricing
const pendingOrders = new Map();
// Timers for assignment
const assignmentTimers = new Map();

function getUserId(req, res) {
  const uid = req.header("x-user-id");
  if (!uid) {
    res.status(401).json({ message: "Missing x-user-id" });
    return null;
  }
  return uid;
}

// Attempt partner assignment
async function attemptAssign(orderId) {
  const order = await Order.findById(orderId);
  if (!order || order.status !== "pending-assignment") return;
  const now = new Date();
  // atomic claim: partner whose cooldownUntil <= now
  const partner = await DeliveryPartner.findOneAndUpdate(
    { active: true, cooldownUntil: { $lte: now } },
    {
      $set: {
        lastAssignedAt: now,
        cooldownUntil: new Date(now.getTime() + 15 * 60 * 1000)
      }
    },
    { sort: { cooldownUntil: 1 }, new: true }
  );
  if (!partner) {
    // retry quickly (every 3s) until one available since user expects fast assignment
    const retry = setTimeout(() => attemptAssign(orderId), 3000);
    assignmentTimers.set(orderId, retry);
    return;
  }
  order.status = "assigned";
  order.assignedPartnerId = partner._id;
  order.assignedPartnerName = partner.name; // NEW
  order.assignedAt = now;
  await order.save();
  assignmentTimers.delete(orderId);
}

// Schedule (now param always passed)
function scheduleAssignment(orderId, delayMs) {
  if (assignmentTimers.has(orderId)) return;
  const t = setTimeout(() => attemptAssign(orderId), delayMs);
  assignmentTimers.set(orderId, t);
}

// Razorpay initialization (real) with diagnostics
let razorpay = null;
// NOTE: keys now reliably present because dotenv.config() executed above
let rzpKeyId = (process.env.RAZORPAY_KEY_ID || "").trim();
let rzpKeySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

function initRazorpay() {
  if (!rzpKeyId || !rzpKeySecret) {
    console.warn("[Razorpay] Not configured (missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET). CWD:", process.cwd());
    razorpay = null;
    return;
  }
  try {
    razorpay = new Razorpay({ key_id: rzpKeyId, key_secret: rzpKeySecret });
    console.log("[Razorpay] Initialized with key id:", rzpKeyId);
  } catch (e) {
    console.error("[Razorpay] Initialization error:", e.message);
    razorpay = null;
  }
}
initRazorpay();

// OPTIONAL: allow manual reload if env changed (e.g. via process manager)
router.post("/_reload-gateway", (_req, res) => {
  rzpKeyId = (process.env.RAZORPAY_KEY_ID || "").trim();
  rzpKeySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
  initRazorpay();
  res.json({ reloaded: true, configured: !!razorpay });
});

// Health/status (no secrets leaked)
router.get("/health", (_req, res) => {
  res.json({
    configured: !!razorpay,
    keyPresent: !!rzpKeyId,
    secretPresent: !!rzpKeySecret,
    keyPreview: rzpKeyId ? rzpKeyId.slice(0, 8) + "***" : null
  });
});

// REPLACED simulated create-order with real Razorpay order creation
router.post("/create-order", async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;
  if (!razorpay) {
    return res.status(500).json({
      message: "Razorpay not configured",
      hint: "Ensure .env in server folder has RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET and server was started from that folder."
    });
  }
  const { items = [], couponCode } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ message: "Items required" });
  try {
    const detailed = [];
    for (const it of items) {
      const prod = await Product.findById(it.productId);
      if (!prod || !prod.active) throw new Error("Invalid product");
      detailed.push({ productId: prod._id.toString(), qty: it.qty || 1, price: prod.price, name: prod.name });
    }
    const subtotal = detailed.reduce((s, i) => s + i.price * i.qty, 0);
    let discount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (coupon && coupon.isValidNow()) discount = +(subtotal * (coupon.percentOff / 100)).toFixed(2);
    }
    const total = +(subtotal - discount).toFixed(2);
    const amountPaise = Math.round(total * 100);

    const rzpOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: "rcpt_" + crypto.randomBytes(6).toString("hex"),
      notes: { userId }
    });

    pendingOrders.set(rzpOrder.id, { userId, items: detailed, subtotal, discount, total });

    res.json({
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      key: rzpKeyId,
      displayAmount: total,
      subtotal,
      discount,
      total
    });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// REPLACED simulated verify with real signature verification
router.post("/verify", async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body || {};
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({ message: "Missing fields" });
  }
  const pending = pendingOrders.get(razorpayOrderId);
  if (!pending || pending.userId !== userId) return res.status(404).json({ message: "Order not found" });

  const expected = crypto
    .createHmac("sha256", rzpKeySecret || "")
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  if (expected !== razorpaySignature) return res.status(400).json({ message: "Signature mismatch" });

  const delayMs = 10000;
  const assignmentScheduledFor = new Date(Date.now() + delayMs);

  const orderDoc = await Order.create({
    user: userId,
    items: pending.items.map(i => ({
      productId: i.productId,
      nameSnapshot: i.name,
      price: i.price,
      qty: i.qty
    })),
    subtotal: pending.subtotal,
    discount: pending.discount,
    total: pending.total,
    status: "pending-assignment",
    payment: {
      provider: "razorpay",
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
      status: "authorized"
    },
    assignmentScheduledFor
  });

  pendingOrders.delete(razorpayOrderId);
  scheduleAssignment(orderDoc._id.toString(), delayMs);

  res.json({
    success: true,
    orderId: orderDoc._id.toString(),
    total: orderDoc.total,
    status: orderDoc.status,
    assignmentScheduledFor,
    message: "Order verified. Partner assignment in ~10s."
  });
});

// COMMENTED OUT WEBHOOK (NOT USED IN SIM MODE)
// router.post("/webhook", ...);

// DEBUG partners (unchanged)
router.get("/_partners", async (_req, res) => {
  const partners = await DeliveryPartner.find().select("name cooldownUntil active");
  res.json({ partners });
});

export default router;
