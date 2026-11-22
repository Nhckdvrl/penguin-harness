import { browser, runApi } from "./skillweaver-api.mjs";

export const meta = {
  name: "buy_all_wishlist_items",
  description:
    "Buy everything on the shopper's wish list: put every wish-list item into the shopping cart at the " +
    "quantity the wish list lists and place the order through the onepage checkout on the shopper's " +
    "saved address, returning the order confirmation number. " +
    "The wish list page at /wishlist/ is opened and read for its items and their quantities - each " +
    "product block carries its name and a Qty input (qty[<item>]) holding the quantity the wish list " +
    "lists - and the page's own Add All to Cart button (a button of class 'action tocart' whose title " +
    "is 'Add All to Cart', beside Update Wish List and Share Wish List) is clicked. " +
    "The cart page is then read back, the way the library's add APIs confirm a post, and every " +
    "wish-list item the button did not put in the cart is added on its own: the product is located " +
    "through the store's quick search at /catalogsearch/result/ (trying the full name, the name " +
    "without a trailing parenthesised part, and its first five words) and its product page's own " +
    "add-to-cart form is posted with that page's hidden fields (including the form key), the wish-list " +
    "quantity, and the first offered choice of any required custom option. " +
    "A second cart read confirms every wish-list item is in the cart at exactly the quantity the wish " +
    "list lists before the checkout starts. " +
    "The checkout then walks the onepage steps: Proceed to Checkout, the shipping step (the signed-in " +
    "shopper's saved address is already selected and merely shown; the first shipping-method radio is " +
    "checked only when the step has none checked), Next, the payment step (the requested payment " +
    "method is chosen by its visible label when one is given, otherwise the step's own preselection is " +
    "kept) and Place Order. " +
    "Six things are unexpected but important. " +
    "The wish list's Add All to Cart button cannot choose a required custom option, so a product that " +
    "carries one - a radio list such as 'Size', like the Stove Top stuffing mix - is left out of the " +
    "cart while the store's message reports 'The product's required option(s) weren't entered. Make " +
    "sure the options are entered and try again for \"<product name>\".' beside 'N product(s) have " +
    "been added to shopping cart: ...' for the rest; the refused product is added on its own product " +
    "page with the first offered choice, the same limitation the store's add-to-cart posts carry. " +
    "The button reloads the page onto the wish list view at /wishlist/index/index/wishlist_id/<id>/ " +
    "rather than the cart page, so the cart page has to be read to see what the button did. " +
    "The store answers an add-to-cart post with HTTP 200 and a redirect back to the product page, " +
    "with no success or error message either way, so the cart page read is the only reliable " +
    "confirmation. " +
    "The cart keeps items from earlier visits, so cart_items can list more than the wish list's items. " +
    "On the cart page the working Proceed to Checkout control is " +
    "button[data-role=\"proceed-to-checkout\"], because the button.action.primary.checkout element is " +
    "a hidden duplicate with no size and clicking it fails; and that click does not always navigate - " +
    "the page can stay on /checkout/cart/ with no checkout hash and none of the shipping step's " +
    "controls, and a wait that times out only returns false - so the click is verified against the " +
    "shipping step's own controls, repeated once while the page is still the cart, and only then is " +
    "the checkout opened directly at /checkout/. " +
    "And the success page's order number is shown once: it is read from the rendered page text with a " +
    "regular expression, never a literal (in the page's markup it sits inside an anchor, so a " +
    "raw-markup read can catch the anchor's tag instead of the digits), and when that display has " +
    "already been consumed - or the tab never landed on the success page - the number is recovered " +
    "from the shopper's order history at /sales/order/history/ (and /customer/account/), whose newest " +
    "order view (/sales/order/view/order_id/<id>/) holds the number of the order just placed; the " +
    "cart page reading 'You have no items in your shopping cart' is what shows the order did go " +
    "through in that case.",
  params: {
    payment_method: {
      type: "string",
      description:
        "The payment method to choose, as the payment step shows it, e.g. \"Check / Money Order\". " +
        "Leave it out to keep the method the step already has selected.",
      optional: true,
    },
  },
  returns:
    "An object: order_number (the confirmation number the success page showed, or the one recovered " +
    "from the shopper's order history, or null when the checkout produced none), wishlist_items (the " +
    "wish list's lines as {name, quantity} as the page listed them), added (one entry per wish-list " +
    "item, in page order: product, quantity, via ('wish list button' when the page's own Add All to " +
    "Cart button put the item in the cart and 'product page' when this call added it on the product's " +
    "own page), option_used (the label of the custom-option choice posted with that add, or null), " +
    "and added_to_cart (true when the cart read-back shows the item at exactly the listed " +
    "quantity)), cart_items (the cart's lines as {name, quantity} in page order before the checkout, " +
    "which can include items from earlier visits), and error (a short reason when the purchase did " +
    "not complete - the wish list is empty, a wish-list item could not be put in the cart at the " +
    "quantity the wish list lists, or no confirmation number could be read - otherwise null).",
  usage_log: [
    "iter_29: payment_method left out - the procedure was carried out step by step with the agent " +
      "browser (no registered API covered buying the whole wish list at once): the wish list at " +
      "/wishlist/ read 'My Wish List / 4 Item(s)' and held four items each at quantity 1 - Q Mixers " +
      "Premium Ginger Ale: Real Ingredients & Less Sweet, 6.7 Fl Oz (24 Bottles) at $68.50, Stove Top " +
      "Turkey Stuffing Mix (12 oz Boxes, Pack of 2) at $8.49, Pre-baked Gingerbread House Kit Value " +
      "Pack, 17 oz., Pack of 2, Total 34 oz. at $19.99 and Elmwood Inn Fine Teas, Orange Vanilla " +
      "Caffeine-free Fruit Infusion, 16-Ounce Pouch at $19.36 - each with its own Qty input " +
      "(qty[3]..qty[6]); the page's Add All to Cart button (button.action.tocart[title=\"Add All to " +
      "Cart\"]) was clicked and the page reloaded onto /wishlist/index/index/wishlist_id/5/ with the " +
      "messages '3 product(s) have been added to shopping cart: ...' (the ginger ale, the gingerbread " +
      "kit and the tea) and 'The product's required option(s) weren't entered. Make sure the options " +
      "are entered and try again for \"Stove Top Turkey Stuffing Mix (12 oz Boxes, Pack of 2)\".'; the " +
      "stuffing mix was then added on its own product page at quantity 1 with the first offered " +
      "choice of its required Size option ('12 Ounce (Pack of 1)') - the store's add-to-cart post " +
      "answered HTTP 200 with no message of its own, and the next load of the cart page carried the " +
      "one-time banner 'You added Stove Top Turkey Stuffing Mix (12 oz Boxes, Pack of 2) to your " +
      "shopping cart.'; the cart page at /checkout/cart/ then showed all four items at quantity 1 " +
      "with the header's mini-cart reading '4 items'; the onepage checkout ran on the shopper's saved " +
      "address with the preselected Check / Money order method, and the success page at " +
      "/checkout/onepage/success/ showed order number 000000200, which was read again from the " +
      "success page's rendered text as the independent verification.",
  ],
};

// Read the cart page and report its lines as {name, quantity}.
const cartReadScript = `
  async function main() {
    const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
    const doc = new DOMParser().parseFromString(
      await (await fetch('/checkout/cart/')).text(),
      'text/html'
    );
    const rows = [...doc.querySelectorAll('tr.item, tr.item-info, .cart.item')].map((tr) => {
      const nameEl = tr.querySelector('.product-item-name');
      const q = tr.querySelector('input.qty, input[data-role=cart-item-qty], input[name^="cart["]');
      return {
        name: nameEl ? norm(nameEl.textContent) : '',
        quantity: q ? norm(q.value) : null,
      };
    }).filter((r) => r.name);
    const out = { items: rows };
    return out;
  }
  return await main();
`;

// Add one product on its own page at a given quantity, the way the library's add APIs do it: the
// product's page is found through the quick search and its own add-to-cart form is posted, taking
// the first offered choice of any required custom option.
const addOneScript = (name, quantity) => `
  async function main() {
    const NAME = ${JSON.stringify(name)};
    const QTY = ${JSON.stringify(String(quantity))};
    const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
    const parse = (html) => new DOMParser().parseFromString(html, 'text/html');
    const out = { ok: false, product_url: null, option_used: null, error: null };

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
      if (link) { productUrl = link.href; break; }
    }
    if (!productUrl) {
      out.error = 'the product was not found through the store quick search';
      return out;
    }
    out.product_url = productUrl;

    const pdoc = parse(await (await fetch(productUrl)).text());
    const form = pdoc.querySelector('form#product_addtocart_form');
    if (!form) {
      out.error = 'the product page has no add-to-cart form';
      return out;
    }
    const fd = new FormData();
    for (const inp of form.querySelectorAll('input[type="hidden"]')) {
      if (inp.name) fd.append(inp.name, inp.value);
    }
    // a required custom option, whose first offered choice is taken
    const groups = {};
    for (const control of pdoc.querySelectorAll('#product-options-wrapper .field.required input[type="radio"], #product-options-wrapper .field.required select')) {
      if (control.name) (groups[control.name] = groups[control.name] || []).push(control);
    }
    const labelOf = (radio) => {
      const lab = pdoc.querySelector('label[for="' + radio.id + '"]') || radio.closest('label') || radio.parentElement;
      return lab ? norm(lab.textContent) : '';
    };
    for (const gname of Object.keys(groups)) {
      const controls = groups[gname];
      if (!controls.length) continue;
      if (controls[0].tagName === 'SELECT') {
        const opts = [...controls[0].querySelectorAll('option')].filter((o) => o.value);
        const pick = opts[0];
        if (!pick) continue;
        fd.append(gname, pick.value);
        out.option_used = norm(pick.textContent);
      } else {
        fd.append(gname, controls[0].value);
        out.option_used = labelOf(controls[0]);
      }
    }
    fd.set('qty', QTY);
    const res = await fetch(form.getAttribute('action'), { method: 'POST', body: fd, credentials: 'same-origin', redirect: 'follow' });
    await res.text();
    out.ok = true;
    return out;
  }
  return await main();
`;

export async function run({ payment_method }) {
  // 1) the wish list page: its items and the quantities it lists. The page also carries product
  // blocks without a Qty input, which are not wish-list items.
  browser.open("/wishlist/");
  browser.waitFor(
    "location.pathname.indexOf('/wishlist') !== -1 && document.readyState === 'complete'"
  );

  const wishlist = browser.exec(`
    const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
    const blocks = [...document.querySelectorAll('.product-item')].filter((b) =>
      b.querySelector('input[name^="qty["]')
    );
    const items = blocks
      .map((b) => {
        const nameEl = b.querySelector('.product-item-name a, .product-item-link');
        const q = b.querySelector('input[name^="qty["]');
        return { name: nameEl ? norm(nameEl.textContent) : '', quantity: q ? norm(q.value) : null };
      })
      .filter((r) => r.name);
    const out = { items: items };
    return out;
  `);
  const wishlistItems = wishlist.items;
  if (!wishlistItems.length) {
    return {
      order_number: null,
      wishlist_items: [],
      added: [],
      cart_items: null,
      error: "the wish list at /wishlist/ holds no items",
    };
  }

  // 2) the page's own Add All to Cart button, which puts the items in at the listed quantities
  browser.click('button.action.tocart[title="Add All to Cart"]');
  browser.waitFor("document.readyState === 'complete'", { timeoutMs: 15000 });

  // 3) the cart page read-back. The store answers the button with a reload onto the wish list
  // view, so the cart page is what shows what the button did; the cart keeps items from earlier
  // visits, so it can hold more lines than the wish list.
  let cart = browser.exec(cartReadScript, { timeout: "2m" });

  // 4) every wish-list item the button left out of the cart is added on its own product page,
  // the way the library's add APIs do it. An item the button put in at a different quantity is
  // never re-added; it fails the check below instead.
  const added = wishlistItems.map((item) => {
    const row = cart.items.find((r) => r.name === item.name);
    if (row) {
      return {
        product: item.name,
        quantity: item.quantity,
        via: "wish list button",
        option_used: null,
        added_to_cart: row.quantity === item.quantity,
      };
    }
    const res = browser.exec(addOneScript(item.name, item.quantity), { timeout: "2m" });
    return {
      product: item.name,
      quantity: item.quantity,
      via: "product page",
      option_used: res.option_used || null,
      added_to_cart: false,
    };
  });

  // 5) the second cart read: every wish-list item must be in the cart at exactly the listed
  // quantity before the checkout starts
  cart = browser.exec(cartReadScript, { timeout: "2m" });
  const short = [];
  for (const item of wishlistItems) {
    const row = cart.items.find((r) => r.name === item.name);
    const ok = !!row && row.quantity === item.quantity;
    const entry = added.find((e) => e.product === item.name);
    if (entry) entry.added_to_cart = ok;
    if (!ok) short.push(item.name + " at quantity " + item.quantity);
  }
  if (short.length) {
    return {
      order_number: null,
      wishlist_items: wishlistItems,
      added: added,
      cart_items: cart.items,
      error:
        "not every wish-list item is in the cart at the quantity the wish list lists: " +
        short.join("; "),
    };
  }

  // 6) the onepage checkout for everything now in the cart, the walk place_order_from_cart
  // takes. The Proceed to Checkout click does not always navigate: check the shipping step's
  // own controls appeared, click again while the page is still the cart, and only then open
  // the checkout directly.
  browser.open("/checkout/cart/");
  browser.waitFor('document.querySelector(\'button[data-role="proceed-to-checkout"]\')');

  browser.click('button[data-role="proceed-to-checkout"]');
  let atShipping = browser.waitFor("document.querySelector('button.action.continue.primary')", { timeoutMs: 15000 });
  if (!atShipping) {
    const stillOnCart = browser.exec(
      "return location.pathname.indexOf('/checkout/cart') === 0 && !!document.querySelector('button[data-role=\"proceed-to-checkout\"]');"
    );
    if (stillOnCart) browser.click('button[data-role="proceed-to-checkout"]');
    atShipping = browser.waitFor("document.querySelector('button.action.continue.primary')", { timeoutMs: 15000 });
  }
  if (!atShipping) {
    browser.open("/checkout/");
    browser.waitFor("document.querySelector('button.action.continue.primary')", { timeoutMs: 15000 });
  }

  // Shipping step: the saved address is already selected; make sure a shipping method is.
  browser.exec(`
    const radios = [...document.querySelectorAll('input[type="radio"]')];
    if (radios.length && !radios.some((r) => r.checked)) radios[0].click();
    return radios.length;
  `);
  browser.click("button.action.continue.primary");

  // Payment step: choose the payment method by its visible label, then place the order.
  browser.waitFor('document.querySelector(\'input[name="payment[method]"]\')', { timeoutMs: 15000 });
  const wanted = payment_method ? JSON.stringify(payment_method.trim().toLowerCase()) : null;
  browser.exec(`
    const wanted = ${wanted};
    const labelOf = (input) => {
      let label = input.closest("label");
      if (!label && input.id) label = document.querySelector('label[for="' + input.id + '"]');
      return label ? label.textContent.replace(/\\s+/g, " ").trim() : "";
    };
    const radios = [...document.querySelectorAll('input[name="payment[method]"]')];
    let chosen = radios.find((r) => r.checked) || null;
    if (wanted) {
      const match = radios.find((r) => labelOf(r).toLowerCase() === wanted);
      if (!match) throw new Error("payment method not offered: " + wanted);
      if (!match.checked) match.click();
      chosen = match;
    }
    const sameAddress = document.querySelector('input[name="billing-address-same-as-shipping"]');
    if (sameAddress && !sameAddress.checked) sameAddress.click();
    const placeOrder = [...document.querySelectorAll("button")].find((b) => /Place Order/i.test(b.textContent));
    if (!placeOrder) throw new Error("Place Order button not found");
    placeOrder.click();
    return chosen ? chosen.value : null;
  `);

  // 7) the success page shows the confirmation number once; read it from the rendered text, and
  // recover it from the shopper's order history when that display is already gone, the way
  // reorder_past_order does.
  browser.waitFor('location.pathname.indexOf("/checkout/onepage/success/") !== -1', { timeoutMs: 20000 });
  const shown = browser.exec(`
    const m = document.body.innerText.match(/order number is:\\s*([0-9]+)/i);
    const out = { order_number: m ? m[1] : null };
    return out;
  `);
  let orderNumber = shown.order_number;
  let error = null;

  if (!orderNumber) {
    const recovered = browser.exec(
      `
      async function main() {
        const get = async (p) => {
          const r = await fetch(p, { cache: 'no-store' });
          const raw = await r.text();
          const text = raw.replace(/<script[\\s\\S]*?<\\/script>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ');
          return { raw: raw, text: text };
        };
        try {
          const success = await get('/checkout/onepage/success/');
          const m = success.text.match(/order number is:\\s*([0-9]+)/i);
          if (m) return { order_number: m[1], reason: null };
          const cartDoc = await get('/checkout/cart/');
          if (!/You have no items in your shopping cart/i.test(cartDoc.text)) {
            return { order_number: null, reason: 'the cart still holds items, so the order did not go through' };
          }
          const ids = [];
          for (const page of ['/sales/order/history/', '/customer/account/']) {
            const doc = await get(page);
            for (const link of doc.raw.matchAll(/href="([^"]*\\/sales\\/order\\/view\\/order_id\\/(\\d+)\\/)"/gi)) {
              if (ids.indexOf(link[2]) === -1) ids.push(link[2]);
            }
          }
          for (const id of ids) {
            const view = await get('/sales/order/view/order_id/' + id + '/');
            const num = (view.text.match(/Order\\s*#?\\s*(\\d{4,})/i) || [])[1] || null;
            if (num) return { order_number: num, reason: null };
          }
          return { order_number: null, reason: 'no order number could be read from the success page or the shopper order history' };
        } catch (e) {
          return { order_number: null, reason: String(e && e.message ? e.message : e) };
        }
      }
      return await main();
    `,
      { timeout: "2m" }
    );
    orderNumber = recovered.order_number;
    if (!orderNumber) error = recovered.reason || "no order confirmation number was shown";
  }

  return {
    order_number: orderNumber,
    wishlist_items: wishlistItems,
    added: added,
    cart_items: cart.items,
    error: error,
  };
}

runApi(import.meta.url, meta, run);
