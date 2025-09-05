import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
console.log('[ENV DEBUG] RKP len:', (process.env.RAZORPAY_KEY_ID || '').length, 'RKS len:', (process.env.RAZORPAY_KEY_SECRET || '').length);

const app = express();

// NEW: JSON body parsing
app.use(express.json());
// NEW: CORS for local client
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

// NEW: import models for seeding
import Product from './models/product.js';
import Coupon from './models/coupon.js';
import DeliveryPartner from './models/deliveryPartner.js';
import User from './models/user.js'; // NEW

mongoose.connect(process.env.MongoDB_URI, {
}).then(async () => {
  console.log('MongoDB connected');
  // SEED: Products
  if (await Product.countDocuments() === 0) {
    await Product.insertMany([
      { name: "Sample A", description: "Sample A", price: 1200, stock: 50 },
      { name: "Sample B", description: "Sample B", price: 2500, stock: 25 }
    ]);
    console.log("Seeded products");
  }
  // SEED: Coupon NEW10
  if (!(await Coupon.findOne({ code: "NEW10" }))) {
    await Coupon.create({
      code: "NEW10",
      percentOff: 10,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      maxUses: 0,
      usageCount: 0,
      active: true
    });
    console.log("Seeded coupon NEW10");
  }
  // SEED: Delivery Partners
  if (await DeliveryPartner.countDocuments() === 0) {
    await DeliveryPartner.insertMany([
      { name: "Partner A" },
      { name: "Partner B" },
      { name: "Partner C" }
    ]);
    console.log("Seeded delivery partners");
  }
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Trust reverse proxy (needed for secure cookies behind proxies like Render/Heroku)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Use Mongo-backed session store in production to avoid MemoryStore warning
app.use(session({
  secret: process.env.Session_Secret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MongoDB_URI,
    ttl: 14 * 24 * 60 * 60 // 14 days
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
  clientID: process.env.Google_Client_ID,
  clientSecret: process.env.Google_Client_Secret,
  callbackURL: '/auth/google/callback'
}, async (_accessToken, _refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });
    if (!user) {
      user = await User.create({
        googleId: profile.id,
        email,
        name: profile.displayName,
        password: crypto.randomBytes(12).toString('hex') // placeholder
      });
    } else if (!user.googleId) {
      user.googleId = profile.id;
      await user.save();
    }
    return done(null, { _id: user._id, email: user.email, name: user.name });
  } catch (e) {
    return done(e);
  }
}));

app.get("/", (req, res) => {
  res.send('<h1>Home</h1><a href="/auth/google">Login with Google</a>');
});
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    const base = process.env.CLIENT_BASE_URL || 'http://localhost:5173';
    res.redirect(`${base}/auth/callback?token=${req.user._id}`);
  }
);

app.get('/profile', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.send(`<h1>Profile</h1>${req.user ? `<p>Welcome, ${req.user.displayName}!</p>` : ''}<a href="/logout">Logout</a>`);
});

passport.serializeUser((user, done) => {
  done(null, user._id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('email name');
    done(null, user ? { _id: user._id, email: user.email, name: user.name } : null);
  } catch (e) { done(e); }
});

app.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/');
  });
});

// NEW: Expose public config (never send secrets)
app.get('/api/config', (_req, res) => {
  res.json({ razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_demo', env: 'dev' });
});

// ROUTE MODULE IMPORTS (NEW)
import userRoutes from './routes/users.js';
import productRoutes from './routes/product.js';
import couponRoutes from './routes/coupons.js';
import paymentRoutes from './routes/payment.js';
import orderRoutes from './routes/orders.js';

// MOUNT ROUTES (NEW)
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/orders', orderRoutes);

// NEW: current session profile (header x-user-id expected by API flow)
app.get('/api/auth/me', async (req, res) => {
  const id = req.header('x-user-id');
  if (!id) return res.status(401).json({ message: 'No token' });
  const user = await User.findById(id).select('email name');
  if (!user) return res.status(401).json({ message: 'Invalid token' });
  res.json({ user: { id: user._id, email: user.email, name: user.name } });
});

const __filename = fileURLToPath(import.meta.url);        // MOVED UP
const __dirname = path.dirname(__filename);               // MOVED UP
const PORT = process.env.PORT || 5000;                    // MOVED UP
const IS_SERVERLESS = !!process.env.VERCEL;               // NEW: detect Vercel

// OPTIONAL: Serve production build (after building client)
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  // Express 5 uses path-to-regexp v6; '*' is no longer valid. Use a wildcard parameter.
  app.get('/:path(*)', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// 404 handler (NEW)
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// Error handler (NEW)
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

if (!IS_SERVERLESS) {                // NEW guard
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;                  // NEW: allow Vercel serverless handler