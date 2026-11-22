import { browser, runApi } from "./skillweaver-api.mjs";

export const meta = {
  name: "add_product_to_wishlist",
  description:
    "Add one product, found by its exact name, to the shopper's wish list, and read the wish list " +
    "back so the result confirms the product is in it. The product is located through the store's " +
    "quick search at /catalogsearch/result/, trying the full name, the name without a trailing " +
    "parenthesised part, and its first five words until a result link's name matches exactly. On the " +
    "product page the Add to Wish List control is an anchor with class 'action towishlist' whose href " +
    "is only '#': it carries the request it makes in a data-post attribute naming /wishlist/index/add/ " +
    "as the action and passing the product's internal id together with uenc, a base64-encoded return " +
    "URL, and that request is posted as the control carries it - with the product page's own form key " +
    "added when the page exposes one, from a page on the store's origin - the same way the library's " +
    "cart APIs post the store's requests rather than clicking them. Three things are unexpected but " +
    "important. Activating the control reloads the page onto the shopper's wish list view at " +
    "/wishlist/index/index/wishlist_id/<id>/ rather than back to the product page, and the store's " +
    "confirmation is a one-time banner '<product name> has been added to your Wish List. Click here to " +
    "continue shopping.' rendered on that landing page; because the banner is consumed by the page that " +
    "shows it, the wish list page read-back that follows is the reliable confirmation that the product " +
    "is listed. The wish list page is headed 'My Wish List', reports its item count ('1 Item'), and " +
    "lists each product with its name link, its price and a Qty field beside per-item Add to Cart, Edit " +
    "and Remove item controls. And the wish list keeps items from earlier visits, so wishlist_items can " +
    "list more than what this call added.",
  params: {
    product_name: {
      type: "string",
      description:
        "The product's name exactly as the store shows it, e.g. \"Q Mixers Premium Ginger Ale: Real Ingredients & Less Sweet, 6.7 Fl Oz (24 Bottles)\".",
    },
  },
  returns:
    "An object: product (the name searched for), added (true when the wish list read-back lists this " +
    "product), product_url (the product page used, or null), message (the store's own confirmation " +
    "banner from the landing page, or null when it showed none), wishlist_url (the wish list page read " +
    "back, or null), item_count (the number of items the wish list page reports, or null), " +
    "wishlist_items (the wish list's lines as {name, price, quantity}, or null when the product could " +
    "not be found or its page has no Add to Wish List control), and error (a short reason when added is " +
    "false).",
  usage_log: [
    "iter_16: product_name 'Q Mixers Premium Ginger Ale: Real Ingredients & Less Sweet, 6.7 Fl Oz (24 " +
      "Bottles)' - the procedure was carried out step by step with the agent browser (no registered API " +
      "covered a wish-list add): the product was found in the homepage's Product Showcases row and its " +
      "product page opened; the page's Add to Wish List control (a.action.towishlist) carried a " +
      "data-post to /wishlist/index/add/ for product 104493 with a base64 uenc of the product page's " +
      "URL; a trusted click on it reloaded the page onto /wishlist/index/index/wishlist_id/5/, where " +
      "the store showed 'Q Mixers Premium Ginger Ale: Real Ingredients & Less Sweet, 6.7 Fl Oz (24 " +
      "Bottles) has been added to your Wish List.'; the read-back showed 'My Wish List / 1 Item' with " +
      "the product listed at $68.50 beside Qty, Edit/Remove item and Update Wish List controls, and " +
      "the header read 'My Wish List 1 item'.",
  ],
};

export async function run({ product_name }) {
  browser.open("/");

  const wishlistScript = `
    async function main() {
      const NAME = ${JSON.stringify(product_name)};
      const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
      const parse = (html) => new DOMParser().parseFromString(html, 'text/html');
      const out = { ok: false, product_url: null, wishlist_url: null, message: null, error: null };

      // 1) the product's page, from the store's quick search, with the library's fallbacks
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

      // 2) the Add to Wish List control and the request it carries
      const pdoc = parse(await (await fetch(productUrl)).text());
      const control = pdoc.querySelector('a.action.towishlist');
      if (!control) {
        out.error = 'the product page has no Add to Wish List control';
        return out;
      }
      let post = null;
      try { post = JSON.parse(control.getAttribute('data-post') || ''); } catch (e) { post = null; }
      if (!post || !post.action) {
        out.error = 'the Add to Wish List control carries no request to post';
        return out;
      }

      // 3) the request posted as the control carries it, the way the library's cart APIs post
      // the store's requests, with the page's own form key added when the page exposes one
      const fd = new URLSearchParams();
      const data = post.data || {};
      for (const key of Object.keys(data)) fd.append(key, String(data[key]));
      const formKey = pdoc.querySelector('input[name="form_key"]');
      if (formKey && formKey.value && !fd.has('form_key')) fd.append('form_key', formKey.value);
      const res = await fetch(post.action, { method: 'POST', body: fd, credentials: 'same-origin', redirect: 'follow' });
      const landing = parse(await res.text());
      out.wishlist_url = res.url || null;

      // 4) the store's own confirmation on the page the request lands on
      const banners = [...landing.querySelectorAll('.message')]
        .map((m) => norm(m.textContent))
        .filter((t) => /added to your Wish List/i.test(t))
        .sort((a, b) => a.length - b.length);
      out.message = banners.length ? banners[0] : null;
      out.ok = true;
      return out;
    }
    return await main();
  `;
  const added = browser.exec(wishlistScript, { timeout: "2m" });

  if (!added.ok) {
    return {
      product: product_name,
      added: false,
      product_url: added.product_url || null,
      message: null,
      wishlist_url: null,
      item_count: null,
      wishlist_items: null,
      error: added.error,
    };
  }

  // the wish list page the add landed on, or the wish list itself when it landed elsewhere
  const readUrl =
    added.wishlist_url && /\/wishlist/.test(added.wishlist_url) ? added.wishlist_url : "/wishlist/";
  const readBackScript = `
    async function main() {
      const URL = ${JSON.stringify(readUrl)};
      const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
      const doc = new DOMParser().parseFromString(await (await fetch(URL)).text(), 'text/html');
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
      const out = {
        url: URL,
        items: items,
        item_count: m ? Number(m[1].replace(/,/g, '')) : null,
      };
      return out;
    }
    return await main();
  `;
  const readBack = browser.exec(readBackScript, { timeout: "2m" });
  const items = readBack.items || [];
  const line =
    items.find((i) => i.name === product_name) ||
    items.find((i) => String(i.name).toLowerCase() === product_name.toLowerCase()) ||
    null;

  return {
    product: product_name,
    added: line !== null,
    product_url: added.product_url || null,
    message: added.message || null,
    wishlist_url: readBack.url || null,
    item_count: readBack.item_count,
    wishlist_items: items,
    error: line !== null ? null : "the wish list page does not list this product after the add",
  };
}

runApi(import.meta.url, meta, run);
