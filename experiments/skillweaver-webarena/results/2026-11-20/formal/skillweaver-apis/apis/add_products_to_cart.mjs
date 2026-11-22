import { browser, runApi } from "./skillweaver-api.mjs";

export const meta = {
  name: "add_products_to_cart",
  description:
    "Add several products to the shopping cart in one call from a shopping list, each at its own " +
    "quantity, and read the cart back so the result confirms every product appears at the quantity " +
    "asked for. The products are added one at a time in list order: each is located through the " +
    "store's quick search at /catalogsearch/result/ (trying the full name, the name without a " +
    "trailing parenthesised part, and its first five words) and its product page's own add-to-cart " +
    "form is then posted with that page's hidden fields (including the form key), the requested " +
    "quantity, and any required custom-option choice. A product that cannot be found or posted is " +
    "reported with an error and the remaining products are still added. Four things are unexpected " +
    "but important: the store answers each add-to-cart post with HTTP 200 and a redirect back to the " +
    "product page, with no success or error message either way, so the cart read-back that follows " +
    "is the only reliable confirmation; some products carry a required custom option (a radio list " +
    "such as 'Size', a flavour list such as the Crunchy Rice Rollers' 'White Rice', a colour list " +
    "such as the cake topper's 'Black', a country list such as the Amosfun toppers' 'Greece', or a " +
    "pack-size list such as the Krusteaz mix's '10 Pound (Pack of 1)') without which the post is " +
    "silently ignored — pass options with the choice's label as the page shows it to pick a specific " +
    "one, otherwise the first offered choice is used and reported in option_used; an add is additive " +
    "to an existing cart line rather than a set, so a product the cart already holds comes back at " +
    "the held quantity plus the quantity posted and is reported as added false (adding 1 to a row " +
    "at 2 leaves it at 3) — update_cart_item_quantity is the call that sets an exact quantity; and " +
    "the cart page shows twenty rows to a page with its own pager, so the read-back follows the cart " +
    "page's own pager links and reports every row — a read that stopped at the cart's first page " +
    "reported four added products as missing although they sat on its second page. The cart keeps " +
    "items from earlier visits, so cart_items can list more than what this call added.",
  params: {
    product_names: {
      type: "string",
      description:
        "The products' names exactly as the store shows them, one per line, in the order they should be added.",
    },
    quantities: {
      type: "string",
      description:
        "How many units of each product to add: one positive whole number per line, in the same order as product_names; leave out to add one of each.",
      optional: true,
    },
    options: {
      type: "string",
      description:
        "For products with a required custom option, the label of the choice to select as the page shows it, one per line in the same order as product_names; leave an entry empty to take the first offered choice. Leave the parameter out when no product needs one.",
      optional: true,
    },
  },
  returns:
    "An object: requested (how many products were asked for), all_added (true only when every " +
    "requested product shows in the cart read-back at exactly its requested quantity), items (one " +
    "entry per requested product, in list order: product, quantity, option_used (the label of the " +
    "custom-option choice posted, or null when the product needed none), added, product_url (the " +
    "product page used, or null), and error (a short reason when the product was not found, the " +
    "requested option choice was not offered, the form could not be posted, or the cart read-back " +
    "does not show the product at the requested quantity)), and cart_items (the cart's lines as " +
    "{name, quantity} in page order, which can include items from earlier visits).",
  usage_log: [
    "iter_4: product_names 'Pre-baked Gingerbread House Kit Value Pack, 17 oz., Pack of 2, Total 34 oz.' (quantity 2) and 'So Delicious Dairy Free CocoWhip Light, Vegan, Non-GMO Project Verified, 9 oz. Tub' (quantity 1) — the procedure was carried out step by step with the add_product_to_cart API twice plus a cart-page read: both posts returned HTTP 200 with no message, neither product carried a required custom option, and the cart page showed both products at the requested quantities (Qty fields \"2\" and \"1\"), beside the items already in the cart.",
    "iter_30: product_names the twelve exact names of the homepage's Product Showcases row, quantities left out (one of each) — the call returned ok:true with requested 12 and all_added true, every item added at quantity 1; three products carried a required custom option and the first offered choice was posted and reported in option_used — 'Belle Of The Ball Princess Sprinkle Mix| Wedding Colorful Sprinkles| Cake Cupcake Cookie Sprinkles| Ice cream Candy Sprinkles| Yellow Gold Red Royal Red Rose Icing Flowers Decorating Sprinkles, 8OZ' with '2 Ounce (Pack of 1)', 'Stove Top Turkey Stuffing Mix (12 oz Boxes, Pack of 2)' with '12 Ounce (Pack of 1)' and 'Crunchy Rice Rollers - Gluten Free - Vegan - 3.5 oz Individual Packs (4 Packs of 8 Rollers)' with 'White Rice' (a flavour list, its first offered choice) — and the cart read-back listed all twelve products at quantity 1; the call's own fetch-based cart read does not consume the store's one-time 'You added <product> to your shopping cart.' banners, which the browser page load of /checkout/cart/ afterwards still showed, one per add, as a second confirmation of every add.",
    "iter_34: product_names the twenty-four exact names of the homepage's Product Showcases row, read from both of the row's pages ('Items 1 to 12 of 24 total' and 'Items 13 to 24 of 24 total'), quantities left out (one of each) — the call returned ok:true with requested 24 and all_added false: the first twelve products were already in the cart from earlier visits at quantities 1-2 and an add is additive to an existing line, so the read-back showed them at 2-3 and reported added false; four more — '(NOT A CASE) Original Concentrated Hot Curry Paste Tomato Cumin and Chile', 'Chao Thai Coconut Powder, Large, 13 Ounce', 'Viva Doria Tellicherry Peppercorn, Steam Sterilized Whole Black Pepper, Black Peppercorns, 12 Oz (Pepper+Grinder)' and 'Krusteaz Buttermilk Pancake Mix (10 lb.)' — were also reported not added although the browser read of the cart page's own second page ('Items 21 to 24 of 24 total') showed all four at quantity 1: the cart page shows twenty rows to a page with its own pager and the call's cart read-back stopped at the first page, which is why the read-back now follows the cart page's pager and reports every row. Six products carried a required custom option and the first offered choice was posted and reported in option_used — the three of iter_30 plus 'Black' for the 20 PCS Balls Cake Topper ... Cake Decoration, 'Greece' for the Amosfun 100pcs Cupcake Toppers ... (Welsh) and '10 Pound (Pack of 1)' for the Krusteaz Buttermilk Pancake Mix (10 lb.).",
  ],
};

export async function run({ product_names, quantities, options }) {
  const names = String(product_names)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (names.length === 0) throw new Error("no product names given");

  const qtyLines =
    quantities === undefined ? [] : String(quantities).split(/\r?\n/).map((s) => s.trim());
  const optionLines =
    options === undefined ? [] : String(options).split(/\r?\n/).map((s) => s.trim());

  const items = names.map((name, i) => {
    const raw = i < qtyLines.length ? qtyLines[i] : "";
    const qty = raw === "" ? 1 : Number(raw);
    if (!Number.isInteger(qty) || qty < 1) {
      throw new Error("the quantity for '" + name + "' is not a positive whole number");
    }
    const label = i < optionLines.length ? optionLines[i] : "";
    return { product_name: name, quantity: qty, option: label === "" ? null : label };
  });

  browser.open("/");

  const addScript = `
    async function main() {
      const ITEMS = ${JSON.stringify(items)};
      const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
      const parse = (html) => new DOMParser().parseFromString(html, 'text/html');
      const out = [];
      for (const item of ITEMS) {
        const NAME = item.product_name;
        const QTY = String(item.quantity);
        const WANT = item.option;
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
            rec.error = 'no custom-option choice labelled ' + WANT + ' (offered: ' + available.join(', ') + ')';
            out.push(rec);
            continue;
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
    all_added: results.length > 0 && results.every((r) => r.added),
    items: results,
    cart_items: lines,
  };
}

runApi(import.meta.url, meta, run);
