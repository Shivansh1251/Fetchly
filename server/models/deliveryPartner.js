import mongoose from "mongoose";

const deliveryPartnerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    active: { type: Boolean, default: true },
    status: { 
        type: String,
        enum: ["available", "on_delivery"],
        default: "available"
    },
    lastAssignedAt: { type: Date, default: new Date(0) },
    cooldownUntil: { type: Date, default: new Date(0) }
}, { timestamps: true });

deliveryPartnerSchema.index({ cooldownUntil: 1, active: 1 });

const DeliveryPartner = mongoose.model("DeliveryPartner", deliveryPartnerSchema);

export default DeliveryPartner;
