import { browser, runApi } from "./skillweaver-api.mjs";

export const meta = {
  name: "add_product_to_cart",
  description:
    "Add one product, found by its exact name, to the shopping cart with a given quantity, and read " +
    "the cart back so the result confirms what is in it. The product is located through the store's " +
    "quick search at /catalogsearch/result/, trying the full name, the name without a trailing " +
    "parenthesised part, and its first five words until a result link's name matches exactly; the " +
    "product page's own add-to-cart form is then posted with its hidden fields (including the form " +
    "key), the requested quantity, and any required custom-option choice. Three things are " +
    "unexpected but important: the store answers the add-to-cart post with HTTP 200 and a redirect " +
    "back to the product page, with no success or error message either way, so the cart page read " +
    "that follows is the only reliable confirmation; some products carry a required custom option " +
    "(a radio list such as 'Size') without which the post is silently ignored — pass option with " +
    "the choice's label as the page shows it to pick a specific one, otherwise the first offered " +
    "choice is used and reported in option_used; and an add is additive to an existing cart line " +
    "rather than a set — when the cart already holds the product, the store raises that row's " +
    "quantity by the quantity posted instead of setting it to it (adding 1 to a row at 2 leaves it " +
    "at 3), so added comes back false in that case and the library's update_cart_item_quantity is " +
    "the call that sets an exact quantity. The cart keeps items from earlier visits, so cart_items " +
    "can list more than what this call added.",
  params: {
    product_name: {
      type: "string",
      description: "The product's name exactly as the store shows it, e.g. \"Stove Top Turkey Stuffing Mix (12 oz Boxes, Pack of 2)\".",
    },
    quantity: {
      type: "number",
      description: "How many units to add; a positive whole number.",
    },
    option: {
      type: "string",
      description:
        "For a product with a required custom option, the label of the choice to select as the page shows it, e.g. \"12 Ounce (Pack of 1)\". Leave it out to take the first offered choice; ignored when the product has no required option.",
      optional: true,
    },
  },
  returns:
    "An object: product (the name searched for), quantity, option_used (the label of the " +
    "custom-option choice posted, or null when the product needed none), added (true when the cart " +
    "read-back shows this product at exactly this quantity), product_url (the product page used, or " +
    "null), cart_items (the cart's lines as {name, quantity} in page order, or null when the product " +
    "could not be found or the form could not be posted), and error (a short reason when the product " +
    "or the requested option choice was not found; added also comes back false without an error when " +
    "the cart already held the product at another quantity, an add being additive to an existing " +
    "line rather than a set).",
  usage_log: [
    "iter_1: product_name 'Elmwood Inn Fine Teas, Orange Vanilla Caffeine-free Fruit Infusion, 16-Ounce Pouch', quantity 2 — no custom option on the page; the cart read-back showed the product at quantity 2.",
    "iter_1: product_name 'Stove Top Turkey Stuffing Mix (12 oz Boxes, Pack of 2)', quantity 1, option '12 Ounce (Pack of 1)' — the page's required Size option offers only '12 Ounce (Pack of 1)' and '12 Ounce (Pack of 3)' despite the product's name, so the first choice was posted; the cart read-back showed the product at quantity 1. Both posts themselves returned HTTP 200 with no message, so the cart read is what confirmed them.",
    "iter_18: product_name 'Elmwood Inn Fine Teas, Orange Vanilla Caffeine-free Fruit Infusion, 16-Ounce Pouch', quantity 1 — no custom option on the page; the cart read-back showed the product at quantity 1 beside four items from earlier visits (10 units in the cart in all).",
    "iter_33: product_name 'Stove Top Turkey Stuffing Mix (12 oz Boxes, Pack of 2)', quantity 1 — the call was made to put the wish list's only item into the cart at the quantity the wish list lists: the product was found through the quick search and its page's required Size option posted the first offered choice ('12 Ounce (Pack of 1)'), but the cart already held 2 units of the product from an earlier visit, so the add raised that row to 3 and the read-back reported added false with the product at quantity 3; the row was then set to 1 through the cart's own Update Shopping Cart form, which is why an add is additive to an existing cart line rather than a set and why this use is logged.",
  ],
};

export async function run({ product_name, quantity, option }) {
  const wanted = option === undefined ? null : option;

  browser.open("/");

  const addScript = `
    async function main() {
      const NAME = ${JSON.stringify(product_name)};
      const QTY = ${JSON.stringify(String(quantity))};
      const WANT = ${JSON.stringify(wanted)};
      const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
      const parse = (html) => new DOMParser().parseFromString(html, 'text/html');

      const queries = [];
      for (const q of [
        NAME,
        NAME.replace(/\\s*\\([^()]*\\)\\s*$/, '').trim(),
        NAME.split(/\\s+/).slice(0, 5).join(' '),
      ]) {
        if (q && queries.indexOf(q) === -1) queries.push(q);
      }

      let productUrl = null;
      for (const q of queries) {
        const doc = parse(await (await fetch('/catalogsearch/result/?q=' + encodeURIComponent(q))).text());
        const link = [...doc.querySelectorAll('.product-item-link')].find((a) => norm(a.textContent) === NAME);
        if (link) {
          productUrl = link.href;
          break;
        }
      }
      if (!productUrl) return { ok: false, error: 'product not found', product_url: null };

      const pdoc = parse(await (await fetch(productUrl)).text());
      const form = pdoc.querySelector('form#product_addtocart_form');
      if (!form) {
        return { ok: false, error: 'the product page has no add-to-cart form', product_url: productUrl };
      }
      const action = form.getAttribute('action');
      const fd = new FormData();
      for (const inp of form.querySelectorAll('input[type="hidden"]')) {
        if (inp.name) fd.append(inp.name, inp.value);
      }

      const groups = {};
      for (const control of pdoc.querySelectorAll('#product-options-wrapper .field.required input[type="radio"], #product-options-wrapper .field.required select')) {
        if (control.name) (groups[control.name] = groups[control.name] || []).push(control);
      }
      const labelOf = (radio) => {
        const lab = pdoc.querySelector('label[for="' + radio.id + '"]') || radio.closest('label') || radio.parentElement;
        return lab ? norm(lab.textContent) : '';
      };
      const chosen = [];
      for (const name of Object.keys(groups)) {
        const controls = groups[name];
        if (controls[0].tagName === 'SELECT') {
          const opts = [...controls[0].querySelectorAll('option')].filter((o) => o.value);
          const pick = (WANT && opts.find((o) => norm(o.textContent) === WANT)) || opts[0];
          if (!pick) continue;
          fd.append(name, pick.value);
          chosen.push({ option: name, label: norm(pick.textContent) });
        } else {
          const pick = (WANT && controls.find((r) => labelOf(r) === WANT)) || controls[0];
          if (!pick) continue;
          fd.append(name, pick.value);
          chosen.push({ option: name, label: labelOf(pick) });
        }
      }
      if (WANT && chosen.length === 0) {
        const available = [...pdoc.querySelectorAll('#product-options-wrapper .field.required input[type="radio"]')].map(labelOf);
        return { ok: false, error: 'no custom-option choice labelled ' + WANT, product_url: productUrl, options_available: available };
      }
      fd.set('qty', QTY);

      const res = await fetch(action, { method: 'POST', body: fd, credentials: 'same-origin', redirect: 'follow' });
      await res.text();
      return { ok: true, product_url: productUrl, post_status: res.status, options: chosen };
    }
    return await main();
  `;
  const added = browser.exec(addScript);

  if (!added.ok) {
    return {
      product: product_name,
      quantity,
      option_used: null,
      added: false,
      product_url: added.product_url || null,
      cart_items: null,
      error: added.error,
    };
  }

  const cartScript = `
    async function main() {
      const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
      const doc = new DOMParser().parseFromString(
        await (await fetch('/checkout/cart/')).text(),
        'text/html'
      );
      const items = [...doc.querySelectorAll('tr.item, .cart.item')].map((tr) => {
        const n = tr.querySelector('.product-item-name');
        const q = tr.querySelector('input.qty, .qty input');
        return { name: n ? norm(n.textContent) : null, quantity: q ? norm(q.value) : null };
      });
      const empty = norm(doc.querySelector('.cart-empty') ? doc.querySelector('.cart-empty').textContent : '');
      return { empty, items };
    }
    return await main();
  `;
  const cart = browser.exec(cartScript);
  const line = cart.items.find((item) => item.name === product_name);

  return {
    product: product_name,
    quantity,
    option_used: added.options.length > 0 ? added.options[0].label : null,
    added: line ? Number(line.quantity) === quantity : false,
    product_url: added.product_url,
    cart_items: cart.items,
    error: line ? undefined : 'the cart read-back does not show this product',
  };
}

runApi(import.meta.url, meta, run);
