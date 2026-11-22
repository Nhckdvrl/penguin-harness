import { browser, runApi } from "./skillweaver-api.mjs";

export const meta = {
  name: "add_all_wishlist_items_to_cart",
  description:
    "Put every item currently on the shopper's wish list into the shopping cart, each at the " +
    "quantity the wish list lists for it, and read the cart back so the result shows the cart - " +
    "without placing any order. " +
    "The wish list page at /wishlist/ is opened and read for its items and their quantities - each " +
    "product block carries its name and a Qty input (qty[<item>]) holding the quantity the wish " +
    "list lists - and the page's own Add All to Cart button (a button of class 'action tocart' " +
    "whose title is 'Add All to Cart', beside Update Wish List and Share Wish List) is clicked. " +
    "The cart page is then read back, the way the library's add APIs confirm a post. " +
    "A wish-list item the button left out of the cart is added on its own: the product is located " +
    "through the store's quick search at /catalogsearch/result/ (trying the full name, the name " +
    "without a trailing parenthesised part, and its first five words) and its product page's own " +
    "add-to-cart form is posted with that page's hidden fields (including the form key), the " +
    "wish-list quantity, and the first offered choice of any required custom option. " +
    "A wish-list item the cart already holds at a different quantity is never added again - an add " +
    "raises an existing line rather than setting it - its row is instead set to the listed " +
    "quantity through the cart's own Update Shopping Cart form, which posts the whole cart form " +
    "(every other row at the quantity the page shows) and reloads the cart page. " +
    "The cart page is then opened and read, so the result shows the cart and the browser is left " +
    "on it. " +
    "Five things are unexpected but important. " +
    "The wish list's Add All to Cart button cannot choose a required custom option, so a product " +
    "that carries one - a radio list such as 'Size', like the Stove Top stuffing mix - is left " +
    "out of the cart while the store's message reports 'The product's required option(s) weren't " +
    "entered. Make sure the options are entered and try again for \"<product name>\".' beside 'N " +
    "product(s) have been added to shopping cart: ...' for the rest; the refused product is added " +
    "on its own product page with the first offered choice. " +
    "The button reloads the page onto the wish list view at /wishlist/index/index/wishlist_id/<id>/ " +
    "rather than the cart page, so the cart page has to be read to see what the button did. " +
    "The store answers an add-to-cart post with HTTP 200 and a redirect back to the product page, " +
    "with no success or error message either way, so the cart page read is the only reliable " +
    "confirmation. " +
    "An add is additive to an existing cart line rather than a set: a wish-list item the cart " +
    "already held from an earlier visit at another quantity comes back at the held quantity plus " +
    "the added one - observed here at 2 held plus 1 added for a listed quantity of 1 - so its row " +
    "is set to the listed quantity through the cart's update form, whose post brings no message " +
    "of its own either and whose read-back is the confirmation. " +
    "And the cart keeps items from earlier visits, so cart_items can list more than the wish " +
    "list's items. " +
    "This call stops at the cart and places no order; buy_all_wishlist_items is the variant that " +
    "also walks the onepage checkout, and unlike this call it has no step that sets a row to the " +
    "listed quantity, so a wish-list item the cart already holds at another quantity makes it " +
    "fail.",
  params: {},
  returns:
    "An object: wishlist_items (the wish list's lines as {name, quantity} as the page listed " +
    "them), added (one entry per wish-list item, in page order: product, quantity, via ('wish " +
    "list button' when the page's own Add All to Cart button put the item in the cart at the " +
    "listed quantity, 'product page' when this call added it on the product's own page, and " +
    "'cart update' when the row's quantity was set through the cart's own update form because " +
    "the cart already held the item at another quantity), option_used (the label of the " +
    "custom-option choice posted with a product-page add, or null), added_to_cart (true when the " +
    "cart read-back shows the item at exactly the listed quantity), and error (a short reason " +
    "when this item's add or update failed, otherwise undefined)), cart_items (the cart's lines " +
    "as {name, quantity} in page order as shown afterwards, which can include items from earlier " +
    "visits), and error (a short reason when the wish list is empty or not every wish-list item " +
    "is in the cart at the quantity the wish list lists, otherwise null).",
  usage_log: [
    "iter_33: no parameters - the procedure was carried out step by step with the agent browser " +
      "(no registered API covered putting the wish list into the cart without ordering, " +
      "buy_all_wishlist_items also checking out): the wish list at /wishlist/ held one item, " +
      "'Stove Top Turkey Stuffing Mix (12 oz Boxes, Pack of 2)', at Qty 1; the page's Add All to " +
      "Cart button was clicked and the page reloaded onto /wishlist/index/index/wishlist_id/5/ " +
      "with the store's message 'The product's required option(s) weren't entered. Make sure the " +
      "options are entered and try again for \"Stove Top Turkey Stuffing Mix (12 oz Boxes, Pack " +
      "of 2)\".' - the product carries a required Size option; the item was then added on its own " +
      "product page at quantity 1 with the first offered choice ('12 Ounce (Pack of 1)') through " +
      "the registered add_product_to_cart API, but the cart already held 2 units of the product " +
      "from an earlier visit, so the add left the row at 3 and that API's read-back reported " +
      "added false; the cart's own Update Shopping Cart form was then posted " +
      "(POST /checkout/cart/updatePost/, HTTP 200) with that row's quantity set to 1 and every " +
      "other row unchanged, and the read-back confirmed cart[604][qty] = 1; the cart page at " +
      "/checkout/cart/ was then opened and read, showing the wish-list item at quantity 1 beside " +
      "eleven products at quantity 2 each that earlier visits had left in the cart (12 rows, 23 " +
      "units in all), and no order was placed.",
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

// Set one cart row to a given quantity through the cart page's own Update Shopping Cart form,
// the request update_cart_item_quantity makes on the page: the whole cart form is posted with
// every other row at the quantity the page shows, and the cart page read after it confirms.
const setCartQtyScript = (name, quantity) => `
  async function main() {
    const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
    const TARGET = ${JSON.stringify(name)};
    const WANTED = ${JSON.stringify(String(quantity))};
    const parse = (html) => new DOMParser().parseFromString(html, 'text/html');
    const out = { updated: false, post_status: null, error: null };

    const qtyRows = (doc) =>
      [...doc.querySelectorAll('input[name^="cart["][name$="[qty]"]')].map((inp) => {
        const tr = inp.closest('tr');
        const nameEl = tr ? tr.querySelector('.product-item-name') : null;
        return { name: nameEl ? norm(nameEl.textContent) : '', quantity: inp.value, field: inp.name };
      });

    const doc1 = parse(await (await fetch('/checkout/cart/', { credentials: 'same-origin' })).text());
    const rows = qtyRows(doc1);
    const target = rows.find((r) => r.name === TARGET);
    if (!target) {
      out.error = 'the cart page has no row for this product';
      return out;
    }
    const form = [...doc1.querySelectorAll('form')].find((f) => f.querySelector('[name="update_cart_action"]'));
    if (!form) {
      out.error = 'the cart page has no Update Shopping Cart form';
      return out;
    }
    const fd = new FormData();
    for (const inp of form.querySelectorAll('input[type="hidden"]')) {
      if (inp.name) fd.set(inp.name, inp.value);
    }
    for (const inp of doc1.querySelectorAll('input[name^="cart["][name$="[qty]"]')) {
      fd.set(inp.name, inp.name === target.field ? WANTED : inp.value);
    }
    const button = form.querySelector('[name="update_cart_action"]');
    fd.set('update_cart_action', button && button.value ? button.value : '1');
    const action = new URL(form.getAttribute('action') || '/checkout/cart/updatePost/', location.origin).href;
    const res = await fetch(action, { method: 'POST', body: fd, credentials: 'same-origin', redirect: 'follow' });
    await res.text();
    out.post_status = res.status;

    const doc2 = parse(await (await fetch('/checkout/cart/', { credentials: 'same-origin', cache: 'no-store' })).text());
    const after = qtyRows(doc2).find((r) => r.name === TARGET);
    out.updated = !!after && after.quantity === WANTED;
    if (!out.updated) {
      out.error = 'the cart read-back does not show this product at quantity ' + WANTED;
    }
    return out;
  }
  return await main();
`;

export async function run() {
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
    const cart = browser.exec(cartReadScript, { timeout: "2m" });
    return {
      wishlist_items: [],
      added: [],
      cart_items: cart.items,
      error: "the wish list at /wishlist/ holds no items",
    };
  }

  // 2) the page's own Add All to Cart button, which puts the items in at the listed quantities
  browser.click('button.action.tocart[title="Add All to Cart"]');
  browser.waitFor("document.readyState === 'complete'", { timeoutMs: 15000 });

  // 3) the cart page read-back. The store answers the button with a reload onto the wish list
  // view, so the cart page is what shows what the button did; the cart keeps items from earlier
  // visits, so it can hold more lines than the wish list.
  const cart = browser.exec(cartReadScript, { timeout: "2m" });

  // 4) every wish-list item the button left out, or left at another quantity, is put right: an
  // item with no cart row is added on its own product page at the listed quantity, and an item
  // the cart already holds at another quantity has its row set to the listed quantity through
  // the cart's own update form - an add would raise that row further instead of setting it.
  const added = wishlistItems.map((item) => {
    const row = cart.items.find((r) => r.name === item.name);
    if (row && row.quantity === item.quantity) {
      return {
        product: item.name,
        quantity: item.quantity,
        via: "wish list button",
        option_used: null,
        added_to_cart: true,
      };
    }
    if (row) {
      const res = browser.exec(setCartQtyScript(item.name, item.quantity), { timeout: "2m" });
      return {
        product: item.name,
        quantity: item.quantity,
        via: "cart update",
        option_used: null,
        added_to_cart: !!res.updated,
        error: res.error || undefined,
      };
    }
    const res = browser.exec(addOneScript(item.name, item.quantity), { timeout: "2m" });
    return {
      product: item.name,
      quantity: item.quantity,
      via: "product page",
      option_used: res.option_used || null,
      added_to_cart: false,
      error: res.error || undefined,
    };
  });

  // 5) the cart page is opened and read, so the result shows the cart and the browser is left on
  // it; every wish-list item must show at exactly the quantity the wish list lists.
  browser.open("/checkout/cart/");
  browser.waitFor(
    'document.querySelector(\'input[data-role=cart-item-qty], input[name^="cart["], .cart-empty\')',
    { timeoutMs: 30000 }
  );
  const shown = browser.exec(`
    const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
    const inputs = [...document.querySelectorAll('input[data-role=cart-item-qty], input.qty, input[name^="cart["]')];
    const rows = inputs
      .map((input) => {
        const row = input.closest('tr') || input.closest('.item');
        const nameEl = row ? row.querySelector('.product-item-name') : null;
        return { name: nameEl ? norm(nameEl.textContent) : '', quantity: norm(input.value) };
      })
      .filter((r) => r.name);
    const out = { items: rows };
    return out;
  `);
  const lines = shown.items;

  const short = [];
  for (const item of wishlistItems) {
    const row = lines.find((r) => r.name === item.name);
    const ok = !!row && row.quantity === item.quantity;
    const entry = added.find((e) => e.product === item.name);
    if (entry) entry.added_to_cart = ok;
    if (!ok) short.push(item.name + " at quantity " + item.quantity);
  }

  return {
    wishlist_items: wishlistItems,
    added: added,
    cart_items: lines,
    error: short.length
      ? "not every wish-list item is in the cart at the quantity the wish list lists: " +
        short.join("; ")
      : null,
  };
}

runApi(import.meta.url, meta, run);
