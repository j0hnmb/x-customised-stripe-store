const products = [
  { id: 1, name: "Personalised Phone Case", price: 14.99 },
  { id: 2, name: "Custom Photo Mug", price: 9.99 },
  { id: 3, name: "3D Photo Lamp", price: 24.99 },
  { id: 4, name: "Glass Acrylic Block", price: 19.99 },
  { id: 5, name: "Rock Photo Slate", price: 17.99 }
];

let cart = [];

function renderProducts() {
  const container = document.getElementById('products');
  container.innerHTML = products.map(p => `
    <div class="product">
      <h2>${p.name}</h2>
      <p>£${p.price.toFixed(2)}</p>
      <button onclick="addToCart(${p.id})">Add to Cart</button>
    </div>
  `).join('');
}

function addToCart(id) {
  const product = products.find(p => p.id === id);
  cart.push(product);
  alert(`${product.name} added to cart!`);
}

function viewCart() {
  const cartEl = document.getElementById('cart');
  if (cart.length === 0) {
    cartEl.innerHTML = "<p>Cart is empty.</p>";
    return;
  }

  const items = cart.map(p => `<li>${p.name} - £${p.price.toFixed(2)}</li>`).join('');
  const total = cart.reduce((sum, p) => sum + p.price, 0).toFixed(2);

  cartEl.innerHTML = `
    <h3>Your Cart</h3>
    <ul>${items}</ul>
    <p>Total: £${total}</p>
    <button onclick="checkout()">Checkout</button>
  `;
}

async function checkout() {
  try {
    const response = await fetch("http://localhost:4242/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ cart })
    });

    const session = await response.json();

    if (session.url) {
      window.location.href = session.url;
    } else {
      alert("Failed to create Stripe session.");
    }
  } catch (error) {
    console.error("Checkout error:", error);
    alert("An error occurred during checkout.");
  }
}

renderProducts();
