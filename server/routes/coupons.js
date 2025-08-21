import { Router } from "express";
import Coupon from "../models/coupon.js";

const router = Router();

// POST /api/coupons/apply { code, subtotal }
router.post("/apply", async (req, res) => {
    const { code, subtotal } = req.body;
    if (!code || typeof subtotal !== "number" || subtotal < 0) {
        return res.status(400).json({ message: "Code & valid subtotal required" });
    }
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon || !coupon.isValidNow()) {
        return res.status(404).json({ valid: false, message: "Coupon invalid" });
    }
    const discount = +(subtotal * (coupon.percentOff / 100)).toFixed(2);
    const total = +(subtotal - discount).toFixed(2);
    res.json({
        valid: true,
        code: coupon.code,
        percentOff: coupon.percentOff,
        subtotal,
        discount,
        total
    });
});

export default router;
