import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, required: true },
  stock: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

productSchema.index({ active: 1 });

const Product = mongoose.model("Product", productSchema);

export default Product;
