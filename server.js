// server.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const nodemailer = require("nodemailer");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.static("public"));

// 🖼️ File Upload Setup
const storage = multer.diskStorage({
  destination: "orders/uploads",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_"));
  }
});
const upload = multer({ storage });

// ✅ Checkout Route
app.post("/create-checkout-session", upload.any(), async (req, res) => {
  try {
    const cart = JSON.parse(req.body.cart || "[]");
    if (!cart.length) throw new Error("Cart is empty");

    const line_items = cart.map(item => ({
      price_data: {
        currency: "gbp",
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity || 1,
    }));

    // ✅ Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: "https://www.xcustomised.com/success.html",
      cancel_url: "https://www.xcustomised.com/cancel.html",
    });

    // ✅ Send Email with Order Details & Uploads
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const attachments = req.files.map(file => ({
      filename: file.originalname,
      path: file.path
    }));

    await transporter.sendMail({
      from: `"X Customised Store" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "🛒 New Order Received",
      html: `<p><strong>Order Details:</strong></p>
             <ul>${cart.map(i => `
                <li>
                  ${i.quantity} × ${i.name} — £${(i.price * i.quantity).toFixed(2)}<br/>
                  Text: ${i.options?.text || "-"}<br/>
                  Model: ${i.options?.model || "-"}<br/>
                  Media: ${i.options?.photo || "-"}
                </li>`).join("")}</ul>`,
      attachments
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error("❌ Stripe error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

app.listen(4242, () => {
  console.log("✅ Server running on http://localhost:4242");
});
