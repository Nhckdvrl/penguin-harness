import { browser, runApi } from "./skillweaver-api.mjs";

export const meta = {
  name: "remove_product_from_cart",
  description:
    "Remove one product, named exactly as the store shows it, from the shopping cart, and read the cart page back so the result confirms the product is no longer in it. " +
    "When the product is not in the cart it is added first - located through the store's quick search at /catalogsearch/result/ (trying the full name, the name without a trailing parenthesised part and its first five words) and its product page's own add-to-cart form then posted with quantity 1 and any required custom-option choice - so the call always has something to remove. " +
    "The cart page at /checkout/cart/ holds one row per item as a tr.item-info element with four cells only (item, price, qty, subtotal), and the row's action controls are not inside it: Edit, Move to Wishlist and Remove item sit in the page's own action row outside the item row, so a row cannot be removed by looking for a link inside it. " +
    "The remove control is an a.action.action-delete link whose href is only '#' and which carries the request it makes in a data-post attribute naming /checkout/cart/delete/ together with the cart item id; that id is the same one embedded in the row's quantity input name (cart[<item>][qty]), which is how a row is tied to its own remove link. The id is the store's own, it grows as items are added and it changes when the cart is rebuilt, so it is read fresh on every call and never assumed from an earlier one. " +
    "Three things are unexpected but important. The store answers the delete post with a redirect back to the cart page and no success or error message of its own, so the read-back after it is the only reliable confirmation. And the cart keeps items from earlier visits, so cart_items can list more lines than this call touched. " +
    "The request the link carries is posted as it stands, with the cart page's own form key added when the page exposes one, from a page on the store's origin - the same way the library's add APIs post the store's forms rather than clicking them.",
  params: {
    product_name: {
      type: "string",
      description:
        "The product's name exactly as the store shows it, e.g. \"Pre-baked Gingerbread House Kit Value Pack, 17 oz., Pack of 2, Total 34 oz.\".",
    },
  },
  returns:
    "An object: product (the name searched for), was_added (true when this call had to add the product to the cart before removing it), product_url (the product page used for that add, or null when no add was needed), option_used (the label of the custom-option choice posted with that add, or null when it needed none and when no add was needed), removed (true when the cart read-back no longer lists the product), cart_items (the cart's lines as {name, quantity} in page order after the removal, or null when the cart page could not be read), and error (a short reason when removed is false).",
  usage_log: [
    "iter_14: product_name 'Pre-baked Gingerbread House Kit Value Pack, 17 oz., Pack of 2, Total 34 oz.' - the procedure was carried out step by step with the agent browser (no registered API covered a cart removal): the cart at /checkout/cart/ held 10 rows for 5 distinct products and did not contain the product, so it was added first through the store's quick search and its product page's add-to-cart form with qty 1 and no required custom option; the cart then held 6 rows with the gingerbread kit at quantity 1, its quantity input named cart[568][qty], and the Remove item link carrying data-post id 568 posted /checkout/cart/delete/ and left the five original rows only. Each item row turned out to have four cells - item, price, qty, subtotal - with its Remove item link outside the row in the page's own action row, which is why the row is matched to its link through the cart item id in the quantity input's name.",
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
      const q = tr.querySelector('input.qty, input[data-role=cart-item-qty]');
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

// Post the remove request the named row's own delete link carries. The row is tied to that
// link through the cart item id in the quantity input's name, because the link is not in the row.
const removeScript = (name) => `
  async function main() {
    const NAME = ${JSON.stringify(name)};
    const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
    const doc = new DOMParser().parseFromString(
      await (await fetch('/checkout/cart/')).text(),
      'text/html'
    );
    const dels = [...doc.querySelectorAll('a.action.action-delete')].map((a) => {
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
      const q = tr.querySelector('input.qty, input[data-role=cart-item-qty]');
      let itemId = null;
      if (q && q.name) {
        const m = /^cart\\[(\\d+)\\]\\[qty\\]$/.exec(q.name);
        if (m) itemId = m[1];
      }
      let del = null;
      if (itemId !== null) {
        del = dels.find((d) => d.post && d.post.data && String(d.post.data.id) === itemId) || null;
      }
      if (del === null) {
        // the link sits outside the row: the smallest ancestor holding exactly one of them
        let node = tr;
        while (node && node !== doc.body) {
          if (node.querySelectorAll && node.querySelectorAll('a.action.action-delete').length === 1) {
            del = dels.find((d) => node.contains(d.link)) || null;
            break;
          }
          node = node.parentElement;
        }
      }
      return { name: nameEl ? norm(nameEl.textContent) : '', itemId: itemId, del: del };
    });
    const row =
      rows.find((r) => r.name === NAME) ||
      rows.find((r) => r.name.toLowerCase() === NAME.toLowerCase()) ||
      null;
    if (row === null) {
      const out = { ok: false, error: 'the cart page does not list this product any more' };
      return out;
    }
    const post = row.del ? row.del.post : null;
    if (!post || !post.action) {
      const out = { ok: false, error: 'the cart row carries no remove request to post' };
      return out;
    }
    const fd = new URLSearchParams();
    const data = post.data || {};
    for (const key of Object.keys(data)) fd.append(key, String(data[key]));
    const formKey = doc.querySelector('input[name="form_key"]');
    if (formKey && formKey.value && !fd.has('form_key')) fd.append('form_key', formKey.value);
    const res = await fetch(post.action, { method: 'POST', body: fd, credentials: 'same-origin', redirect: 'follow' });
    await res.text();
    const out = { ok: res.ok, status: res.status, item_id: row.itemId };
    return out;
  }
  return await main();
`;

export async function run({ product_name }) {
  browser.open("/checkout/cart/");
  browser.waitFor("location.pathname.indexOf('/checkout/cart/') !== -1 && document.readyState === 'complete'");

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
        removed: false,
        cart_items: state.cart_items,
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
      removed: false,
      cart_items: state.cart_items,
      error: "The cart page does not list '" + product_name + "', so there is nothing to remove.",
    };
  }

  const removed = browser.exec(removeScript(product_name), { timeout: "2m" });
  const after = browser.exec(cartReadScript(product_name), { timeout: "2m" });
  const gone = !after.found;

  return {
    product: product_name,
    was_added: wasAdded,
    product_url: productUrl,
    option_used: optionUsed,
    removed: gone && removed.ok,
    cart_items: after.cart_items,
    error: !removed.ok
      ? removed.error
      : gone
        ? null
        : "The cart read-back still lists '" + product_name + "' after the removal.",
  };
}

runApi(import.meta.url, meta, run);
