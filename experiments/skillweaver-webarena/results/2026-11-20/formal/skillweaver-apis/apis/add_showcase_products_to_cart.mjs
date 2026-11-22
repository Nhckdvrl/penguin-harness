import { browser, runApi } from "./skillweaver-api.mjs";

export const meta = {
  name: "add_showcase_products_to_cart",
  description:
    "Add every product featured in the homepage's Product Showcases row to the shopping cart, one of " +
    "each by default, and read the cart back so the result confirms each product appears at the " +
    "quantity asked for. The homepage at / is opened and the showcase row's product names are read " +
    "from the page's own product-item links, in row order. The row is paginated - the row observed " +
    "here read 'Items 1 to 12 of 24 total' - so the call walks the row's own pager, page by page, " +
    "until the row's own total is reached and every featured product has been read: each page after " +
    "the first is the pager link's own address (the row's numbered 'Page 2' link, or its next " +
    "control), fetched on the store's origin, and a page that brings no new name ends the walk. The " +
    "names are taken from the page rather than retyped because they are the products' exact names " +
    "and can be far longer than a shopper's shorthand (one reads 'Belle Of The Ball Princess " +
    "Sprinkle Mix| Wedding Colorful Sprinkles| Cake Cupcake Cookie Sprinkles| Ice cream Candy " +
    "Sprinkles| Yellow Gold Red Royal Red Rose Icing Flowers Decorating Sprinkles, 8OZ', another " +
    "'V8 +Energy, Healthy Energy Drink, Steady Energy from Black and Green Tea, Pomegranate " +
    "Blueberry, 8 Ounce Can ,Pack of 24' with a space before its comma). Each product is then added " +
    "exactly the way the library's add APIs add one: it is located through the store's quick search " +
    "at /catalogsearch/result/ (trying the full name, the name without a trailing parenthesised " +
    "part, and its first five words) and its product page's own add-to-cart form is posted with " +
    "that page's hidden fields (including the form key), the requested quantity, and the first " +
    "offered choice of any required custom option. A product that cannot be found or posted is " +
    "reported with an error and the remaining products are still added. Five things are unexpected " +
    "but important. The store answers each add-to-cart post with HTTP 200 and a redirect back to " +
    "the product page, with no success or error message either way, so the cart read-back that " +
    "follows is the only reliable confirmation. Some featured products carry a required custom " +
    "option (a radio list such as 'Size', a flavour list such as the Crunchy Rice Rollers' 'White " +
    "Rice', a colour list such as the cake topper's 'Black', a country list such as the Amosfun " +
    "toppers' 'Greece', or a pack-size list such as the Krusteaz mix's '10 Pound (Pack of 1)') " +
    "without which the post is silently ignored - the first offered choice is used and reported in " +
    "option_used, so use add_product_to_cart or add_products_to_cart when a specific choice is " +
    "needed. An add is additive to an existing cart line rather than a set, so a featured product " +
    "the cart already holds from an earlier visit comes back at the held quantity plus the one " +
    "asked for (a row at 2 that is added at quantity 1 reads 3), which is reported as added false - " +
    "update_cart_item_quantity is the call that sets an exact quantity. The cart page itself shows " +
    "twenty rows to a page with its own pager, so the read-back follows the cart page's own pager " +
    "links and reports every row rather than the first page's only. And the cart keeps items from " +
    "earlier visits, so cart_items can list more than what this call added.",
  params: {
    quantity: {
      type: "number",
      description:
        "How many units of each showcase product to add; a positive whole number. Leave it out to add one of each.",
      optional: true,
    },
  },
  returns:
    "An object: requested (how many products the showcase row showed across all of its pages), " +
    "pages (how many pages of the row were walked), all_added (true only when every showcase " +
    "product shows in the cart read-back at exactly the requested quantity), items (one entry per " +
    "showcase product, in row order: product, quantity, option_used (the label of the " +
    "custom-option choice posted, or null when the product needed none), added, product_url (the " +
    "product page used, or null), and error (a short reason when the product was not found, the " +
    "form could not be posted, or the cart read-back does not show the product at the requested " +
    "quantity)), and cart_items (the cart's lines as {name, quantity} in page order, which can " +
    "include items from earlier visits).",
  usage_log: [
    "iter_30: quantity left out (one of each) - the procedure was carried out in two steps with the agent browser (no registered API covered reading the showcase row): the homepage's Product Showcases row, which read 'Items 1 to 12 of 24 total', was read for its twelve product-item links and the registered add_products_to_cart API was then called with those twelve exact names; every product was added at quantity 1 - three of them through the first offered choice of a required custom option, the Belle Of The Ball Princess Sprinkle Mix ... , 8OZ with '2 Ounce (Pack of 1)', the Stove Top Turkey Stuffing Mix (12 oz Boxes, Pack of 2) with '12 Ounce (Pack of 1)' and the Crunchy Rice Rollers - Gluten Free - Vegan - 3.5 oz Individual Packs (4 Packs of 8 Rollers) with 'White Rice' - and the cart page read back through the browser showed all twelve rows at qty 1, each add still carrying its own one-time 'You added <product> to your shopping cart.' banner, which the fetch-based cart read-back had not consumed.",
    "iter_34: quantity left out (one of each) - the procedure was carried out with the agent browser plus the registered add_products_to_cart API (no registered API covered paging the showcase row, which is why this version walks the row's pager itself): the homepage's Product Showcases row read 'Items 1 to 12 of 24 total' and its twelve product-item links were read; the row's pager (a .pager element whose 'Page 2' link and 'action next' link both carry the homepage URL with the row's page parameter, ?pbaocw=2) was clicked and the reloaded row read 'Items 13 to 24 of 24 total' with twelve more names, twenty-four distinct featured products in all; the registered add_products_to_cart API was then called with all twenty-four exact names and added each at quantity 1 - six of them through the first offered choice of a required custom option, the three of iter_30 plus the 20 PCS Balls Cake Topper ... Cake Decoration with 'Black', the Amosfun 100pcs Cupcake Toppers ... (Welsh) with 'Greece' and the Krusteaz Buttermilk Pancake Mix (10 lb.) with '10 Pound (Pack of 1)' - and the browser read of the cart page showed all twenty-four rows, the cart page's own pager reading 'Items 1 to 20 of 24 total' on its first page and 'Items 21 to 24 of 24 total' on its second; the first twelve came back at quantities 2-3 because the cart already held them from earlier visits and an add is additive rather than a set, which is why this version also reads the cart back page by page.",
  ],
};

export async function run({ quantity }) {
  const qty = quantity === undefined ? 1 : Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    throw new Error("quantity is not a positive whole number");
  }

  browser.open("/");

  // Every page of the showcase row: the row is paginated and its own toolbar states its total,
  // so the row's own pager links are walked until every featured product has been read.
  const namesScript = `
    async function main() {
      const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
      const parse = (html) => new DOMParser().parseFromString(html, 'text/html');
      const relOf = (href) => {
        const u = new URL(href, location.origin);
        return u.pathname + u.search;
      };
      const readRow = (doc) => {
        const names = [...doc.querySelectorAll('.product-item-link')]
          .map((a) => norm(a.textContent))
          .filter(Boolean);
        const pager = doc.querySelector('.pager');
        const scope = pager || doc.body;
        const amount = norm(scope ? scope.textContent : '').match(/Items\\s+(\\d+)\\s+to\\s+(\\d+)\\s+of\\s+(\\d+)\\s+total/i);
        const links = pager
          ? [...pager.querySelectorAll('a')].map((a) => ({
              text: norm(a.textContent),
              href: a.getAttribute('href') || '',
              cls: String(a.className || ''),
            }))
          : [];
        return { names: names, total: amount ? Number(amount[3]) : null, links: links };
      };
      const pageNumberOf = (text) => {
        const m = String(text).match(/^Page\\s*(\\d+)$/i);
        return m ? Number(m[1]) : null;
      };
      let info = readRow(document);
      const names = [...info.names];
      const seen = new Set(names);
      let pageNo = 1;
      let guard = 0;
      while (guard++ < 50) {
        if (info.total !== null && names.length >= info.total) break;
        const wanted = pageNo + 1;
        let link = info.links.find((l) => pageNumberOf(l.text) === wanted) || null;
        if (!link) {
          link = info.links.find((l) => /(^|\\s)next(\\s|$)/i.test(l.cls) && !/(^|\\s)disabled(\\s|$)/i.test(l.cls)) || null;
        }
        if (!link || !link.href) break;
        const doc = parse(await (await fetch(relOf(link.href), { cache: 'no-store' })).text());
        info = readRow(doc);
        const before = names.length;
        for (const n of info.names) {
          if (!seen.has(n)) {
            seen.add(n);
            names.push(n);
          }
        }
        pageNo = wanted;
        if (names.length === before) break;
      }
      return { names: names, total: info.total, pages: pageNo };
    }
    return await main();
  `;
  const row = browser.exec(namesScript, { timeout: "2m" });
  const names = row.names || [];
  if (names.length === 0) {
    throw new Error("the homepage's Product Showcases row showed no products");
  }

  const items = names.map((name) => ({ product_name: name, quantity: qty }));

  const addScript = `
    async function main() {
      const ITEMS = ${JSON.stringify(items)};
      const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
      const parse = (html) => new DOMParser().parseFromString(html, 'text/html');
      const out = [];
      for (const item of ITEMS) {
        const NAME = item.product_name;
        const QTY = String(item.quantity);
        const rec = {
          product: NAME,
          quantity: item.quantity,
          option_used: null,
          added: false,
          product_url: null,
          error: undefined,
        };
        try {
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
            rec.error = 'product not found';
            out.push(rec);
            continue;
          }
          rec.product_url = productUrl;

          const pdoc = parse(await (await fetch(productUrl)).text());
          const form = pdoc.querySelector('form#product_addtocart_form');
          if (!form) {
            rec.error = 'the product page has no add-to-cart form';
            out.push(rec);
            continue;
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
          const chosen = [];
          for (const name of Object.keys(groups)) {
            const controls = groups[name];
            if (controls[0].tagName === 'SELECT') {
              const opts = [...controls[0].querySelectorAll('option')].filter((o) => o.value);
              const pick = opts[0];
              if (!pick) continue;
              fd.append(name, pick.value);
              chosen.push({ option: name, label: norm(pick.textContent) });
            } else {
              const pick = controls[0];
              if (!pick) continue;
              fd.append(name, pick.value);
              chosen.push({ option: name, label: labelOf(pick) });
            }
          }
          fd.set('qty', QTY);

          const res = await fetch(action, { method: 'POST', body: fd, credentials: 'same-origin', redirect: 'follow' });
          await res.text();
          rec.option_used = chosen.length > 0 ? chosen[0].label : null;
        } catch (e) {
          rec.error = String(e && e.message ? e.message : e);
        }
        out.push(rec);
      }
      return out;
    }
    return await main();
  `;
  const added = browser.exec(addScript, { timeout: "5m" });

  // The cart page read-back: the cart page shows twenty rows to a page with its own pager, so
  // every page of the cart is read and the result reports every row.
  const cartScript = `
    async function main() {
      const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
      const parse = (html) => new DOMParser().parseFromString(html, 'text/html');
      const relOf = (href) => {
        const u = new URL(href, location.origin);
        return u.pathname + u.search;
      };
      const rowsOf = (doc) =>
        [...doc.querySelectorAll('tr.item, tr.item-info, .cart.item')].map((tr) => {
          const n = tr.querySelector('.product-item-name');
          const q = tr.querySelector('input.qty, input[data-role=cart-item-qty], input[name^="cart["]');
          return { name: n ? norm(n.textContent) : null, quantity: q ? norm(q.value) : null };
        });
      const pagerOf = (doc) => {
        const pager = doc.querySelector('.pager');
        if (!pager) return null;
        const amount = norm(pager.textContent).match(/Items\\s+(\\d+)\\s+to\\s+(\\d+)\\s+of\\s+(\\d+)\\s+total/i);
        const links = [...pager.querySelectorAll('a')].map((a) => ({
          text: norm(a.textContent),
          href: a.getAttribute('href') || '',
          cls: String(a.className || ''),
        }));
        return { total: amount ? Number(amount[3]) : null, links: links };
      };
      const pageNumberOf = (text) => {
        const m = String(text).match(/^Page\\s*(\\d+)$/i);
        return m ? Number(m[1]) : null;
      };
      const items = [];
      let doc = parse(await (await fetch('/checkout/cart/', { cache: 'no-store' })).text());
      const empty = norm(doc.querySelector('.cart-empty') ? doc.querySelector('.cart-empty').textContent : '');
      let pageNo = 1;
      let guard = 0;
      while (guard++ < 50) {
        for (const r of rowsOf(doc)) items.push(r);
        const pager = pagerOf(doc);
        if (!pager) break;
        if (pager.total !== null && items.length >= pager.total) break;
        const wanted = pageNo + 1;
        let link = pager.links.find((l) => pageNumberOf(l.text) === wanted) || null;
        if (!link) {
          link = pager.links.find((l) => /(^|\\s)next(\\s|$)/i.test(l.cls) && !/(^|\\s)disabled(\\s|$)/i.test(l.cls)) || null;
        }
        if (!link || !link.href) break;
        doc = parse(await (await fetch(relOf(link.href), { cache: 'no-store' })).text());
        pageNo = wanted;
        if (rowsOf(doc).length === 0) break;
      }
      return { empty: empty, items: items };
    }
    return await main();
  `;
  const cart = browser.exec(cartScript, { timeout: "2m" });
  const lines = cart.items || [];

  const results = added.map((r) => {
    const line = lines.find((l) => l.name === r.product);
    const isAdded = line ? Number(line.quantity) === r.quantity : false;
    const out = Object.assign({}, r, { added: isAdded });
    if (!isAdded && !out.error) {
      out.error = 'the cart read-back does not show this product at quantity ' + r.quantity;
    }
    return out;
  });

  return {
    requested: results.length,
    pages: row.pages,
    all_added: results.length > 0 && results.every((r) => r.added),
    items: results,
    cart_items: lines,
  };
}

runApi(import.meta.url, meta, run);
