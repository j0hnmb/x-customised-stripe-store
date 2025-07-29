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
    if (!cart.length) throw new Error("Cart is empty");

    const line_items = cart.map(item => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: item.name,
          description: `${item.options?.text || ""} - ${item.options?.model || ""}`
        },
        unit_amount: Math.round(item.price * 100)
      },
      quantity: item.quantity || 1
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${process.env.DOMAIN}/success.html`,
      cancel_url: `${process.env.DOMAIN}/cancel.html`
    });

    const orderId = `order-${Date.now()}`;
    const orderFile = path.join(ordersDir, `${orderId}.json`);
    fs.writeFileSync(orderFile, JSON.stringify(cart, null, 2));

    await sendOrderEmail(cart, orderId);

    res.json({ url: session.url });

  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

function sendOrderEmail(cart, orderId) {
  return new Promise((resolve, reject) => {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const attachments = cart
      .filter(p => p.options?.photo)
      .map(p => ({
        filename: p.options.photo,
        path: path.join(uploadDir, p.options.photo)
      }));

    const html = `
      <h2>🧾 New Order: ${orderId}</h2>
      <ul>
        ${cart.map(p => `
          <li>
            <strong>${p.quantity} × ${p.name}</strong><br/>
            Text: ${p.options?.text || "-"}<br/>
            Model: ${p.options?.model || "-"}<br/>
            Photo: ${p.options?.photo || "No file"}
          </li>
        `).join("")}
      </ul>
    `;

    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO || process.env.EMAIL_USER,
      subject: `🛒 New Order Received: ${orderId}`,
      html,
      attachments
    }, (err, info) => {
      if (err) reject(err);
      else resolve(info);
    });
  });
}

app.listen(4242, () => {
  console.log("✅ Server running on http://localhost:4242");
});
