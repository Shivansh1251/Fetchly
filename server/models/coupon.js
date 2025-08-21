import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    percentOff: { type: Number, min: 0, max: 100, required: true },          // renamed from discount
    expiresAt: { type: Date, required: true },                               // renamed expiryDate
    maxUses: { type: Number, default: 0 },                                    // 0 = unlimited
    usageCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true }
}, { timestamps: true });

couponSchema.index({ code: 1, active: 1 });
couponSchema.methods.isValidNow = function() {
  if (!this.active) return false;
  if (this.expiresAt < new Date()) return false;
  if (this.maxUses > 0 && this.usageCount >= this.maxUses) return false;
  return true;
};

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
