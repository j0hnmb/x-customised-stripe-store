const products = [
  {
    id: 1,
    name: "Personalised Phone Case",
    price: 14.99,
    image: "images/phone-case.jpg",
    video: "videos/phone-case.mp4"
  },
  {
    id: 2,
    name: "Custom Photo Mug",
    price: 9.99,
    image: "images/photo-mug.jpg",
    video: "videos/photo-mug.mp4"
  },
  {
    id: 3,
    name: "3D Photo Lamp",
    price: 24.99,
    image: "images/try.jpg",
    video: "videos/photo-lamp.mp4"
  },
  {
    id: 4,
    name: "Glass Acrylic Block",
    price: 19.99,
    image: "images/acrylic-block.jpg",
    video: "videos/acrylic-block.mp4"
  },
  {
    id: 5,
    name: "Rock Photo Slate",
    price: 17.99,
    image: "images/photo-slate.jpg",
    video: "videos/photo-slate.mp4"
  }
];

let cart = [];

// Load cart from localStorage
if (localStorage.getItem("cart")) {
  try {
    cart = JSON.parse(localStorage.getItem("cart"));
  } catch {
    cart = [];
  }
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function renderProducts() {
  const container = document.getElementById('products');
  if (!container) return;

  container.innerHTML = products.map(p => `
    <div class="product-card">
      <div class="media-container">
        <video class="product-video" autoplay muted loop playsinline poster="${p.image}">
          <source src="${p.video}" type="video/mp4">
          <img src="${p.image}" alt="${p.name}" class="fallback-image" />
        </video>
      </div>
      <h2>${p.name}</h2>
      <p>£${p.price.toFixed(2)}</p>

      <div class="product-options">
        <label for="text-${p.id}">Name or message:</label>
        <input type="text" id="text-${p.id}" placeholder="Your custom text" />

        <label for="model-${p.id}">Select model:</label>
        <select id="model-${p.id}">
          <option value="">Choose model</option>
          <option value="iPhone">iPhone</option>
          <option value="Samsung">Samsung</option>
          <option value="Google Pixel">Google Pixel</option>
        </select>

        <label for="photo-${p.id}">Upload a photo:</label>
        <input type="file" id="photo-${p.id}" accept="image/*" />
      </div>

      <label for="qty-${p.id}">Qty:</label>
      <input type="number" id="qty-${p.id}" value="1" min="1" style="width: 60px;" />
      <button onclick="addToCart(${p.id})">Add to Cart</button>
    </div>
  `).join('');
}

function addToCart(id) {
  const product = products.find(p => p.id === id);
  const text = document.getElementById(`text-${id}`).value || "";
  const model = document.getElementById(`model-${id}`).value || "";
  const qty = parseInt(document.getElementById(`qty-${id}`).value) || 1;
  const photoInput = document.getElementById(`photo-${id}`);
  const photo = photoInput?.files?.[0] || null;

  const existingIndex = cart.findIndex(
    item => item.id === id && item.options?.text === text && item.options?.model === model
  );

  const photoFilename = photo ? photo.name : null;

  if (existingIndex > -1) {
    cart[existingIndex].quantity += qty;
  } else {
    cart.push({
      ...product,
      quantity: qty,
      options: { text, model, photoFilename },
      photoFile: photo // keep original file to upload
    });
  }

  saveCart();
  alert(`${qty} x ${product.name} added to cart.`);
  viewCart();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
  viewCart();
}

function viewCart() {
  const cartCountEl = document.getElementById("cart-count");
  if (cartCountEl) {
    cartCountEl.textContent = `(${cart.length})`;
  }

  const cartEl = document.getElementById("cart");
  if (!cartEl) return;

  if (cart.length === 0) {
    cartEl.innerHTML = "<p>Cart is empty.</p>";
    return;
  }

  const items = cart.map((p, i) => `
    <li class="cart-item">
      <img src="${p.image}" alt="${p.name}" class="cart-thumb" />
      <div>
        <strong>${p.quantity} × ${p.name}</strong> - £${(p.price * p.quantity).toFixed(2)}
        <ul>
          <li><strong>Text:</strong> ${p.options?.text || "None"}</li>
          <li><strong>Model:</strong> ${p.options?.model || "N/A"}</li>
          <li><strong>Photo:</strong> ${p.options?.photoFilename || "No file"}</li>
        </ul>
        <button onclick="removeFromCart(${i})">Remove</button>
      </div>
    </li>
  `).join('');

  const total = cart.reduce((sum, p) => sum + (p.price * p.quantity), 0).toFixed(2);

  cartEl.innerHTML = `
    <h3>Your Cart</h3>
    <ul class="cart-list">${items}</ul>
    <p><strong>Total: £${total}</strong></p>
    <button onclick="checkout()">Checkout</button>
  `;
}

async function checkout() {
  const formData = new FormData();
  const processedCart = [];

  cart.forEach((item, i) => {
    const { name, price, quantity, options } = item;
    processedCart.push({
      name,
      price,
      quantity,
      options
    });

    if (item.photoFile) {
      formData.append(`photo-${i}`, item.photoFile);
    }
  });

  formData.append("cart", JSON.stringify(processedCart));

  try {
    const response = await fetch("/create-checkout-session", {
      method: "POST",
      body: formData
    });

    const result = await response.json();

    if (result.url) {
      localStorage.removeItem("cart");
      window.location.href = result.url;
    } else {
      alert("Failed to create Stripe session.");
    }
  } catch (error) {
    console.error("Checkout error:", error);
    alert("An error occurred during checkout.");
  }
}

// Run on page load
if (document.getElementById("products")) {
  renderProducts();
}
viewCart();
