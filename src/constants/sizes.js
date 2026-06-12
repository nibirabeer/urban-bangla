/**
 * Per-category size systems.
 * Each category defines the exact sizes that make sense for that product type.
 * Flags use ft dimensions (+ Custom), Trousers use waist inches, caps/accessories
 * have their own systems, and apparel uses standard XS–XXL.
 */

/** Sentinel value stored in Firestore for custom/made-to-order sizes. */
export const CUSTOM_SIZE = "Custom";
export const CUSTOM_STOCK_SENTINEL = -1; // means "unlimited / made to order"

/** Returns true for the admin-side key and the customer-side dimension string. */
export const isCustomSize = (size) =>
  size === CUSTOM_SIZE || (typeof size === "string" && size.startsWith("Custom:"));

export const CATEGORY_SIZES = {
  Jersey:      ["XS", "S", "M", "L", "XL", "XXL"],
  Flag:        ["2×3 ft", "3×5 ft", "4×6 ft", "5×8 ft", CUSTOM_SIZE],
  Cap:         ["S/M", "L/XL", "Free Size"],
  "T-Shirt":   ["XS", "S", "M", "L", "XL", "XXL"],
  Hoodie:      ["XS", "S", "M", "L", "XL", "XXL"],
  Trouser:     ["28\"", "30\"", "32\"", "34\"", "36\"", "38\""],
  Accessories: ["Free Size", "S/M", "L/XL"],
};

export const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

/** Returns the ordered size list for a given category. */
export const getSizesForCategory = (category) =>
  CATEGORY_SIZES[category] || DEFAULT_SIZES;

/**
 * Human-readable label for the sizes field, per category.
 * Shown above the size picker in forms.
 */
export const getSizeFieldLabel = (category) => {
  const labels = {
    Flag:        "Flag Dimensions — select sizes, enter stock qty (Custom = made to order)",
    Trouser:     "Waist Size (inches) — select sizes, enter stock qty",
    Cap:         "Cap Size — select sizes, enter stock qty",
    Accessories: "Size — select options, enter stock qty",
  };
  return labels[category] || "Sizes & Stock — click a size to enable, enter quantity";
};

/**
 * Size system type badge shown in the UI so admin/customer
 * immediately understands what unit the sizes are in.
 */
export const getSizeUnit = (category) => {
  const units = {
    Flag:    "ft",
    Trouser: "in",
  };
  return units[category] || null;
};
