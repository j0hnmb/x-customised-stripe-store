const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

const uploadDir = path.join(__dirname, "public/uploads");
const ordersDir = path.join(__dirname, "orders");
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(ordersDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.post("/create-checkout-session", upload.any(), async (req, res) => {
  try {
    const cart = JSON.parse(req.body.cart || "[]");
    const customer = {
      name: req.body.name || "Unknown",
      email: req.body.email || process.env.EMAIL_TO
    };

    if (!cart.length) {
      throw new Error("Cart is empty");
    }

    // ✅ Build line_items for Stripe
    const line_items = cart.map(item => {
      if (!item.name || typeof item.price !== "number" || !item.quantity) {
        throw new Error("Invalid cart item");
      }

      return {
        price_data: {
          currency: "gbp",
          product_data: {
            name: item.name,
            description: `${item.options?.text || ""} - ${item.options?.model || ""}`.trim()
          },
          unit_amount: Math.round(item.price * 100)
        },
        quantity: item.quantity
      };
    });

    // ✅ Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${process.env.DOMAIN}/success.html`,
      cancel_url: `${process.env.DOMAIN}/cancel.html`
    });

    // ✅ Save uploaded photos + cart
    const orderId = `order-${Date.now()}`;
    const orderFile = path.join(__dirname, "orders", `${orderId}.json`);
    fs.writeFileSync(orderFile, JSON.stringify(cart, null, 2));

    // ✅ Prepare email
    const attachments = req.files?.map(file => ({
      filename: file.originalname,
      path: file.path
    })) || [];

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>🧾 New Order: ${orderId}</h2>
        <p><strong>From:</strong> ${customer.name} (${customer.email})</p>
        <ul>
          ${cart.map(p => `
            <li>
              <strong>${p.quantity} × ${p.name}</strong> - £${(p.price * p.quantity).toFixed(2)}<br/>
              Text: ${p.options?.text || "None"}<br/>
              Model: ${p.options?.model || "N/A"}<br/>
              Photo: ${p.options?.photo || "No file"}
            </li>
          `).join("")}
        </ul>
      </div>
    `;

    await transporter.sendMail({
      from: `"X Customised" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO,
      subject: `New Order: ${orderId}`,
      html,
      attachments
    });

    // ✅ Respond with Stripe session URL
    res.json({ url: session.url });

  } catch (err) {
    console.error("❌ Stripe session error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

