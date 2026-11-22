import { browser, runApi } from "./skillweaver-api.mjs";

export const meta = {
  name: "empty_shopping_cart",
  description:
    "Remove every item from the shopping cart in one call, leaving the cart page reading " +
    "'You have no items in your shopping cart.' and the header's mini-cart count at 0. " +
    "The cart page at /checkout/cart/ is opened and read across every page of its own pager - " +
    "the cart shows twenty rows to a page, with a .pager element carrying an a.page link per page " +
    "and an action next link and an amount toolbar stating the cart's totals (for example " +
    "'Items 1 to 20 of 24 total'), so a read that stops at the first page misses the rows on the " +
    "later ones. " +
    "Each row's Remove item control is an a.action.action-delete link whose href is only '#' and " +
    "which carries the request it makes in a data-post attribute naming /checkout/cart/delete/ " +
    "together with the cart item id and uenc; that request is posted as the link carries it, with " +
    "the cart page's own form key added when the page exposes one, from a page on the store's " +
    "origin - the same way the library's remove_product_from_cart posts one row's request. " +
    "Three things are unexpected but important. " +
    "The store answers each delete post with a redirect back to the cart page and no success or " +
    "error message of its own, so the cart page read after the posts is the only reliable " +
    "confirmation. " +
    "The cart item ids are the store's own - they grow as items are added and change when the cart " +
    "is rebuilt - so they are read fresh on every pass and the posts are repeated pass by pass " +
    "until no delete link remains, the page's own pager shrinking as rows go. " +
    "And the header's mini-cart is rendered client-side, so its count is only trustworthy on a " +
    "freshly loaded page - a fetch of the cart page always shows the mini-cart's empty template - " +
    "which is why the call reloads the cart page and reads the mini-cart from the live page once " +
    "the cart is empty.",
  params: {},
  returns:
    "An object: removed_rows and removed_units (how many cart rows and units the call took out), " +
    "emptied (true when the cart page read-back shows no item rows and reads 'You have no items " +
    "in your shopping cart.'), mini_cart_count (the header mini-cart's item count as the reloaded " +
    "live page shows it, or null when it could not be read), cart_items (the cart's lines as " +
    "{name, quantity} in page order after the removals - [] when the cart is empty), remove_errors " +
    "(short reasons for any remove request the store refused, usually empty), and error (a short " +
    "reason when emptied is false, when the mini-cart count could not be read, or when it does not " +
    "read 0 - otherwise null).",
  usage_log: [
    "iter_35: no parameters - the procedure was carried out step by step with the agent browser (no registered API covered emptying the cart, remove_product_from_cart taking one named product out at a time): the cart at /checkout/cart/ held 24 rows for 47 units, its toolbar reading 'Items 1 to 20 of 24 total' with a second pager page; every row's own remove request (the data-post of an a.action.action-delete link naming /checkout/cart/delete/ with the cart item id and uenc) was collected across both pager pages and posted with the cart page's form key - 24 deletes, no errors - and the cart page then read back with no rows and the message 'You have no items in your shopping cart.'; the cart page was reloaded in the live browser and read, showing 0 rows, the empty message on the page and the header mini-cart at 'My Cart 0', the mini-cart being rendered client-side so its count is only read from the live page.",
  ],
};

// Post every row's own remove request, pass by pass, until the cart page carries no delete
// link, then read the cart page back. The cart page paginates at twenty rows to a page, so
// each pass collects the requests from every page of the cart's own pager, and the cart item
// ids are read fresh on every pass because the store's own ids change when the cart is rebuilt.
const emptyScript = `
  async function main() {
    const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
    const parse = (html) => new DOMParser().parseFromString(html, 'text/html');
    const readRows = (doc) =>
      [...doc.querySelectorAll('tr.item-info')]
        .map((tr) => {
          const nameEl = tr.querySelector('.product-item-name');
          const q = tr.querySelector('input.qty, input[data-role=cart-item-qty]');
          return {
            name: nameEl ? norm(nameEl.textContent) : '',
            quantity: q ? parseInt(norm(q.value), 10) || 0 : 0,
          };
        })
        .filter((r) => r.name);
    const readDeletes = (doc) =>
      [...doc.querySelectorAll('a.action.action-delete')]
        .map((a) => {
          try {
            return JSON.parse(a.getAttribute('data-post') || '');
          } catch (e) {
            return null;
          }
        })
        .filter((p) => p && p.action && p.data && p.data.id !== undefined);
    const readPage = async (url) => {
      const res = await fetch(url, { credentials: 'same-origin' });
      const doc = parse(await res.text());
      return {
        rows: readRows(doc),
        deletes: readDeletes(doc),
        pages: [...doc.querySelectorAll('.pager a.page, .pager a.action.next')]
          .map((a) => a.getAttribute('href'))
          .filter(Boolean),
        toolbar: norm(doc.querySelector('.toolbar-amount') ? doc.querySelector('.toolbar-amount').textContent : ''),
        bodyText: norm(doc.body ? doc.body.textContent : ''),
        formKey: (() => {
          const input = doc.querySelector('input[name="form_key"]');
          return input && input.value ? input.value : null;
        })(),
      };
    };
    // the cart page and every page of its own pager, one remove request per cart item id
    const readEveryPage = async () => {
      const first = await readPage(new URL('/checkout/cart/', location.href).href);
      let rows = first.rows.slice();
      let deletes = first.deletes.slice();
      const seen = new Set([new URL('/checkout/cart/', location.href).href]);
      for (const href of first.pages) {
        let url = null;
        try {
          url = new URL(href, location.href).href;
        } catch (e) {
          url = null;
        }
        if (!url || seen.has(url)) continue;
        seen.add(url);
        const page = await readPage(url);
        rows = rows.concat(page.rows);
        deletes = deletes.concat(page.deletes);
      }
      const byId = new Map();
      for (const d of deletes) {
        const key = String(d.data.id);
        if (!byId.has(key)) byId.set(key, d);
      }
      return {
        rows: rows,
        deletes: [...byId.values()],
        formKey: first.formKey,
        toolbar: first.toolbar,
        emptyMessage: /You have no items in your shopping cart/i.test(first.bodyText),
      };
    };
    const postDelete = async (post, formKey) => {
      const fd = new URLSearchParams();
      const data = post.data || {};
      for (const key of Object.keys(data)) fd.append(key, String(data[key]));
      if (formKey && !fd.has('form_key')) fd.append('form_key', formKey);
      const res = await fetch(post.action, { method: 'POST', body: fd, credentials: 'same-origin', redirect: 'follow' });
      await res.text();
      return res.ok;
    };
    const unitsOf = (rows) => rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    const initial = await readEveryPage();
    const errors = [];
    let posted = 0;
    for (let pass = 0; pass < 10; pass++) {
      const cart = await readEveryPage();
      if (!cart.deletes.length) break;
      let postedThisPass = 0;
      for (const post of cart.deletes) {
        try {
          const ok = await postDelete(post, cart.formKey);
          if (ok) {
            posted += 1;
            postedThisPass += 1;
          } else {
            errors.push('the remove request for cart item ' + String(post.data.id) + ' was refused');
          }
        } catch (e) {
          errors.push('the remove request for cart item ' + String(post.data.id) + ' failed: ' + String(e && e.message ? e.message : e));
        }
      }
      if (!postedThisPass) break;
    }
    const final = await readEveryPage();
    const out = {
      initial: { rows: initial.rows.length, units: unitsOf(initial.rows), toolbar: initial.toolbar },
      deletes_posted: posted,
      errors: errors,
      final: {
        rows: final.rows.length,
        units: unitsOf(final.rows),
        empty_message: final.emptyMessage,
        items: final.rows.map((r) => ({ name: r.name, quantity: r.quantity })),
      },
    };
    return out;
  }
  return await main();
`;

// The header's mini-cart is rendered client-side, so its count is read from the live page
// after a reload rather than from a fetch of the cart page.
const liveScript = `
  async function main() {
    const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
    const start = Date.now();
    let miniText = '';
    while (Date.now() - start < 12000) {
      const block = document.querySelector('.block-minicart');
      miniText = block ? norm(block.innerText || block.textContent) : '';
      if (miniText) break;
      await new Promise((r) => setTimeout(r, 300));
    }
    const bodyText = norm(document.body ? document.body.innerText || document.body.textContent : '');
    const m = miniText.match(/My Cart\\s+(\\d+)/i) || miniText.match(/(\\d+)\\s*items?/i);
    const out = {
      rows: document.querySelectorAll('tr.item-info').length,
      empty_message_on_page: /You have no items in your shopping cart/i.test(bodyText),
      mini_cart_text: miniText,
      mini_cart_count: m ? Number(m[1]) : null,
    };
    return out;
  }
  return await main();
`;

export async function run() {
  browser.open("/checkout/cart/");
  browser.waitFor(
    "location.pathname.indexOf('/checkout/cart/') !== -1 && document.readyState === 'complete'"
  );

  const emptied = browser.exec(emptyScript, { timeout: "5m" });
  const isEmptied = emptied.final.rows === 0 && emptied.final.empty_message === true;

  // the reloaded live page, where the header's mini-cart is rendered
  browser.open("/checkout/cart/");
  browser.waitFor("document.readyState === 'complete'", { timeoutMs: 15000 });
  const live = browser.exec(liveScript, { timeout: "2m" });

  let error = null;
  if (!isEmptied) {
    error =
      emptied.final.rows > 0
        ? "the cart still lists " +
          emptied.final.rows +
          " row(s) after the removals: " +
          emptied.final.items.map((i) => i.name + " x " + i.quantity).join("; ")
        : "the cart page no longer reads 'You have no items in your shopping cart.'";
  } else if (live.mini_cart_count === null) {
    error = "the cart is empty but the header mini-cart's count could not be read from the live page";
  } else if (live.mini_cart_count !== 0) {
    error = "the cart is empty but the header mini-cart reads " + live.mini_cart_count + " items";
  }

  return {
    removed_rows: Math.max(0, emptied.initial.rows - emptied.final.rows),
    removed_units: Math.max(0, emptied.initial.units - emptied.final.units),
    emptied: isEmptied,
    mini_cart_count: live.mini_cart_count,
    cart_items: emptied.final.items,
    remove_errors: emptied.errors,
    error: error,
  };
}

runApi(import.meta.url, meta, run);
