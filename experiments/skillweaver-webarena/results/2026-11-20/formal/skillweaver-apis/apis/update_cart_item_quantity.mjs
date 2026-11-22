import { browser, runApi } from "./skillweaver-api.mjs";

export const meta = {
  name: "update_cart_item_quantity",
  description:
    "Change the quantity of one product already in the shopping cart and read the cart back so the result confirms the new quantity. " +
    "The cart page at /checkout/cart/ holds one row per item, and the row's quantity input is the handle on the item: its id (cart-<item>-qty) and name (cart[<item>][qty]) embed a cart item id the store assigns, which grows as items are added and changes when the cart is rebuilt, so the row is located by the product's exact name as the page shows it. " +
    "The new value is set on that input through the native value setter with input and change events, then the form's Update Shopping Cart button - a submit button named update_cart_action - is clicked; it posts the whole cart form, so every other row's quantity is sent as the page currently shows it. " +
    "The store answers with a plain reload of the cart page. Two things are unexpected but important: an update brings no success or error message of its own, so the read-back after the reload is the only reliable confirmation; and that confirmation is worth taking twice, because the store recomputes the row's line subtotal as quantity x unit price, which is reported beside the quantity. " +
    "The input also carries data-cart-item-id (the product's SKU) and data-item-qty (the quantity the page was rendered with).",
  params: {
    product_name: {
      type: "string",
      description:
        "The product's name exactly as the cart page shows it, e.g. \"Elmwood Inn Fine Teas, Orange Vanilla Caffeine-free Fruit Infusion, 16-Ounce Pouch\".",
    },
    quantity: {
      type: "number",
      description: "The new quantity for that product; a positive whole number.",
    },
  },
  returns:
    "An object: product (the name searched for), quantity (the number asked for), updated (true when the read-back shows this product at exactly this quantity), unit_price and line_subtotal (the product row's price and line subtotal as the page shows them after the reload, or null), cart_items (every cart line as {name, quantity} in page order after the update), and error (a short reason when the product was not found in the cart, the input did not take the value, or the read-back shows another quantity).",
  usage_log: [
    "iter_5: product_name 'Elmwood Inn Fine Teas, Orange Vanilla Caffeine-free Fruit Infusion, 16-Ounce Pouch', quantity 4 - the procedure was carried out step by step with the agent browser (no registered API covered a cart update): the product was in the cart at quantity 2 (unit $19.36, subtotal $38.72); its quantity input was set to 4 with the native value setter and input/change events, the Update Shopping Cart button (name update_cart_action) was clicked and the page reloaded, and the read-back showed the product at quantity 4 with subtotal $77.44 (4 x $19.36).",
  ],
};

export async function run({ product_name, quantity }) {
  browser.open("/checkout/cart/");
  browser.waitFor("document.querySelector('[data-role=cart-item-qty], .cart-empty')");

  const prepared = browser.exec(`
    const target = ${JSON.stringify(product_name)}.replace(/\\s+/g, " ").trim();
    const wanted = ${JSON.stringify(String(quantity))};
    const inputs = [...document.querySelectorAll("input[data-role=cart-item-qty]")];
    const rows = inputs.map((input) => {
      const row = input.closest("tr") || input.closest(".item");
      const nameEl = row ? row.querySelector(".product-item-name") : null;
      const name = nameEl ? nameEl.textContent.replace(/\\s+/g, " ").trim() : "";
      return { name: name, quantity: input.value, input: input };
    });
    const cartItems = rows.map((r) => ({ name: r.name, quantity: r.quantity }));
    let match = rows.find((r) => r.name === target);
    if (!match) {
      match = rows.find((r) => r.name.toLowerCase() === target.toLowerCase());
    }
    if (!match) {
      const out = { found: false, cartItems: cartItems, newValue: null };
      return out;
    }
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(match.input, wanted);
    match.input.dispatchEvent(new Event("input", { bubbles: true }));
    match.input.dispatchEvent(new Event("change", { bubbles: true }));
    const out = { found: true, cartItems: cartItems, newValue: match.input.value };
    return out;
  `);

  if (!prepared.found) {
    return {
      product: product_name,
      quantity: quantity,
      updated: false,
      unit_price: null,
      line_subtotal: null,
      cart_items: prepared.cartItems,
      error: "No cart item is named '" + product_name + "'.",
    };
  }
  if (prepared.newValue !== String(quantity)) {
    return {
      product: product_name,
      quantity: quantity,
      updated: false,
      unit_price: null,
      line_subtotal: null,
      cart_items: prepared.cartItems,
      error: "The quantity input did not take the value " + quantity + ".",
    };
  }

  browser.click('button[name="update_cart_action"]');

  const readBack = browser.exec(`
    const target = ${JSON.stringify(product_name)}.replace(/\\s+/g, " ").trim();
    const inputs = [...document.querySelectorAll("input[data-role=cart-item-qty]")];
    const rows = inputs.map((input) => {
      const row = input.closest("tr") || input.closest(".item");
      const nameEl = row ? row.querySelector(".product-item-name") : null;
      const name = nameEl ? nameEl.textContent.replace(/\\s+/g, " ").trim() : "";
      const amounts = row
        ? [...row.querySelectorAll("td")]
            .map((td) => td.textContent.replace(/\\s+/g, " ").trim())
            .filter((text) => /^\\$\\s*\\d/.test(text))
        : [];
      return {
        name: name,
        quantity: input.value,
        unit_price: amounts.length ? amounts[0] : null,
        line_subtotal: amounts.length ? amounts[amounts.length - 1] : null,
      };
    });
    let match = rows.find((r) => r.name === target);
    if (!match) {
      match = rows.find((r) => r.name.toLowerCase() === target.toLowerCase());
    }
    const out = {
      cartItems: rows.map((r) => ({ name: r.name, quantity: r.quantity })),
      match: match || null,
    };
    return out;
  `);

  if (!readBack.match) {
    return {
      product: product_name,
      quantity: quantity,
      updated: false,
      unit_price: null,
      line_subtotal: null,
      cart_items: readBack.cartItems,
      error: "The cart page no longer shows '" + product_name + "' after the update.",
    };
  }

  const shown = readBack.match;
  const updated = shown.quantity === String(quantity);
  return {
    product: product_name,
    quantity: quantity,
    updated: updated,
    unit_price: shown.unit_price,
    line_subtotal: shown.line_subtotal,
    cart_items: readBack.cartItems,
    error: updated
      ? null
      : "The cart read-back shows the product at quantity " + shown.quantity + ", not " + quantity + ".",
  };
}

runApi(import.meta.url, meta, run);
