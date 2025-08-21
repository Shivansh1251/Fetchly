import { Router } from "express";
import Order from "../models/order.js";

const router = Router();

// helper auth (placeholder)
function getUserId(req, res) {
  const uid = req.header("x-user-id");
  if (!uid) {
    res.status(401).json({ message: "Missing x-user-id" });
    return null;
  }
  return uid;
}

// GET /api/orders/me
router.get("/me", async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const docs = await Order.find({ user: userId }).sort({ createdAt: -1 });
  res.json({
    orders: docs.map(o => ({
      id: o._id.toString(),
      status: o.status,
      total: o.total,
      subtotal: o.subtotal,
      discount: o.discount,
      createdAt: o.createdAt,
      assignmentScheduledFor: o.assignmentScheduledFor, // NEW
      assignedPartnerName: o.assignedPartnerName, // NEW
      items: o.items.map(i => ({
        productId: i.productId,
        name: i.nameSnapshot,
        price: i.price,
        qty: i.qty
      }))
    }))
  });
});

// GET /api/orders/:id
router.get("/:id", async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const o = await Order.findOne({ _id: req.params.id, user: userId });
  if (!o) return res.status(404).json({ message: "Not found" });
  res.json({
    order: {
      id: o._id.toString(),
      status: o.status,
      assignedPartnerId: o.assignedPartnerId,
      assignedPartnerName: o.assignedPartnerName, // NEW
      assignedAt: o.assignedAt,
      subtotal: o.subtotal,
      discount: o.discount,
      total: o.total,
      assignmentScheduledFor: o.assignmentScheduledFor, // NEW
      items: o.items.map(i => ({
        product: { name: i.nameSnapshot }, // snapshot only
        productId: i.productId,
        qty: i.qty,
        price: i.price
      }))
    }
  });
});

export default router;
