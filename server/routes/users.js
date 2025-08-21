import { Router } from "express";
import User from "../models/user.js";

const router = Router();

// POST /api/users/register
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email & password required" });
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: "Email exists" });
  const user = await User.create({ email, password, name: email.split("@")[0] });
  res.status(201).json({ user: { id: user._id.toString(), email: user.email }, token: user._id.toString() });
});

// POST /api/users/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  res.json({ user: { id: user._id.toString(), email: user.email }, token: user._id.toString() });
});

export default router;
