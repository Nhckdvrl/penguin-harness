import { browser, runApi } from "./skillweaver-api.mjs";

export const meta = {
  name: "move_cart_item_to_wishlist",
  description:
    "Move one product, named exactly as the store shows it, from the shopping cart to the shopper's " +
    "wish list, and read both pages back so the result confirms the item is no longer in the cart and " +
    "is now listed in the wish list. " +
    "When the product is not in the cart it is added first - located through the store's quick search " +
    "at /catalogsearch/result/ (trying the full name, the name without a trailing parenthesised part " +
    "and its first five words) and its product page's own add-to-cart form then posted with quantity 1 " +
    "and any required custom-option choice - so the call always has something to move. " +
    "The cart page at /checkout/cart/ holds one row per item as a tr.item-info element, and the row's " +
    "Move to Wishlist control sits in the page's own action row outside it: it is an anchor with class " +
    "'action towishlist' (also 'use-ajax action-towishlist') whose href is only '#' and which carries " +
    "the request it makes in a data-post attribute naming /wishlist/index/fromcart/ and passing the " +
    "cart item id together with uenc, a base64-encoded return URL; that id is the same one embedded in " +
    "the row's quantity input name (cart[<item>][qty]), which is how a row is tied to its own Move to " +
    "Wishlist link, and the id is read fresh on every call because the store's own ids grow as items " +
    "are added and change when the cart is rebuilt. " +
    "The request the link carries is posted as it stands, with the cart page's own form key added when " +
    "the page exposes one, from a page on the store's origin - the same way the library's wish-list and " +
    "cart-delete APIs post the store's '#'-href controls rather than clicking them. " +
    "Four things are unexpected but important. " +
    "The store answers the post with a redirect back to the cart page, and that landing page carries a " +
    "one-time confirmation '<product name> has been moved to your wish list.' with a 'Click here to " +
    "continue shopping.' link; the banner is shown once and then gone, so the cart page read-back " +
    "after it is the reliable confirmation that the row is gone, and when the moved item was the cart's " +
    "only one that page also reads 'You have no items in your shopping cart.' with the mini-cart at 0. " +
    "The move adds to the wish list rather than replacing it, so the wish list page - headed 'My Wish " +
    "List' with its item count ('3 Item(s)') - lists the product beside whatever it already held. " +
    "The header's wish list count is refreshed with a page load and can lag behind the wish list " +
    "page's own count, so the page's count is the reliable one. " +
    "And the wish list keeps items from earlier visits, so wishlist_items can list more than what this " +
    "call moved.",
  params: {
    product_name: {
      type: "string",
      description:
        "The product's name exactly as the store shows it, e.g. \"Pre-baked Gingerbread House Kit Value Pack, 17 oz., Pack of 2, Total 34 oz.\".",
    },
  },
  returns:
    "An object: product (the name searched for), was_added (true when this call had to add the " +
    "product to the cart before moving it), product_url (the product page used for that add, or null " +
    "when no add was needed), option_used (the label of the custom-option choice posted with that add, " +
    "or null when it needed none and when no add was needed), moved (true when the cart read-back after " +
    "the move no longer lists the product), message (the store's own confirmation banner from the page " +
    "the move landed on, or null when it showed none), in_wishlist (true when the wish list read-back " +
    "lists the product), item_count (the number of items the wish list page reports, or null), " +
    "cart_items (the cart's lines as {name, quantity} in page order after the move, or null when the " +
    "cart page could not be read), wishlist_items (the wish list's lines as {name, price, quantity} in " +
    "page order, or null when the wish list page could not be read), and error (a short reason when " +
    "moved or in_wishlist is false, otherwise null).",
  usage_log: [
    "iter_26: product_name 'Pre-baked Gingerbread House Kit Value Pack, 17 oz., Pack of 2, Total 34 oz.' - the procedure was carried out step by step with the agent browser (the registered add_product_to_cart API added the product at quantity 1 with no required custom option, and no registered API covered moving a cart item to the wish list): the cart page at /checkout/cart/ showed the product at $19.99 with its quantity input named cart[578][qty], and the row's Move to Wishlist control (an a.action.towishlist anchor, also 'use-ajax action-towishlist', href '#') carried a data-post to /wishlist/index/fromcart/ with item 578 and a base64 uenc of the cart page URL; a trusted click on it reloaded the cart page, which read 'Pre-baked Gingerbread House Kit Value Pack, 17 oz., Pack of 2, Total 34 oz. has been moved to your wish list.' followed by 'You have no items in your shopping cart.' with the mini-cart at 0; the wish list page at /wishlist/ then read 'My Wish List / 3 Item(s)' and listed the product at $19.99 with its Comment and Qty fields beside per-item controls, the other two items being ones the wish list already held.",
  ],
};

// Read the cart page and report whether the named product is in it, as {name, quantity} lines.
const cartReadScript = (name) => `
  async function main() {
    const NAME = ${JSON.stringify(name)};
    const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
    const doc = new DOMParser().parseFromString(
      await (await fetch('/checkout/cart/')).text(),
      'text/html'
    );
    const rows = [...doc.querySelectorAll('tr.item-info')].map((tr) => {
      const nameEl = tr.querySelector('.product-item-name');
      const q = tr.querySelector('input.qty, input[data-role=cart-item-qty], input[name^="cart["]');
      return {
        name: nameEl ? norm(nameEl.textContent) : '',
        quantity: q ? norm(q.value) : null,
      };
    }).filter((r) => r.name);
    const line =
      rows.find((r) => r.name === NAME) ||
      rows.find((r) => r.name.toLowerCase() === NAME.toLowerCase()) ||
      null;
    const out = {
      found: line !== null,
      cart_items: rows.map((r) => ({ name: r.name, quantity: r.quantity })),
    };
    return out;
  }
  return await main();
`;

// Add the named product at quantity 1, the way the library's add APIs do it: the product's
// page is found through the quick search and its own add-to-cart form is posted.
const addScript = (name) => `
  async function main() {
    const NAME = ${JSON.stringify(name)};
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
    if (!productUrl) {
      const out = { ok: false, error: 'the product was not found through the store quick search', product_url: null };
      return out;
    }
    const pdoc = parse(await (await fetch(productUrl)).text());
    const form = pdoc.querySelector('form#product_addtocart_form');
    if (!form) {
      const out = { ok: false, error: 'the product page has no add-to-cart form', product_url: productUrl };
      return out;
    }
    const action = form.getAttribute('action');
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
    let optionUsed = null;
    for (const gname of Object.keys(groups)) {
      const controls = groups[gname];
      if (!controls.length) continue;
      if (controls[0].tagName === 'SELECT') {
        const opts = [...controls[0].querySelectorAll('option')].filter((o) => o.value);
        const pick = opts[0];
        if (!pick) continue;
        fd.append(gname, pick.value);
        optionUsed = norm(pick.textContent);
      } else {
        fd.append(gname, controls[0].value);
        optionUsed = labelOf(controls[0]);
      }
    }
    fd.set('qty', '1');
    const res = await fetch(action, { method: 'POST', body: fd, credentials: 'same-origin', redirect: 'follow' });
    await res.text();
    const out = { ok: true, product_url: productUrl, option_used: optionUsed };
    return out;
  }
  return await main();
`;

// Post the Move to Wishlist request the named row's own link carries. The row is tied to that
// link through the cart item id in the quantity input's name, because the link sits in the
// page's own action row outside the row.
const moveScript = (name) => `
  async function main() {
    const NAME = ${JSON.stringify(name)};
    const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
    const doc = new DOMParser().parseFromString(
      await (await fetch('/checkout/cart/')).text(),
      'text/html'
    );
    const links = [...doc.querySelectorAll('a.action.towishlist')].map((a) => {
      let post = null;
      try {
        post = JSON.parse(a.getAttribute('data-post') || '');
      } catch (e) {
        post = null;
      }
      return { link: a, post: post };
    });
    const rows = [...doc.querySelectorAll('tr.item-info')].map((tr) => {
      const nameEl = tr.querySelector('.product-item-name');
      const q = tr.querySelector('input.qty, input[data-role=cart-item-qty], input[name^="cart["]');
      let itemId = null;
      if (q && q.name) {
        const m = /^cart\\[(\\d+)\\]\\[qty\\]$/.exec(q.name);
        if (m) itemId = m[1];
      }
      return { name: nameEl ? norm(nameEl.textContent) : '', itemId: itemId, row: tr };
    });
    const row =
      rows.find((r) => r.name === NAME) ||
      rows.find((r) => r.name.toLowerCase() === NAME.toLowerCase()) ||
      null;
    if (row === null) {
      const out = { ok: false, error: 'the cart page does not list this product any more' };
      return out;
    }
    let match = null;
    if (row.itemId !== null) {
      match = links.find((l) => l.post && l.post.data && String(l.post.data.item) === row.itemId) || null;
    }
    if (match === null) {
      // the link sits outside the row: the smallest ancestor holding exactly one of them
      let node = row.row;
      while (node && node !== doc.body) {
        if (node.querySelectorAll && node.querySelectorAll('a.action.towishlist').length === 1) {
          match = links.find((l) => node.contains(l.link)) || null;
          break;
        }
        node = node.parentElement;
      }
    }
    const post = match ? match.post : null;
    if (!post || !post.action) {
      const out = { ok: false, error: 'the cart row carries no Move to Wishlist request to post' };
      return out;
    }
    const fd = new URLSearchParams();
    const data = post.data || {};
    for (const key of Object.keys(data)) fd.append(key, String(data[key]));
    const formKey = doc.querySelector('input[name="form_key"]');
    if (formKey && formKey.value && !fd.has('form_key')) fd.append('form_key', formKey.value);
    const res = await fetch(post.action, { method: 'POST', body: fd, credentials: 'same-origin', redirect: 'follow' });
    const landing = new DOMParser().parseFromString(await res.text(), 'text/html');
    const banners = [...landing.querySelectorAll('.message')]
      .map((m) => norm(m.textContent))
      .filter((t) => /moved to your wish list/i.test(t))
      .sort((a, b) => a.length - b.length);
    const out = {
      ok: res.ok,
      status: res.status,
      message: banners.length ? banners[0] : null,
    };
    return out;
  }
  return await main();
`;

// Read the wish list page and report whether the named product is listed in it.
const wishlistReadScript = (name) => `
  async function main() {
    const NAME = ${JSON.stringify(name)};
    const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
    const doc = new DOMParser().parseFromString(
      await (await fetch('/wishlist/')).text(),
      'text/html'
    );
    let blocks = [...doc.querySelectorAll('#wishlist-view-form .product-item')];
    if (!blocks.length) blocks = [...doc.querySelectorAll('ol.product-items > li.product-item')];
    if (!blocks.length) blocks = [...doc.querySelectorAll('.products-grid .product-item')];
    const items = blocks.map((el) => {
      const n = el.querySelector('.product-item-name');
      const p = el.querySelector('.price');
      const q = el.querySelector('input.qty, .qty input');
      return {
        name: n ? norm(n.textContent) : null,
        price: p ? norm(p.textContent) : null,
        quantity: q ? norm(q.value) : null,
      };
    });
    const view = doc.querySelector('#wishlist-view-form');
    const viewText = norm(view ? view.textContent : '');
    const m = viewText.match(/(\\d[\\d,]*)\\s+Items?\\b/i) ||
      norm(doc.body ? doc.body.textContent : '').match(/My Wish List\\s+(\\d[\\d,]*)\\s+Items?/i);
    const line =
      items.find((i) => i.name === NAME) ||
      items.find((i) => String(i.name).toLowerCase() === NAME.toLowerCase()) ||
      null;
    const out = {
      found: line !== null,
      items: items,
      item_count: m ? Number(m[1].replace(/,/g, '')) : null,
    };
    return out;
  }
  return await main();
`;

export async function run({ product_name }) {
  browser.open("/checkout/cart/");
  browser.waitFor(
    "location.pathname.indexOf('/checkout/cart/') !== -1 && document.readyState === 'complete'"
  );

  let state = browser.exec(cartReadScript(product_name), { timeout: "2m" });
  let wasAdded = false;
  let productUrl = null;
  let optionUsed = null;

  if (!state.found) {
    const added = browser.exec(addScript(product_name), { timeout: "2m" });
    if (!added.ok) {
      return {
        product: product_name,
        was_added: false,
        product_url: added.product_url || null,
        option_used: null,
        moved: false,
        message: null,
        in_wishlist: false,
        item_count: null,
        cart_items: state.cart_items,
        wishlist_items: null,
        error: added.error,
      };
    }
    wasAdded = true;
    productUrl = added.product_url || null;
    optionUsed = added.option_used || null;
    state = browser.exec(cartReadScript(product_name), { timeout: "2m" });
  }

  if (!state.found) {
    return {
      product: product_name,
      was_added: wasAdded,
      product_url: productUrl,
      option_used: optionUsed,
      moved: false,
      message: null,
      in_wishlist: false,
      item_count: null,
      cart_items: state.cart_items,
      wishlist_items: null,
      error: "The cart page does not list '" + product_name + "', so there is nothing to move.",
    };
  }

  const moved = browser.exec(moveScript(product_name), { timeout: "2m" });
  if (!moved.ok) {
    return {
      product: product_name,
      was_added: wasAdded,
      product_url: productUrl,
      option_used: optionUsed,
      moved: false,
      message: null,
      in_wishlist: false,
      item_count: null,
      cart_items: state.cart_items,
      wishlist_items: null,
      error: moved.error,
    };
  }

  const after = browser.exec(cartReadScript(product_name), { timeout: "2m" });
  const wishlist = browser.exec(wishlistReadScript(product_name), { timeout: "2m" });

  const isMoved = !after.found;
  const isListed = wishlist.found === true;

  let error = null;
  if (!isMoved) {
    error = "The cart read-back still lists '" + product_name + "' after the move.";
  } else if (!isListed) {
    error = "The wish list page does not list '" + product_name + "' after the move.";
  }

  return {
    product: product_name,
    was_added: wasAdded,
    product_url: productUrl,
    option_used: optionUsed,
    moved: isMoved,
    message: moved.message || null,
    in_wishlist: isListed,
    item_count: wishlist.item_count,
    cart_items: after.cart_items,
    wishlist_items: wishlist.items,
    error: error,
  };
}

runApi(import.meta.url, meta, run);
