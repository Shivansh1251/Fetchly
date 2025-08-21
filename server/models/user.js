import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, index: true, unique: true, sparse: true },
    name: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;