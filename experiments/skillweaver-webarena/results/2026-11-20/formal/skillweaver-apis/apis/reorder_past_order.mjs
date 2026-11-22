import { browser, runApi } from "./skillweaver-api.mjs";

export const meta = {
  name: "reorder_past_order",
  description:
    "Buy again everything from one of the shopper's past orders: find the order in the shopper's " +
    "order history, click its Reorder link to put every product in the order back into the shopping " +
    "cart at the quantities the order lists, and place the order through the onepage checkout, " +
    "returning the new order confirmation number. " +
    "The order is located by the number the history shows (for example '000000195') in its row of the " +
    "history table at /sales/order/history/, where each row states the order's number, date, grand " +
    "total and status beside View Order and Reorder links; the history lists the ten most recent " +
    "orders per page, newest first, with a pager, so an order older than the page shown has to have " +
    "its page opened first. " +
    "The row's Reorder control is an anchor whose visible text is 'Reorder' and whose href is only " +
    "'#' - it carries no address of its own - and clicking it is the store's own reorder: the store " +
    "puts the order's products into the cart at the quantities the order lists and navigates to the " +
    "cart page at /checkout/cart/, while this API only clicks the link and reads the cart back. That " +
    "read-back is the confirmation, the same way the library's add APIs confirm a post: the cart " +
    "keeps items from earlier visits and the reorder adds the order's units to whatever the cart " +
    "already holds, so the cart can list more lines and more units than the order has, and the call " +
    "reports the cart's lines and its order total as the cart page showed them. When the click " +
    "leaves the page on the history, the link's own request - carried in a data-post attribute the " +
    "way the store's other '#'-href controls carry theirs - is posted from a page on the store's " +
    "origin with the history page's own form key added when the page exposes one, the same way the " +
    "library's wish-list and cart-delete APIs post such requests. " +
    "The checkout then walks the onepage steps for everything now in the cart: Proceed to Checkout, " +
    "the shipping step (the signed-in shopper's saved address is already selected and merely shown; " +
    "the first shipping-method radio is checked only when the step has none checked), Next, the " +
    "payment step (the requested payment method is chosen by its visible label when one is given, " +
    "otherwise the step's own preselection is kept) and Place Order. " +
    "Five things are unexpected but important. " +
    "On the cart page the working Proceed to Checkout control is " +
    "button[data-role=\"proceed-to-checkout\"], because the button.action.primary.checkout element " +
    "is a hidden duplicate with no size and clicking it fails. " +
    "That click does not always navigate - the page can stay on /checkout/cart/ with no checkout " +
    "hash and none of the shipping step's controls, and a wait that times out only returns false - " +
    "so the click is verified against the shipping step's own controls, repeated once while the page " +
    "is still the cart, and only then is the checkout opened directly at /checkout/. " +
    "The checkout is a single page whose steps (/checkout/#shipping, then /checkout/#payment) are " +
    "knockout views that advance without a full navigation, so each step is waited on by its own " +
    "controls rather than by a new page load. " +
    "The store preselects the saved address, a shipping method and the Check / Money order payment " +
    "method, so the selection steps are usually confirmations rather than changes. " +
    "And the success page's order number is shown once: it is read from the rendered page text with a " +
    "regular expression, never a literal, and when that display has already been consumed - or the " +
    "tab never landed on the success page - the number is recovered from the shopper's order history " +
    "at /sales/order/history/ (and /customer/account/), whose order views " +
    "(/sales/order/view/order_id/<id>/) are listed newest first, the newest being the order just " +
    "placed; the cart page reading 'You have no items in your shopping cart' is what shows the order " +
    "did go through in that case.",
  params: {
    order_number: {
      type: "string",
      description: "The order's number as the shopper's order history shows it, e.g. \"000000195\".",
    },
    payment_method: {
      type: "string",
      description:
        "The payment method to choose, as the payment step shows it, e.g. \"Check / Money Order\". Leave it out to keep the method the step already has selected.",
      optional: true,
    },
  },
  returns:
    "An object: order_number (the new order's confirmation number, e.g. \"000000197\", or null when " +
    "the checkout produced none), reordered_items (the cart's lines as {name, quantity} in page order " +
    "after the Reorder click, which can hold more than the order's lines when the cart already had " +
    "items), order_total (the cart's order total as the cart page showed it, e.g. \"$45.08\", or " +
    "null), and error (a short reason when the order was not found on the history page, its Reorder " +
    "link did not refill the cart, or the checkout did not complete - otherwise null).",
  usage_log: [
    "iter_24: order_number '000000195', payment_method left out - the procedure was carried out step " +
      "by step with the agent browser (no registered API covered a reorder): the order history at " +
      "/sales/order/history/ listed order 000000195 (11/21/26, $45.08, Pending) with View Order and " +
      "Reorder links while the mini-cart was empty; the Reorder anchor in the order's row (its href " +
      "is only '#') was clicked and the page navigated to /checkout/cart/, which held the order's two " +
      "products at the order's quantities - Tony Chachere's More Spice Creole Seasoning - 14 oz at " +
      "quantity 3 ($7.92 each, $23.76) and Honest Tea Organic Fair Trade Half Tea & Half Lemonade " +
      "Gluten Free, 16.9 fl oz at quantity 1 ($1.32) - subtotal $25.08, shipping $20.00, order total " +
      "$45.08, identical to the order's own total in the history; the onepage checkout then ran on " +
      "the shopper's saved address (<REDACTED>, <REDACTED>, San Mateo, California 94010) with " +
      "the already-checked Flat Rate - Fixed $20.00 shipping method and the preselected Check / Money " +
      "order payment method, and the success page at /checkout/onepage/success/ showed the new order " +
      "number 000000197 - one above 000000196, the most recent order in the history beforehand.",
  ],
};

// Read the cart page and report its lines, its order total and its unit count.
const cartReadScript = `
  async function main() {
    const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim();
    const doc = new DOMParser().parseFromString(
      await (await fetch('/checkout/cart/')).text(),
      'text/html'
    );
    const rows = [...doc.querySelectorAll('tr.item, tr.item-info, .cart.item')].map((tr) => {
      const n = tr.querySelector('.product-item-name');
      const q = tr.querySelector('input.qty, input[data-role=cart-item-qty], input[name^="cart["]');
      return { name: n ? norm(n.textContent) : null, quantity: q ? norm(q.value) : null };
    });
    const empty = norm(doc.querySelector('.cart-empty') ? doc.querySelector('.cart-empty').textContent : '');
    const text = norm(doc.body ? doc.body.textContent : '');
    const m = text.match(/Order Total\\s*(\\$?\\s*[\\d,]+\\.\\d{2})/);
    const order_total = m ? m[1].replace(/\\s+/g, '') : null;
    const units = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    const out = { empty: empty, items: rows, order_total: order_total, units: units };
    return out;
  }
  return await main();
`;

export async function run({ order_number, payment_method }) {
  // 1) the order's row on the shopper's order history
  browser.open("/sales/order/history/");
  browser.waitFor(
    "location.pathname.indexOf('/sales/order/history/') !== -1 && document.readyState === 'complete'"
  );

  // The cart before the click, so the read-back after it can tell the reorder's own units
  // apart from items the cart already held.
  const before = browser.exec(cartReadScript, { timeout: "2m" });

  // 2) the order's Reorder link, clicked; the store then refills the cart and navigates to it
  const clicked = browser.exec(`
    const NUMBER = ${JSON.stringify(order_number)};
    const rows = [...document.querySelectorAll('tr')];
    const row = rows.find((r) => r.textContent.indexOf(NUMBER) !== -1) || null;
    if (!row) {
      const out = { ok: false, error: 'no row for order ' + NUMBER + ' on the order history page as it is shown' };
      return out;
    }
    const link = [...row.querySelectorAll('a')].find((a) => a.textContent.replace(/\\s+/g, ' ').trim() === 'Reorder') || null;
    if (!link) {
      const out = { ok: false, error: 'the row of order ' + NUMBER + ' carries no Reorder link' };
      return out;
    }
    link.click();
    const out = { ok: true };
    return out;
  `);
  if (!clicked.ok) {
    return { order_number: null, reordered_items: null, order_total: null, error: clicked.error };
  }

  const atCart = browser.waitFor(
    "location.pathname.indexOf('/checkout/cart') !== -1 && document.readyState === 'complete'",
    { timeoutMs: 15000 }
  );

  // The click left the page on the history: post the link's own request the way the library's
  // wish-list and cart-delete APIs post the store's '#'-href controls. The cart read-back
  // below is the confirmation either way.
  let postError = null;
  if (atCart !== true) {
    const posted = browser.exec(
      `
      const NUMBER = ${JSON.stringify(order_number)};
      async function main() {
        const rows = [...document.querySelectorAll('tr')];
        const row = rows.find((r) => r.textContent.indexOf(NUMBER) !== -1) || null;
        const link = row
          ? [...row.querySelectorAll('a')].find((a) => a.textContent.replace(/\\s+/g, ' ').trim() === 'Reorder')
          : null;
        if (!link) {
          const out = { ok: false, error: 'the Reorder link is no longer on the page' };
          return out;
        }
        let post = null;
        try { post = JSON.parse(link.getAttribute('data-post') || ''); } catch (e) { post = null; }
        if (!post || !post.action) {
          const out = { ok: false, error: 'the Reorder link carries no request to post' };
          return out;
        }
        const fd = new URLSearchParams();
        const data = post.data || {};
        for (const key of Object.keys(data)) fd.append(key, String(data[key]));
        const formKey = document.querySelector('input[name="form_key"]');
        if (formKey && formKey.value && !fd.has('form_key')) fd.append('form_key', formKey.value);
        const res = await fetch(post.action, { method: 'POST', body: fd, credentials: 'same-origin', redirect: 'follow' });
        await res.text();
        const out = { ok: res.ok, status: res.status };
        return out;
      }
      return await main();
    `,
      { timeout: "2m" }
    );
    if (!posted.ok) postError = posted.error;
  }

  // 3) the cart page read-back: the store's Reorder restores the order's quantities, and this
  // read is the confirmation, the same way the library's add APIs confirm a post
  const after = browser.exec(cartReadScript, { timeout: "2m" });
  const refilled = after.items.length > 0 && after.units > before.units;
  if (!refilled) {
    return {
      order_number: null,
      reordered_items: after.items,
      order_total: after.order_total,
      error: postError
        ? "the order's Reorder link did not refill the cart: " + postError
        : "the order's Reorder link did not put the order's products back into the shopping cart",
    };
  }

  // 4) the onepage checkout for everything now in the cart. The Proceed to Checkout click does
  // not always navigate: check the shipping step's own controls appeared, click again while the
  // page is still the cart, and only then open the checkout directly.
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
    const out = { order_number: m ? m[1] : null };
    return out;
  `);
  let orderNumber = shown.order_number;
  let error = null;

  if (!orderNumber) {
    const recovered = browser.exec(
      `
      async function main() {
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
            const num = (view.text.match(/Order\\s*#?\\s*(\\d{4,})/i) || [])[1] || null;
            if (num) return { order_number: num, reason: null };
          }
          return { order_number: null, reason: 'no order number could be read from the success page or the shopper order history' };
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

  return {
    order_number: orderNumber,
    reordered_items: after.items,
    order_total: after.order_total,
    error: error,
  };
}

runApi(import.meta.url, meta, run);
