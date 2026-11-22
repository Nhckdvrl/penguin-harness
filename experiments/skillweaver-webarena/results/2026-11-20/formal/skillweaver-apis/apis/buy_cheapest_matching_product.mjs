import { browser, runApi } from "./skillweaver-api.mjs";

export const meta = {
  name: "buy_cheapest_matching_product",
  description:
    "Buy the cheapest product whose name contains a keyword within one store category, and return " +
    "the order confirmation number. " +
    "The cheapest is the lowest final price among every product of the category whose name contains " +
    "the keyword: the category's display name is resolved to its internal uid through the store's own " +
    "product data, and the category's products are then queried with a name match, page by page, until " +
    "the store's reported total is reached; products tied at the lowest price are all reported in ties. " +
    "The product's page is located through the store's quick search, trying the full name, the name " +
    "without a trailing parenthesised part and its first five words, and falls back to the URL built " +
    "from the url_key the data query returned; that page's own add-to-cart form is then posted with its " +
    "hidden fields (including the form key), the requested quantity and any required custom-option " +
    "choice, and the cart page is read back to confirm the product is in the cart at that quantity " +
    "before the checkout starts. The checkout then walks the onepage steps: Proceed to Checkout, the " +
    "shipping step (the signed-in shopper's saved address is already selected and merely shown; the " +
    "first shipping-method radio is checked only when the step has none checked), Next, the payment " +
    "step (the requested payment method is chosen by its visible label when one is given, otherwise " +
    "the step's own preselection is kept) and Place Order. " +
    "Nine things are unexpected but important. " +
    "The store's product data intermittently answers a products query with an empty items list and no " +
    "error - the same query can fail once and succeed minutes later - so the page size is probed with " +
    "the exact final query before paging and every page is retried before the scan gives up; a plain " +
    "fixed-page-size loop can come back with nothing although hundreds of products match. " +
    "The category scope cannot come from the store's Advanced Search, whose results endpoint ignores " +
    "category parameters. " +
    "The store answers the add-to-cart post with HTTP 200 and a redirect back to the product page, " +
    "with no success or error message either way, so the cart page read that follows is the only " +
    "reliable confirmation. " +
    "Some products carry a required custom option (a radio list such as 'Size') without which the post " +
    "is silently ignored - the first offered choice is taken and reported in option_used. " +
    "The cart keeps items from earlier visits, so cart_items and the order itself can list more than " +
    "what this call added, and when the product is already in the cart at the requested quantity the " +
    "post is skipped. " +
    "On the cart page the working Proceed to Checkout control is " +
    "button[data-role=\"proceed-to-checkout\"], because the button.action.primary.checkout element is " +
    "a hidden duplicate with no size and clicking it fails; and that click does not always navigate - " +
    "the page can stay on /checkout/cart/ with no checkout hash and none of the shipping step's " +
    "controls, and a wait that times out only returns false - so the click is verified against the " +
    "shipping step's own controls, repeated once while the page is still the cart, and only then is " +
    "the checkout opened directly at /checkout/. " +
    "The checkout is a single page whose steps (/checkout/#shipping, then /checkout/#payment) are " +
    "knockout views that advance without a full navigation, so the script waits on each step's own " +
    "controls rather than on a new page load. " +
    "The store preselects the saved address, a shipping method and the Check / Money order payment " +
    "method, so the selection steps are usually confirmations rather than changes. " +
    "And the success page's order number is shown once: it is read from the rendered page text with a " +
    "regular expression (in the page's markup it sits inside an anchor, so a raw-markup read can catch " +
    "the anchor's tag instead of the digits), and when that display has already been consumed - or the " +
    "tab never landed on the success page - the number is recovered from the shopper's order history " +
    "at /sales/order/history/ (and /customer/account/), whose order view links " +
    "(/sales/order/view/order_id/<id>/) are checked newest first for the one listing the product just " +
    "bought, its 'Order #' line holding the number; the cart page reading 'You have no items in your " +
    "shopping cart' is what shows the order did go through in that case.",
  params: {
    category: {
      type: "string",
      description: "The category's name as the store's navigation shows it, e.g. \"Grocery & Gourmet Food\".",
    },
    keyword: {
      type: "string",
      description: "Words the product's name must contain, as a shopper would type them.",
    },
    quantity: {
      type: "number",
      description: "How many units to buy; a positive whole number. Leave it out to buy one.",
      optional: true,
    },
    payment_method: {
      type: "string",
      description:
        "The payment method to choose, as the payment step shows it, e.g. \"Check / Money Order\". Leave it out to keep the method the step already has selected.",
      optional: true,
    },
  },
  returns:
    "An object: product (the cheapest matching product's name, or null), price (its final price as a " +
    "number, or null), quantity (the number asked for), added (true when the cart read-back before the " +
    "checkout showed this product at exactly this quantity), option_used (the label of the " +
    "custom-option choice posted, or null when the product needed none), product_url (the product page " +
    "used, or null), scan_complete (true when every matching product the store reported was seen), " +
    "ties (the names of the other products at the same lowest price, or null), order_number (the " +
    "confirmation number the success page showed, or the one recovered from the shopper's order " +
    "history, or null when the checkout produced none), and error (a short reason when the purchase " +
    "did not complete - no product in the category matched, the product's page or add-to-cart form " +
    "could not be found, the cart read-back did not confirm the add, or no confirmation number could " +
    "be read - otherwise null).",
  usage_log: [
    "iter_22: category 'Grocery & Gourmet Food', keyword 'tea', quantity 1, payment_method left out - " +
      "the procedure was carried out in two registered calls, add_cheapest_matching_product_to_cart " +
      "followed by place_order_from_cart (no registered API covered a cheapest-first purchase in one " +
      "call): the scan of the category (uid 'MTQ=') saw all 487 of its products carrying 'tea' in the " +
      "name, and the cheapest was 'Honest Tea Organic Fair Trade Half Tea & Half Lemonade Gluten Free, " +
      "16.9 fl oz' at $1.32 (SKU B01HBB1LMG) with no ties and scan complete; the product page's " +
      "add-to-cart form was posted with qty 1 and no required custom option, and the cart read-back " +
      "showed it at quantity 1 beside one item from an earlier visit; the onepage checkout ran on the " +
      "shopper's saved address with the preselected Check / Money order method, and the success page " +
      "showed order number 000000195, which the shopper's order history and order view confirmed " +
      "('Order # 000000195', November 21 2026, grand total $45.08, payment 'Check / Money order', " +
      "listing the tea at $1.32 x 1 and the Tony Chachere's seasoning at $7.92 x 3 that was already " +
      "in the cart).",
  ],
};

export async function run({ category, keyword, quantity, payment_method }) {
  const qty = quantity === undefined ? 1 : quantity;
  if (!Number.isInteger(qty) || qty < 1) {
    throw new Error("quantity must be a positive whole number");
  }

  browser.open("/");

  // 1) the cheapest product of the category whose name contains the keyword. The store's
  // product data intermittently answers a products query with an empty items list and no
  // error, so the page size is probed with the exact final query and each page is retried
  // before the scan treats an empty page as the end.
  const scan = browser.exec(
    `
    async function main() {
      const categoryName = ${JSON.stringify(category)};
      const keyword = ${JSON.stringify(keyword)};
      const BS = String.fromCharCode(92);
      const DQ = String.fromCharCode(34);
      const esc = (s) => String(s).split(BS).join(BS + BS).split(DQ).join(BS + DQ);
      const gql = async (query) => {
        const r = await fetch('/graphql', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: query })
        });
        const j = await r.json();
        if (j && j.errors && j.errors.length) {
          throw new Error('the store product data refused the query: ' + j.errors[0].message);
        }
        return j;
      };
      const itemsOf = (data, field) => (data && data.data && data.data[field] && data.data[field].items) || [];
      // the category's uid, from its display name
      const wanted = categoryName.toLowerCase();
      let cat = null;
      const byName = await gql('{ categories(filters: {name: {match: "%' + esc(categoryName) + '%"}}) { items { id uid name url_key } } }');
      const named = itemsOf(byName, 'categories');
      cat = named.find((c) => String(c.name).toLowerCase() === wanted) || named[0] || null;
      if (!cat) {
        const urlKey = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const byKey = await gql('{ categories(filters: {url_key: {eq: "' + urlKey + '"}}) { items { id uid name url_key } } }');
        cat = itemsOf(byKey, 'categories')[0] || null;
      }
      if (!cat) throw new Error('no category named "' + categoryName + '" in this store');
      // the category's products whose name matches the keyword, every page
      const priceOf = (p) => {
        const box = p && p.price_range && p.price_range.minimum_price && p.price_range.minimum_price.final_price;
        const n = Number(box ? box.value : null);
        return Number.isFinite(n) ? n : null;
      };
      const pageQuery = (ps, page) => '{ products(filter: {category_uid: {in: ["' + cat.uid + '"]}, name: {match: "%' + esc(keyword) + '%"}}, pageSize: ' + ps + ', currentPage: ' + page + ') { total_count items { name sku url_key price_range { minimum_price { final_price { value } } } } } }';
      let ps = null;
      for (const candidate of [100, 50, 25, 10, 5, 2]) {
        const data = await gql(pageQuery(candidate, 1));
        const list = (data && data.data && data.data.products && data.data.products.items) || [];
        if (list.length > 0) { ps = candidate; break; }
      }
      const all = [];
      let total = null;
      let complete = false;
      if (ps !== null) {
        let page = 1;
        while (page <= 300) {
          let list = [];
          for (let attempt = 0; attempt < 3 && list.length === 0; attempt++) {
            const data = await gql(pageQuery(ps, page));
            if (data && data.data && data.data.products) {
              list = data.data.products.items || [];
              if (total === null) total = (data.data.products.total_count) ?? null;
            }
          }
          if (!list.length) break;
          all.push(...list);
          if (total !== null && all.length >= total) { complete = true; break; }
          page += 1;
        }
      }
      // the cheapest of them; when the scan could not be completed, the store's own
      // price-ASC ordering says which product comes first and its price is read on its own
      const priced = all
        .map((p) => ({ name: p.name, price: priceOf(p), sku: p.sku || null, url_key: p.url_key || null }))
        .filter((x) => x.price !== null);
      let chosen = null;
      for (const x of priced) if (chosen === null || x.price < chosen.price) chosen = x;
      const ties = chosen ? priced.filter((x) => x.price === chosen.price).map((x) => x.name) : [];
      if (!complete || chosen === null) {
        const sorted = await gql('{ products(filter: {category_uid: {in: ["' + cat.uid + '"]}, name: {match: "%' + esc(keyword) + '%"}}, sort: {price: ASC}, pageSize: 6) { total_count items { name } } }');
        const first = itemsOf(sorted, 'products')[0] || null;
        if (first) {
          const one = await gql('{ products(filter: {name: {match: "%' + esc(first.name) + '%"}}, pageSize: 2) { items { name price_range { minimum_price { final_price { value } } } } } }');
          const exact = itemsOf(one, 'products').find((x) => x.name === first.name) || null;
          const p = exact ? priceOf(exact) : null;
          if (p !== null && (chosen === null || p <= chosen.price)) {
            chosen = { name: first.name, price: p, sku: null, url_key: null };
          }
        }
      }
      const out = {
        found: chosen !== null,
        name: chosen ? chosen.name : null,
        price: chosen ? chosen.price : null,
        sku: chosen ? chosen.sku : null,
        url_key: chosen ? chosen.url_key : null,
        ties: chosen && ties.length > 1 ? ties : null,
        complete: complete,
      };
      return out;
    }
    return await main();
    `,
    { timeout: "2m" }
  );

  if (!scan.found) {
    return {
      product: null,
      price: null,
      quantity: qty,
      added: false,
      option_used: null,
      product_url: null,
      scan_complete: scan.complete === true,
      ties: null,
      order_number: null,
      error: "No product in the '" + category + "' category has '" + keyword + "' in its name.",
    };
  }

  // 2) add it to the cart: the product's page, from the store's quick search, and its own
  // add-to-cart form posted with the requested quantity and any required custom option.
  const add = browser.exec(
    `
    async function main() {
      const NAME = ${JSON.stringify(scan.name)};
      const QTY = ${JSON.stringify(String(qty))};
      const QTYNUM = ${JSON.stringify(qty)};
      const URLKEY = ${JSON.stringify(scan.url_key || null)};
      const norm = (s) => String(s || "").replace(/\\s+/g, " ").trim();
      const parse = (html) => new DOMParser().parseFromString(html, "text/html");
      const readCart = async () => {
        const doc = parse(await (await fetch("/checkout/cart/")).text());
        return [...doc.querySelectorAll("tr.item, .cart.item")].map((tr) => {
          const n = tr.querySelector(".product-item-name");
          const q = tr.querySelector("input.qty, .qty input");
          return { name: n ? norm(n.textContent) : null, quantity: q ? norm(q.value) : null };
        });
      };
      const out = { skipped: false, posted: false, product_url: null, option_used: null, options: [], error: null };
      const pre = await readCart();
      const already = pre.find((i) => i.name === NAME);
      if (already && Number(already.quantity) === QTYNUM) {
        out.skipped = true;
        return out;
      }
      let productUrl = null;
      const queries = [NAME, NAME.replace(/\\s*\\([^()]*\\)\\s*$/, "").trim(), NAME.split(/\\s+/).slice(0, 5).join(" ")];
      for (const q of queries) {
        if (!q) continue;
        const doc = parse(await (await fetch("/catalogsearch/result/?q=" + encodeURIComponent(q))).text());
        const link = [...doc.querySelectorAll(".product-item-link")].find((a) => norm(a.textContent) === NAME);
        if (link) { productUrl = link.href; break; }
      }
      if (!productUrl && URLKEY) productUrl = "/" + URLKEY + ".html";
      if (!productUrl) {
        out.error = "the product's page was not found through the quick search or its url_key";
        return out;
      }
      out.product_url = productUrl;
      const pdoc = parse(await (await fetch(productUrl)).text());
      const form = pdoc.querySelector("form#product_addtocart_form");
      if (!form) {
        out.error = "the product page has no add-to-cart form";
        return out;
      }
      const fd = new FormData();
      for (const inp of form.querySelectorAll('input[type="hidden"]')) { if (inp.name) fd.append(inp.name, inp.value); }
      const groups = {};
      const controls = [...pdoc.querySelectorAll('#product-options-wrapper .field.required input[type="radio"], #product-options-wrapper .field.required select')];
      for (const control of controls) {
        if (control.name) (groups[control.name] = groups[control.name] || []).push(control);
      }
      for (const gname of Object.keys(groups)) {
        const list = groups[gname];
        if (list[0].tagName === "SELECT") {
          const opts = [...list[0].querySelectorAll("option")].filter((o) => o.value);
          const pick = opts[0];
          if (!pick) continue;
          fd.append(gname, pick.value);
          out.options.push(norm(pick.textContent));
        } else {
          const pick = list[0];
          if (!pick) continue;
          fd.append(gname, pick.value);
          const labels = [...pdoc.querySelectorAll("label")];
          const lab = labels.find((l) => l.getAttribute("for") === pick.id) || pick.closest("label") || pick.parentElement;
          out.options.push(lab ? norm(lab.textContent) : "");
        }
      }
      out.option_used = out.options.length ? out.options[0] : null;
      fd.set("qty", QTY);
      const res = await fetch(form.getAttribute("action"), { method: "POST", body: fd, credentials: "same-origin", redirect: "follow" });
      await res.text();
      out.posted = true;
      return out;
    }
    return await main();
    `,
    { timeout: "2m" }
  );

  if (!add.posted && !add.skipped) {
    return {
      product: scan.name,
      price: scan.price,
      quantity: qty,
      added: false,
      option_used: null,
      product_url: add.product_url,
      scan_complete: scan.complete === true,
      ties: scan.ties,
      order_number: null,
      error: add.error,
    };
  }

  // 3) the cart page read-back, which is the only reliable confirmation of the add
  const readBack = browser.exec(
    `
    const NAME = ${JSON.stringify(scan.name)};
    const norm = (s) => String(s || "").replace(/\\s+/g, " ").trim();
    const doc = new DOMParser().parseFromString(await (await fetch("/checkout/cart/")).text(), "text/html");
    const rows = [...doc.querySelectorAll("tr.item, .cart.item")].map((tr) => {
      const n = tr.querySelector(".product-item-name");
      const q = tr.querySelector("input.qty, .qty input");
      return { name: n ? norm(n.textContent) : null, quantity: q ? norm(q.value) : null };
    });
    const line = rows.find((r) => r.name === NAME) || null;
    const out = { cart_items: rows, line: line };
    return out;
    `
  );

  const line = readBack.line;
  const ok = line !== null && Number(line.quantity) === qty;
  if (!ok) {
    return {
      product: scan.name,
      price: scan.price,
      quantity: qty,
      added: false,
      option_used: add.skipped ? null : add.option_used,
      product_url: add.product_url,
      scan_complete: scan.complete === true,
      ties: scan.ties,
      order_number: null,
      error:
        line === null
          ? "The cart page does not show '" + scan.name + "' after the add."
          : "The cart read-back shows the product at quantity " + line.quantity + ", not " + qty + ".",
    };
  }

  // 4) the onepage checkout. The Proceed to Checkout click does not always navigate: check
  // the shipping step's own controls appeared, click again while the page is still the
  // cart, and only then open the checkout directly.
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

  // The success page shows the confirmation number once; read it, and recover it from the
  // shopper's order history when the one-time display is already gone.
  browser.waitFor('location.pathname.indexOf("/checkout/onepage/success/") !== -1', { timeoutMs: 20000 });
  const shown = browser.exec(`
    const m = document.body.innerText.match(/order number is:\\s*([0-9]+)/i);
    return { order_number: m ? m[1] : null };
  `);
  let orderNumber = shown.order_number;
  let error = null;

  if (!orderNumber) {
    const recovered = browser.exec(
      `
      async function main() {
        const NAME = ${JSON.stringify(scan.name)};
        const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
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
            if (view.text.indexOf(norm(NAME)) !== -1) {
              const num = (view.text.match(/Order\\s*#?\\s*(\\d{4,})/i) || [])[1] || null;
              if (num) return { order_number: num, reason: null };
            }
          }
          return { order_number: null, reason: 'no order in the shopper\\'s history lists this product' };
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
  if (!orderNumber && !error) {
    error = "the checkout reached the success page but no order number was shown";
  }

  return {
    product: scan.name,
    price: scan.price,
    quantity: qty,
    added: true,
    option_used: add.skipped ? null : add.option_used,
    product_url: add.product_url,
    scan_complete: scan.complete === true,
    ties: scan.ties,
    order_number: orderNumber,
    error: error,
  };
}

runApi(import.meta.url, meta, run);
