/**
 * Galactic Epoxy — quote calculator & form
 * Pricing and minimum are fixed per business rules.
 */

const PRICING = {
  flake: 4.5,
  metallic: 6.0,
};

const MINIMUM_QUOTE = 1500;

const form = document.getElementById("quote-form");
const coatingInputs = () => form.querySelectorAll('input[name="coatingType"]');
const sqftInput = document.getElementById("squareFootage");

const breakdownSqft = document.getElementById("breakdown-sqft");
const breakdownCoating = document.getElementById("breakdown-coating");

const summaryEl = document.getElementById("form-errors-summary");
const toast = document.getElementById("toast");
const yearEl = document.getElementById("year");

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

function getSelectedCoating() {
  const checked = form.querySelector('input[name="coatingType"]:checked');
  return checked ? checked.value : "flake";
}

function getRateForCoating(type) {
  return type === "metallic" ? PRICING.metallic : PRICING.flake;
}

function coatingLabel(type) {
  return type === "metallic" ? "Metallic epoxy" : "Flake system";
}

/**
 * @param {number} sqft
 * @param {"flake"|"metallic"} coating
 * @returns {{ subtotal: number, finalAmount: number, rate: number }}
 */
function roundMoney(n) {
  return Math.round(n * 100) / 100;
}

function computeQuote(sqft, coating) {
  const rate = getRateForCoating(coating);
  const safeSqft = Number.isFinite(sqft) && sqft > 0 ? sqft : 0;
  const subtotal = roundMoney(safeSqft * rate);
  const finalAmount = Math.max(subtotal, MINIMUM_QUOTE);
  return { subtotal, finalAmount, rate };
}

function updateBreakdown() {
  const raw = sqftInput.value.trim();
  const sqft = raw === "" ? NaN : Number(raw);
  const coating = getSelectedCoating();

  breakdownCoating.textContent = coatingLabel(coating);

  if (!Number.isFinite(sqft) || sqft <= 0) {
    breakdownSqft.textContent = raw === "" ? "—" : "Enter a valid amount";
    return;
  }

  breakdownSqft.textContent = `${sqft.toLocaleString("en-US")} sq ft`;
}

coatingInputs().forEach((el) => el.addEventListener("change", updateBreakdown));
sqftInput.addEventListener("input", updateBreakdown);
updateBreakdown();

/* ---- Validation ---- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** US-oriented: 10 digits after stripping non-digits, optional leading 1 */
function isValidPhone(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return true;
  if (digits.length === 11 && digits.startsWith("1")) return true;
  return false;
}

function setFieldError(id, message) {
  const el = document.getElementById(id);
  const err = document.getElementById(`${id}-error`);
  if (!err) return;
  err.textContent = message;
  if (!el) return;
  if (message) {
    el.setAttribute("aria-invalid", "true");
    const prev = el.getAttribute("aria-describedby");
    const add = `${id}-error`;
    el.setAttribute(
      "aria-describedby",
      prev && !prev.includes(add) ? `${prev} ${add}` : add
    );
  } else {
    el.removeAttribute("aria-invalid");
    const prev = el.getAttribute("aria-describedby");
    if (prev) {
      const next = prev
        .split(/\s+/)
        .filter((p) => p && p !== `${id}-error`)
        .join(" ");
      if (next) el.setAttribute("aria-describedby", next);
      else el.removeAttribute("aria-describedby");
    }
  }
}

function clearAllErrors() {
  [
    "fullName",
    "email",
    "phone",
    "address",
    "squareFootage",
    "coatingType",
  ].forEach((id) => setFieldError(id, ""));
  summaryEl.hidden = true;
  summaryEl.textContent = "";
}

function validate() {
  clearAllErrors();
  const errors = [];

  const fullName = document.getElementById("fullName").value.trim();
  if (!fullName) {
    setFieldError("fullName", "Please enter your full name.");
    errors.push("Full name");
  }

  const email = document.getElementById("email").value.trim();
  if (!email) {
    setFieldError("email", "Please enter your email.");
    errors.push("Email");
  } else if (!EMAIL_RE.test(email)) {
    setFieldError("email", "Please enter a valid email address.");
    errors.push("Email format");
  }

  const phone = document.getElementById("phone").value.trim();
  if (!phone) {
    setFieldError("phone", "Please enter your phone number.");
    errors.push("Phone");
  } else if (!isValidPhone(phone)) {
    setFieldError(
      "phone",
      "Enter a valid US-style phone (10 digits, optional country code 1)."
    );
    errors.push("Phone format");
  }

  const address = document.getElementById("address").value.trim();
  if (!address || address.length < 8) {
    setFieldError(
      "address",
      "Please enter your full service address (street, city, state, ZIP)."
    );
    errors.push("Address");
  }

  const sqftRaw = sqftInput.value.trim();
  const sqft = Number(sqftRaw);
  if (!sqftRaw) {
    setFieldError("squareFootage", "Please enter square footage.");
    errors.push("Square footage");
  } else if (!Number.isFinite(sqft) || sqft <= 0) {
    setFieldError("squareFootage", "Square footage must be a positive number.");
    errors.push("Square footage");
  } else if (sqft > 100000) {
    setFieldError(
      "squareFootage",
      "That square footage looks unusually large. Please call us or enter a realistic estimate."
    );
    errors.push("Square footage range");
  }

  const coatingChecked = form.querySelector('input[name="coatingType"]:checked');
  if (!coatingChecked) {
    setFieldError("coatingType", "Please choose a coating type.");
    errors.push("Coating type");
  }

  if (errors.length) {
    summaryEl.textContent =
      "Please fix the following: " + errors.join(", ") + ".";
    summaryEl.hidden = false;
    return null;
  }

  const coating = /** @type {"flake"|"metallic"} */ (getSelectedCoating());
  const { subtotal, finalAmount } = computeQuote(sqft, coating);

  return {
    name: fullName,
    email,
    phone,
    address,
    squareFootage: sqft,
    coatingType: coating,
    subtotal,
    finalQuotedAmount: finalAmount,
    timestamp: new Date().toISOString(),
  };
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  requestAnimationFrame(() => {
    toast.classList.add("is-visible");
  });
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => {
    toast.classList.remove("is-visible");
    window.setTimeout(() => {
      toast.hidden = true;
    }, 400);
  }, 4500);
}

/**
 * Replace with real API:
 * await fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
 */
async function submitQuoteRequest(payload) {
  console.log("Galactic Epoxy quote payload:", payload);
  await new Promise((r) => setTimeout(r, 400));
  return { ok: true };
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = validate();
  if (!payload) {
    summaryEl.setAttribute("tabindex", "-1");
    summaryEl.focus();
    return;
  }

  const btn = document.getElementById("submit-btn");
  btn.disabled = true;
  btn.textContent = "Sending…";

  try {
    await submitQuoteRequest(payload);
    showToast("Thanks! We received your request and will be in touch.");
    form.reset();
    clearAllErrors();
    updateBreakdown();
  } catch {
    summaryEl.textContent =
      "Something went wrong. Please try again or call us directly.";
    summaryEl.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = "Submit quote request";
  }
});

/* Mobile nav */
const navToggle = document.querySelector(".nav-toggle");
const navDrawer = document.getElementById("nav-drawer");

if (navToggle && navDrawer) {
  navToggle.addEventListener("click", () => {
    const open = navDrawer.hidden;
    navDrawer.hidden = !open;
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  navDrawer.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      navDrawer.hidden = true;
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open menu");
    });
  });
}
