import { browser, runApi } from "./skillweaver-api.mjs";

export const meta = {
  name: "add_cheapest_matching_product_to_cart",
  description:
    "Add the cheapest product whose name contains a keyword within one store category to the " +
    "shopping cart at a given quantity, and read the cart back so the result confirms what is in it. " +
    "The cheapest is the lowest final price among every product of the category whose name contains " +
    "the keyword: the category's display name is resolved to its internal uid through the store's own " +
    "product data, and the category's products are then queried with a name match, page by page, until " +
    "the store's reported total is reached; products tied at the lowest price are all reported in ties. " +
    "Five things are unexpected but important. The store's product data intermittently answers a " +
    "products query with an empty items list and no error - the same query can fail once and succeed " +
    "minutes later - so the page size is probed with the exact final query before paging and every page " +
    "is retried before the scan gives up; a plain fixed-page-size loop can come back with nothing " +
    "although hundreds of products match. The category scope cannot come from the store's Advanced " +
    "Search, whose results endpoint ignores category parameters. The product's page is located through " +
    "the store's quick search, trying the full name, the name without a trailing parenthesised part " +
    "and its first five words, and falls back to the URL built from the url_key the data query " +
    "returned. The store answers the add-to-cart post with HTTP 200 and a redirect back to the product " +
    "page, with no success or error message either way, so the cart page read that follows is the only " +
    "reliable confirmation. And some products carry a required custom option (a radio list such as " +
    "'Size') without which the post is silently ignored - the first offered choice is taken and " +
    "reported in option_used. The cart keeps items from earlier visits, so cart_items can list more " +
    "than what this call added, and when the product is already in the cart at the requested quantity " +
    "the post is skipped.",
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
      description: "How many units to add; a positive whole number. Leave it out to add one.",
      optional: true,
    },
  },
  returns:
    "An object: product (the cheapest matching product's name, or null), price (its final price as a " +
    "number, or null), quantity (the number asked for), added (true when the cart read-back shows this " +
    "product at exactly this quantity), option_used (the label of the custom-option choice posted, or " +
    "null when the product needed none), product_url (the product page used, or null), scan_complete " +
    "(true when every matching product the store reported was seen), ties (the names of the other " +
    "products at the same lowest price, or null), cart_items (the cart's lines as {name, quantity} " +
    "after the add, or null when the product's page could not be found or the form could not be " +
    "posted), and error (a short reason when added is false).",
  usage_log: [
    "iter_8: category 'Grocery & Gourmet Food', keyword 'tea', quantity left out - the procedure was " +
      "carried out step by step with the agent browser (no registered API covered a cheapest-first " +
      "add): 487 of the category's products carry 'tea' in the name, the cheapest was 'Honest Tea " +
      "Organic Fair Trade Half Tea & Half Lemonade Gluten Free, 16.9 fl oz' at $1.32 (SKU B01HBB1LMG) " +
      "with no ties; the product page's add-to-cart form was posted with qty 1 and no custom option " +
      "(HTTP 200), and the cart read-back showed the product at quantity 1. In the same run the " +
      "search_products_in_category API returned [] for this category and keyword although 487 products " +
      "match, because the store's products query had answered with an empty items list - which is why " +
      "this API probes the page size and retries each page.",
    "iter_22: category 'Grocery & Gourmet Food', keyword 'tea', quantity 1 - the call returned " +
      "ok:true with product 'Honest Tea Organic Fair Trade Half Tea & Half Lemonade Gluten Free, " +
      "16.9 fl oz' at $1.32, scan_complete true (487 matching products), ties null, option_used " +
      "null and product_url the honest-tea-... product page; the cart read-back showed that product " +
      "at quantity 1 beside one item from an earlier visit (2 rows, 4 units in all), so added was " +
      "true and error null. The product's page was found through the quick search, so the url_key " +
      "fallback was not needed, and the product carried no required custom option.",
  ],
};

export async function run({ category, keyword, quantity }) {
  const qty = quantity === undefined ? 1 : quantity;
  if (!Number.isInteger(qty) || qty < 1) {
    throw new Error("quantity must be a positive whole number");
  }

  browser.open("/");

  const scan = browser.exec(
    `
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
    // 1) the category's uid, from its display name
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
    // 2) the category's products whose name matches the keyword, every page. The store
    // intermittently answers a products query with an empty items list and no error, so the
    // page size is probed with the exact final query and each page is retried before the
    // scan treats an empty page as the end.
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
    // 3) the cheapest of them; when the scan could not be completed, the store's own
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
      cart_items: null,
      error: "No product in the '" + category + "' category has '" + keyword + "' in its name.",
    };
  }

  const add = browser.exec(
    `
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
    // the product's page, from the store's quick search
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
    // a required custom option, whose first offered choice is taken when the caller named none
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
      cart_items: null,
      error: add.error,
    };
  }

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
  return {
    product: scan.name,
    price: scan.price,
    quantity: qty,
    added: ok,
    option_used: add.skipped ? null : add.option_used,
    product_url: add.product_url,
    scan_complete: scan.complete === true,
    ties: scan.ties,
    cart_items: readBack.cart_items,
    error: ok
      ? null
      : line === null
        ? "The cart page does not show '" + scan.name + "' after the add."
        : "The cart read-back shows the product at quantity " + line.quantity + ", not " + qty + ".",
  };
}

runApi(import.meta.url, meta, run);
