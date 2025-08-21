// NOTE: No logic change; 404 on client was due to missing root index.html for Vite.
import { Router } from "express";
import Product from "../models/product.js";

const router = Router();

// GET /api/products (active only)
router.get("/", async (_req, res, next) => {
  try {
    const products = await Product.find({ active: true }).select("name price");
    res.json({ products: products.map(p => ({ id: p._id.toString(), name: p.name, price: p.price })) });
  } catch (e) { next(e); }
});

router.post("/add", async (req, res, next) => {
  try {
    const { name, price, stock = 0 } = req.body;
    if (!name || typeof price !== "number") return res.status(400).json({ message: "Name & price required" });
    const product = await Product.create({ name, price, description: name, stock });
    res.status(201).json({ product: { id: product._id, name: product.name, price: product.price } });
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.active) return res.status(404).json({ message: "Not found" });
    res.json({ product: { id: product._id, name: product.name, price: product.price, stock: product.stock } });
  } catch (e) { next(e); }
});

export default router;
