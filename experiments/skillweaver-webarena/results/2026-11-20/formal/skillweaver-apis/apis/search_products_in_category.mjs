import { browser, runApi } from "./skillweaver-api.mjs";

export const meta = {
  name: "search_products_in_category",
  description:
    "Find the products of one store category whose name contains a keyword, optionally within an " +
    "inclusive price range, and return their names and prices. The search starts on the store's " +
    "Advanced Search page and fills its Product Name and Price from/to fields for the name and " +
    "price part of the task. The form has no category field and its results endpoint ignores " +
    "category parameters, so the category scope is taken from the store's own data on the same " +
    "origin: the category's display name is resolved to its internal uid and the store's product " +
    "data is queried for that category with a name match, every result page. Prices are the " +
    "store's current final prices as numbers; both bounds are inclusive. The store's product data " +
    "intermittently answers a products query with an empty items list and no error - the same " +
    "query can fail once and succeed minutes later, and a query selecting the price range has " +
    "been seen to come back empty at a page size where the same query without it succeeds - so " +
    "the page size is probed with the exact final query before paging and every page is retried " +
    "before the scan gives up; a plain fixed-page-size loop can otherwise return nothing although " +
    "hundreds of products match. The final page script must end with a plain return-prefixed line " +
    "(a `return out;` statement) rather than a trailing multi-line `.map(...).filter(...)` chain: " +
    "`penguin browser exec` inspects a script's last non-empty line, and its fallback for a " +
    "script that does not end in `return` prepends `return ` to that line, which turned this API's " +
    "ending into `return .filter(...)` and failed with 'Unexpected token .' until the ending was " +
    "changed.",
  params: {
    category: {
      type: "string",
      description: "The category's name as the store's navigation shows it, e.g. \"Grocery & Gourmet Food\".",
    },
    keyword: {
      type: "string",
      description: "Words the product name must contain, as a shopper would type them.",
    },
    min_price: {
      type: "number",
      description: "Lowest price to keep, inclusive; leave out for no lower bound.",
      optional: true,
    },
    max_price: {
      type: "number",
      description: "Highest price to keep, inclusive; leave out for no upper bound.",
      optional: true,
    },
  },
  returns:
    "An array of {name, price} for the matching products, in the order the store returns them; " +
    "[] when nothing matches.",
  usage_log: [
    "iter_0: category \"Grocery & Gourmet Food\", keyword \"tea\", min_price 5, max_price 20 returned " +
      "237 products. The Advanced Search form itself reported 515 all-category hits (it has no " +
      "category field and its results endpoint ignores category parameters), so the category scope " +
      "came from the store's product data: the category resolved to uid \"MTQ=\" and 487 of its " +
      "products carry \"tea\" in the name.",
    "iter_2: category \"Grocery & Gourmet Food\", keyword \"gingerbread\", min_price 10, max_price 40 — " +
      "the call as shipped failed with {\"ok\":false,\"error\":\"penguin browser exec failed: " +
      "SyntaxError: Unexpected token '.'\"} (exit code 1) even though its earlier steps succeeded " +
      "(the form was filled and the results page loaded): the final script's last non-empty line " +
      "was the .filter(...) tail of a multi-line `return all ...` chain, and the exec's last-line " +
      "fallback prepended `return ` to it, yielding `return .filter(...)`. With only that ending " +
      "changed to `const out = ...; return out;` the identical script ran to success and returned " +
      "[] — no product in the category carries \"gingerbread\" in the name at $10.00-$40.00 " +
      "inclusive. The engine was not at fault (Electron 43 / Chromium 140 handles `??` fine).",
    "iter_8: category \"Grocery & Gourmet Food\", keyword \"tea\" with no price bounds returned [] " +
      "although the category holds 487 products with \"tea\" in the name: the store's products " +
      "query answered the fixed pageSize-100 pages with an empty items list and no error, so " +
      "nothing was collected and the filter had nothing to keep. Direct queries in the same run " +
      "showed the same query shape succeeding at pageSize 2 and, minutes later, at pageSize 100, " +
      "so the empty answers are intermittent rather than tied to one page size; the paging now " +
      "probes the page size with the exact final query and retries each page before treating an " +
      "empty page as the end.",
  ],
};

export async function run({ category, keyword, min_price, max_price }) {
  browser.open("/catalogsearch/advanced/");
  browser.exec(`
    const form = document.querySelector('#form-validate');
    if (!form) throw new Error('the Advanced Search form (#form-validate) is not on this page');
    const name = document.querySelector('#name');
    if (name) name.value = ${JSON.stringify(keyword)};
    const from = document.querySelector('#price');
    const to = document.querySelector('#price_to');
    if (from) from.value = ${JSON.stringify(min_price === undefined ? "" : min_price.toFixed(2))};
    if (to) to.value = ${JSON.stringify(max_price === undefined ? "" : max_price.toFixed(2))};
    form.submit();
    return true;
  `);
  const ready = browser.waitFor(
    "location.pathname.indexOf('/catalogsearch/advanced/result') === 0 && " +
      "(document.querySelector('.product-item-info') !== null || document.querySelector('.message') !== null)",
    { timeoutMs: 15000 }
  );
  if (ready !== true) throw new Error("the Advanced Search results page did not load");
  return browser.exec(
    `
    const categoryName = ${JSON.stringify(category)};
    const keyword = ${JSON.stringify(keyword)};
    const minPrice = ${JSON.stringify(min_price === undefined ? null : min_price)};
    const maxPrice = ${JSON.stringify(max_price === undefined ? null : max_price)};
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
    const pageQuery = (ps, page) => '{ products(filter: {category_uid: {in: ["' + cat.uid + '"]}, name: {match: "%' + esc(keyword) + '%"}}, pageSize: ' + ps + ', currentPage: ' + page + ') { total_count items { name price_range { minimum_price { final_price { value } } } } } }';
    let ps = null;
    for (const candidate of [100, 50, 25, 10, 5, 2]) {
      const data = await gql(pageQuery(candidate, 1));
      const list = (data && data.data && data.data.products && data.data.products.items) || [];
      if (list.length > 0) { ps = candidate; break; }
    }
    const all = [];
    let total = null;
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
        if (total !== null && all.length >= total) break;
        page += 1;
      }
    }
    // 3) keep the ones inside the price range, both ends included
    const priceOf = (p) => {
      const box = p && p.price_range && p.price_range.minimum_price && p.price_range.minimum_price.final_price;
      const n = Number(box ? box.value : null);
      return Number.isFinite(n) ? n : null;
    };
    const out = all
      .map((p) => ({ name: p.name, price: priceOf(p) }))
      .filter((x) => x.price !== null && (minPrice === null || x.price >= minPrice) && (maxPrice === null || x.price <= maxPrice));
    return out;
  `,
    { timeout: "2m" }
  );
}

runApi(import.meta.url, meta, run);
