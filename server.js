require('dotenv').config();
const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const multer = require("multer");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.post("/create-checkout-session", upload.any(), async (req, res) => {
  try {
    const cartItems = JSON.parse(req.body.cart);
    const customerName = req.body.name || "Anonymous";
    const customerEmail = req.body.email || "no@email.com";

    const line_items = cartItems.map(item => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: item.name,
          description: `Model: ${item.options?.model || 'N/A'}, Message: ${item.options?.text || 'None'}`
        },
        unit_amount: Math.round(item.price * 100)
      },
      quantity: item.quantity || 1
    }));

    // 📩 Send order email to yourself
    const attachments = req.files?.map((file, i) => ({
      filename: file.originalname,
      content: file.buffer
    })) || [];

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const emailBody = `
      <h2>🛒 New Order from ${customerName}</h2>
      <p><strong>Email:</strong> ${customerEmail}</p>
      <ul>
        ${cartItems.map((item, i) => `
          <li>
            <strong>${item.quantity} x ${item.name}</strong><br/>
            Model: ${item.options?.model || 'N/A'}<br/>
            Message: ${item.options?.text || 'None'}<br/>
            File: ${item.options?.photo || 'No file uploaded'}
          </li>
        `).join('')}
      </ul>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `New Order from ${customerName}`,
      html: emailBody,
      attachments
    });

    // 🧾 Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: "https://www.xcustomised.com/success.html",
      cancel_url: "https://www.xcustomised.com/cancel.html"
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error("❌ Stripe session error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
