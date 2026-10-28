const int = (v, min, max) => { const n = Number(v); return Number.isInteger(n) && n >= min && n <= max ? n : null; };

// Returns { value } or { error }.
export function checkProduct(b) {
  const name = String(b.name || "").trim();
  const category = String(b.category || "").trim();
  const unit = String(b.unit || "").trim();
  if (!name || name.length > 80) return { error: "Enter a product name (up to 80 characters)." };
  if (!category || category.length > 40) return { error: "Choose a category." };
  if (unit.length > 20) return { error: "Unit is too long (20 characters max)." };
  const price = int(b.price, 1, 10000000);
  if (price === null) return { error: "Enter a price in FCFA, like 1500." };
  const oldPrice = b.oldPrice === "" || b.oldPrice == null ? 0 : int(b.oldPrice, 0, 10000000);
  if (oldPrice === null) return { error: "Old price must be a whole number." };
  if (oldPrice && oldPrice <= price) return { error: "Old price must be higher than the price, or empty." };
  const stock = int(b.stock, 0, 100000);
  if (stock === null) return { error: "Stock must be a whole number from 0." };
  const rating = Number(b.rating == null || b.rating === "" ? 4.8 : b.rating);
  if (!(rating >= 0 && rating <= 5)) return { error: "Rating must be between 0 and 5." };
  const active = b.active ? 1 : 0;
  let image;
  if (b.image === undefined) image = undefined;            // keep current
  else if (b.image === null || b.image === "") image = null; // remove
  else if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(b.image) && b.image.length <= 900000) image = b.image;
  else return { error: "The photo must be a JPG, PNG or WebP under about 650 KB." };
  return { value: { name, category, unit, price, oldPrice: oldPrice || 0, stock, rating: Math.round(rating * 10) / 10, active, image } };
}

export const ORDER_STATUSES = ["pending", "paid", "processing", "delivered", "cancelled", "failed"];
