import { browser, runApi } from "./skillweaver-api.mjs";

export const meta = {
  name: "remove_product_from_wishlist",
  description:
    "Remove one product, named exactly as the store shows it, from the shopper's wish list, and read " +
    "the wish list page back so the result confirms the product is no longer listed in it. " +
    "The wish list page at /wishlist/ is opened and read for its lines: the page is headed 'My Wish " +
    "List' and reports its item count ('1 Item'), and each line is a product block carrying the " +
    "product's name link, its price, a Comment field and a Qty input whose names embed the line's own " +
    "wishlist item number (description[<item>], qty[<item>]), beside that line's own Add to Cart, Edit " +
    "and Remove item controls. The lines are read from the wish list's own view form, because the " +
    "page's footer also carries a 'Recently Ordered' block of previously ordered products whose blocks " +
    "use the same product-item classes and would otherwise be mistaken for wish-list lines. " +
    "The Remove item control is an anchor with class 'btn-remove action delete' whose href is only '#' " +
    "and which carries the request it makes in a data-post attribute naming /wishlist/index/remove/ " +
    "and passing the line's wishlist item number as item together with uenc; the line is tied to its " +
    "own control through that item number, the same one in the line's Qty input name. The request the " +
    "link carries is posted as it stands, with the wish list page's own form key added when the page " +
    "exposes one, from a page on the store's origin - the same way the library's cart and wish-list " +
    "APIs post the store's '#'-href controls rather than clicking them. " +
    "Four things are unexpected but important. " +
    "The store answers the post with a reload of the wish list page that carries a one-time " +
    "confirmation '<product name> has been removed from your Wish List.'; the banner is shown once and " +
    "then gone, so the wish list page read-back that follows is the reliable confirmation that the " +
    "product is no longer listed - an emptied wish list then reads 'You have no items in your wish " +
    "list.' and reports no item count. " +
    "A product the wish list does not list has nothing to remove and is reported with an error rather " +
    "than added first, since the shopper asked for a removal and an add would change the wish list if " +
    "the removal then failed. " +
    "A product the wish list lists on several lines is taken out line by line - one remove request per " +
    "pass, a bounded number of passes - until the read-back no longer lists it. " +
    "And the wish list keeps items from earlier visits, so wishlist_items can list more lines than " +
    "this call touched.",
  params: {
    product_name: {
      type: "string",
      description:
        "The product's name exactly as the store shows it, e.g. \"Stove Top Turkey Stuffing Mix (12 oz Boxes, Pack of 2)\".",
    },
  },
  returns:
    "An object: product (the name searched for), removed (true when the wish list read-back no longer " +
    "lists the product), item_id (the wishlist item number the removed line carried, or null), message " +
    "(the store's own confirmation banner from the page the removal landed on, or null when it showed " +
    "none), wishlist_url (the wish list page read back, or null), item_count (the number of items the " +
    "wish list page reports, or null when it reports none), wishlist_items (the wish list's remaining " +
    "lines as {name, price, quantity} in page order, which can include items from earlier visits), " +
    "and error (a short reason when the product was not listed, its line carried no remove request, or " +
    "the read-back still lists it - otherwise null).",
  usage_log: [
    "iter_37: product_name 'Stove Top Turkey Stuffing Mix (12 oz Boxes, Pack of 2)' - the procedure " +
      "was carried out step by step with the agent browser (no registered API covered a wish-list " +
      "removal): the wish list at /wishlist/ read 'My Wish List / 1 Item' and held the product at " +
      "$8.49 with its Comment and Qty fields (description[4], qty[4]) beside Add to Cart, Edit and " +
      "Remove item controls; the Remove item control (an a.btn-remove.action.delete anchor whose href " +
      "is only '#') carried a data-post to /wishlist/index/remove/ with item 4 and an empty uenc; a " +
      "trusted click on it reloaded the page, which then showed the one-time banner 'Stove Top Turkey " +
      "Stuffing Mix (12 oz Boxes, Pack of 2) has been removed from your Wish List.' and read 'My Wish " +
      "List' with 'You have no items in your wish list.', the header's item count gone as well. A page " +
      "read taken before the click had matched eight .product-item blocks, seven of them from the " +
      "page's footer 'Recently Ordered' block rather than the wish list, which is why the lines are " +
      "now read from the wish list's own view form and recognised by their Comment and Qty fields.",
  ],
};

// Read the wish list page and report its lines as {name, price, quantity}, the count the page
// reports, and whether the named product is listed.
const wishlistReadScript = (name) => `
  async function main() {
    const NAME = ${JSON.stringify(name)};
    const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
    const doc = new DOMParser().parseFromString(
      await (await fetch('/wishlist/')).text(),
      'text/html'
    );
    let blocks = [...doc.querySelectorAll('#wishlist-view-form .product-item')];
    if (!blocks.length) {
      // the page's footer 'Recently Ordered' block uses the same product blocks, so a
      // wish-list line is recognised by its own Comment and Qty fields
      blocks = [...doc.querySelectorAll('.product-item')].filter((el) =>
        el.querySelector('input[name^="qty["], textarea[name^="description["]')
      );
    }
    const lines = blocks.map((el) => {
      const n = el.querySelector('.product-item-name');
      const p = el.querySelector('.price');
      const q = el.querySelector('input[name^="qty["]');
      return {
        name: n ? norm(n.textContent) : null,
        price: p ? norm(p.textContent) : null,
        quantity: q ? norm(q.value) : null,
      };
    });
    const view = doc.querySelector('#wishlist-view-form');
    const viewText = norm(view ? view.textContent : '');
    const bodyText = norm(doc.body ? doc.body.textContent : '');
    let itemCount = null;
    const m = viewText.match(/(\\d[\\d,]*)\\s+Items?\\b/i) ||
      bodyText.match(/My Wish List\\s+(\\d[\\d,]*)\\s+Items?/i);
    if (m) {
      itemCount = Number(m[1].replace(/,/g, ''));
    } else if (/You have no items in your wish list/i.test(viewText || bodyText)) {
      itemCount = 0;
    }
    const line =
      lines.find((l) => l.name === NAME) ||
      lines.find((l) => String(l.name).toLowerCase() === NAME.toLowerCase()) ||
      null;
    const out = {
      found: line !== null,
      url: '/wishlist/',
      items: lines,
      item_count: itemCount,
    };
    return out;
  }
  return await main();
`;

// Post the remove request the named line's own control carries. The line is tied to that
// control through the wishlist item number in its Qty input's name, the same way the library's
// cart APIs tie a row to its own delete or Move to Wishlist link.
const removeScript = (name) => `
  async function main() {
    const NAME = ${JSON.stringify(name)};
    const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
    const doc = new DOMParser().parseFromString(
      await (await fetch('/wishlist/')).text(),
      'text/html'
    );
    let blocks = [...doc.querySelectorAll('#wishlist-view-form .product-item')];
    if (!blocks.length) {
      blocks = [...doc.querySelectorAll('.product-item')].filter((el) =>
        el.querySelector('input[name^="qty["], textarea[name^="description["]')
      );
    }
    const lines = blocks.map((el) => {
      const n = el.querySelector('.product-item-name');
      const q = el.querySelector('input[name^="qty["]');
      let itemId = null;
      if (q && q.name) {
        const m = /^qty\\[(\\d+)\\]$/.exec(q.name);
        if (m) itemId = m[1];
      }
      let link = el.querySelector('a.btn-remove.action.delete');
      if (!link) {
        link = [...el.querySelectorAll('a[data-post]')].find((a) =>
          /\\/wishlist\\/index\\/remove\\//.test(a.getAttribute('data-post') || '')
        ) || null;
      }
      let post = null;
      if (link) {
        try { post = JSON.parse(link.getAttribute('data-post') || ''); } catch (e) { post = null; }
      }
      return { name: n ? norm(n.textContent) : '', itemId: itemId, post: post };
    });
    const line =
      lines.find((l) => l.name === NAME) ||
      lines.find((l) => l.name.toLowerCase() === NAME.toLowerCase()) ||
      null;
    if (line === null) {
      const out = { ok: false, error: 'the wish list does not list this product any more' };
      return out;
    }
    let post = line.post;
    if (!post || !post.action) {
      // the control can sit outside the block: match it through the line's item number
      const links = [...doc.querySelectorAll('a[data-post]')].map((a) => {
        let p = null;
        try { p = JSON.parse(a.getAttribute('data-post') || ''); } catch (e) { p = null; }
        return { post: p };
      }).filter((l) => l.post && /\\/wishlist\\/index\\/remove\\//.test(l.post.action || ''));
      const match = line.itemId !== null
        ? links.find((l) => l.post.data && String(l.post.data.item) === line.itemId) || null
        : null;
      post = match ? match.post : null;
    }
    if (!post || !post.action) {
      const out = { ok: false, error: 'the wish list line carries no remove request to post' };
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
      .filter((t) => /removed from your Wish List/i.test(t))
      .sort((a, b) => a.length - b.length);
    const out = {
      ok: res.ok,
      status: res.status,
      item_id: line.itemId,
      message: banners.length ? banners[0] : null,
    };
    return out;
  }
  return await main();
`;

export async function run({ product_name }) {
  browser.open("/wishlist/");
  browser.waitFor("location.pathname.indexOf('/wishlist') !== -1 && document.readyState === 'complete'");

  let state = browser.exec(wishlistReadScript(product_name), { timeout: "2m" });
  if (!state.found) {
    return {
      product: product_name,
      removed: false,
      item_id: null,
      message: null,
      wishlist_url: state.url || null,
      item_count: state.item_count,
      wishlist_items: state.items,
      error: "The wish list does not list '" + product_name + "', so there is nothing to remove.",
    };
  }

  // a product listed on several lines is taken out line by line, one remove request per pass
  let removed = null;
  let passes = 0;
  while (state.found && passes < 5) {
    passes += 1;
    removed = browser.exec(removeScript(product_name), { timeout: "2m" });
    if (!removed.ok) {
      return {
        product: product_name,
        removed: false,
        item_id: null,
        message: null,
        wishlist_url: null,
        item_count: null,
        wishlist_items: null,
        error: removed.error,
      };
    }
    state = browser.exec(wishlistReadScript(product_name), { timeout: "2m" });
  }

  const gone = !state.found;
  return {
    product: product_name,
    removed: gone,
    item_id: removed.item_id || null,
    message: removed.message || null,
    wishlist_url: state.url || null,
    item_count: state.item_count,
    wishlist_items: state.items,
    error: gone
      ? null
      : "The wish list read-back still lists '" + product_name + "' after the removal.",
  };
}

runApi(import.meta.url, meta, run);
