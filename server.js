const express = require("express");
const cors = require("cors");
const path = require("path");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 4242;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Home route fallback
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Stripe checkout session route
app.post("/create-checkout-session", async (req, res) => {
  const cartItems = req.body.cart;

  // Validate cart input
  if (!Array.isArray(cartItems)) {
    console.error("❌ Invalid cart format:", req.body);
    return res.status(400).json({ error: "Invalid cart format" });
  }

  // Build line_items for Stripe
  const line_items = cartItems.map(item => ({
    price_data: {
      currency: "gbp",
      product_data: { name: item.name },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity || 1,
  }));

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${req.headers.origin}/success.html`,
      cancel_url: `${req.headers.origin}/cancel.html`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe error:", err);
    res.status(500).json({ error: "Failed to create Stripe session" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log("🔍 Stripe key loaded:", process.env.STRIPE_SECRET_KEY ? "✅ YES" : "❌ NO");
});
