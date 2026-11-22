import { browser, runApi } from "./skillweaver-api.mjs";

export const meta = {
  name: "buy_product_now",
  description:
    "Buy a named product now: find it through the store's search, add the requested quantity to the " +
    "shopping cart, complete the onepage checkout with the shopper's saved address and the store's " +
    "preselected payment method, and return the order confirmation number. " +
    "The product is located through the store's quick search at /catalogsearch/result/, trying the " +
    "full name, the name without a trailing parenthesised part, and its first five words until a " +
    "result link's name matches exactly; the product page's own add-to-cart form is then posted with " +
    "its hidden fields (including the form key) and the requested quantity, taking the first offered " +
    "choice of any required custom option (use add_product_to_cart when a specific choice is " +
    "needed). The cart page is read back to confirm the product is in the cart at the requested " +
    "quantity before the checkout starts, and the checkout then walks the onepage steps: Proceed to " +
    "Checkout, the shipping step (the signed-in shopper's saved address is already selected and " +
    "merely shown; the first shipping-method radio is checked only when the step has none checked), " +
    "Next, the payment step (the requested payment method is chosen by its visible label when one is " +
    "given, otherwise the step's own preselection is kept) and Place Order. " +
    "Six things are unexpected but important. " +
    "The store answers the add-to-cart post with HTTP 200 and a redirect back to the product page, " +
    "with no success or error message either way, so the cart page read is the only reliable " +
    "confirmation that the add took - and because the cart keeps items from earlier visits, the " +
    "order can contain more than the requested product. " +
    "Some products carry a required custom option without which the post is silently ignored; the " +
    "first offered choice is taken, so a caller that needs a specific choice should use " +
    "add_product_to_cart instead. " +
    "The Proceed to Checkout click does not always navigate - the page can stay on /checkout/cart/ " +
    "with no checkout hash and none of the shipping step's controls - and a wait that times out " +
    "only returns false, so the click is verified against the shipping step's own controls, " +
    "repeated once while the page is still the cart, and only then is the checkout opened directly " +
    "at /checkout/. " +
    "The checkout is a single page whose steps (/checkout/#shipping, then /checkout/#payment) are " +
    "knockout views that advance without a full navigation, so each step is waited on by its own " +
    "controls rather than by a new page load. " +
    "The store preselects the saved address, a shipping method and the Check / Money order payment " +
    "method, so the selection steps are usually confirmations rather than changes. " +
    "And the success page's order number is shown once: it is read from the rendered page text with " +
    "a regular expression (in the page's HTML it sits inside an anchor, so a raw-markup read can " +
    "catch the anchor's tag instead of the digits), and when that display has already been consumed " +
    "- or the tab never landed on the success page - the number is recovered from the shopper's " +
    "order history at /sales/order/history/ (and /customer/account/), whose order view links " +
    "(/sales/order/view/order_id/<id>/) are checked newest first for the one listing the product " +
    "just bought, its 'Order #' line holding the number; the cart page reading 'You have no items " +
    "in your shopping cart' is what shows the order did go through in that case.",
  params: {
    product_name: {
      type: "string",
      description:
        "The product's name exactly as the store shows it, e.g. \"Elmwood Inn Fine Teas, Orange Vanilla Caffeine-free Fruit Infusion, 16-Ounce Pouch\".",
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
    "An object: product (the name searched for), quantity (the number asked for), added (true when " +
    "the cart read-back before the checkout showed this product at exactly this quantity), " +
    "order_number (the confirmation number the success page showed, or the one recovered from the " +
    "shopper's order history, or null when the checkout produced none), and error (a short reason " +
    "when the purchase did not complete - the product was not found, the cart read-back did not " +
    "confirm it, or no confirmation number could be read - otherwise null).",
  usage_log: [
    "iter_18: product_name 'Elmwood Inn Fine Teas, Orange Vanilla Caffeine-free Fruit Infusion, 16-Ounce Pouch', quantity 1, payment_method left out - the procedure was carried out step by step with the agent browser (the registered add_product_to_cart and place_order_from_cart APIs covered its halves, and the checkout API failed at the shipping step's Next button because the Proceed to Checkout click had not navigated, so the checkout was completed with direct page scripts): the product was found through the store's quick search with no required custom option and added at quantity 1 beside four items from earlier visits; the onepage checkout ran on the saved address with the preselected Check / Money order method; the cart was emptied and the shopper's order history held order 000000192 (November 21, 2026, grand total $159.76) listing the tea among the ordered items.",
  ],
};

export async function run({ product_name, quantity, payment_method }) {
  const qty = quantity === undefined ? 1 : quantity;
  if (!Number.isInteger(qty) || qty < 1) {
    throw new Error("quantity must be a positive whole number");
  }

  browser.open("/");

  const addScript = `
    async function main() {
      const NAME = ${JSON.stringify(product_name)};
      const QTY = ${JSON.stringify(String(qty))};
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
      if (!productUrl) return { ok: false, error: 'product not found', product_url: null };

      const pdoc = parse(await (await fetch(productUrl)).text());
      const form = pdoc.querySelector('form#product_addtocart_form');
      if (!form) {
        return { ok: false, error: 'the product page has no add-to-cart form', product_url: productUrl };
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
      return { ok: true, product_url: productUrl, options: chosen };
    }
    return await main();
  `;
  const added = browser.exec(addScript);

  if (!added.ok) {
    return {
      product: product_name,
      quantity: qty,
      added: false,
      order_number: null,
      error: added.error,
    };
  }

  const cartScript = `
    async function main() {
      const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
      const doc = new DOMParser().parseFromString(
        await (await fetch('/checkout/cart/')).text(),
        'text/html'
      );
      const items = [...doc.querySelectorAll('tr.item, .cart.item')].map((tr) => {
        const n = tr.querySelector('.product-item-name');
        const q = tr.querySelector('input.qty, .qty input');
        return { name: n ? norm(n.textContent) : null, quantity: q ? norm(q.value) : null };
      });
      return { items: items };
    }
    return await main();
  `;
  const cart = browser.exec(cartScript);
  const lines = cart.items || [];
  const line = lines.find((item) => item.name === product_name);

  if (!line || Number(line.quantity) !== qty) {
    return {
      product: product_name,
      quantity: qty,
      added: false,
      order_number: null,
      error: "the cart read-back does not show this product at quantity " + qty,
    };
  }

  browser.open("/checkout/cart/");
  browser.waitFor('document.querySelector(\'button[data-role="proceed-to-checkout"]\')');

  // The Proceed to Checkout click does not always navigate: check the shipping step's
  // own controls appeared, click again while the page is still the cart, and only
  // then open the checkout directly.
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

  // The success page shows the confirmation number once; read it, and recover it from
  // the shopper's order history when the one-time display is already gone.
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
        const NAME = ${JSON.stringify(product_name)};
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
    product: product_name,
    quantity: qty,
    added: true,
    order_number: orderNumber,
    error: error,
  };
}

runApi(import.meta.url, meta, run);
