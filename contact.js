document.getElementById("contact-form").addEventListener("submit", function(e) {
  e.preventDefault();
  document.getElementById("form-status").textContent = "Sending...";
  setTimeout(() => {
    document.getElementById("form-status").textContent = "Message sent! We'll reply soon.";
    document.getElementById("contact-form").reset();
  }, 1000);
});
