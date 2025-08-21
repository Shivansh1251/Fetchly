import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },  // changed
        nameSnapshot: { type: String, required: true },                                       // NEW
        price: { type: Number, required: true },                                              // NEW
        qty: { type: Number, required: true }                                                 // NEW
    }],
    subtotal: { type: Number, required: true },                                               // NEW
    discount: { type: Number, required: true },                                               // NEW
    total: { type: Number, required: true },                                                  // NEW
    status: {                                                                                 // renamed orderStatus
        type: String,
        enum: ["pending-assignment","assigned","in-transit","delivered","cancelled"],
        default: "pending-assignment",
        required: true
    },
    payment: {                                                                                // NEW nested payment
        provider: { type: String, default: "razorpay" },
        orderId: String,
        paymentId: String,
        signature: String,
        status: { type: String, enum: ["pending","authorized","failed","captured"], default: "authorized" }
    },
    assignedPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner', default: null }, // NEW
    assignedPartnerName: { type: String, default: null }, // NEW
    assignedAt: { type: Date, default: null },                                                           // NEW
    assignmentScheduledFor: { type: Date, default: null }, // NEW: planned assignment time
}, { timestamps: true });

orderSchema.index({ status: 1, createdAt: -1 });                                                         // NEW
orderSchema.index({ assignedPartnerId: 1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;
