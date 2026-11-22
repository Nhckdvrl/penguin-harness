import { browser, runApi } from "./skillweaver-api.mjs";

export const meta = {
  name: "place_order_from_cart",
  description:
    "Place an order for everything currently in the shopping cart and return the order confirmation number the store's success page shows. " +
    "The procedure walks the onepage checkout: it opens the cart page at /checkout/cart/, clicks Proceed to Checkout, and on the shipping step relies on the signed-in shopper's saved address, which the step already has selected and merely shows - there is no address radio to click - checking the first shipping-method radio only when the step has none checked; the Next button advances to the payment step, where the requested payment method is chosen by its visible label and the billing-same-as-shipping box is left as the page has it, and the Place Order button, found among the page's buttons by its text, submits the order. " +
    "Five things are unexpected but important: on the cart page the working Proceed to Checkout control is button[data-role=\"proceed-to-checkout\"], because the button.action.primary.checkout element is a hidden duplicate with no size and clicking it fails; the checkout is a single page whose steps (/checkout/#shipping, then /checkout/#payment) are knockout views that advance without a full navigation, so the script waits on each step's own controls rather than on a new page load; the store preselects the saved address, a shipping method and the Check / Money order payment method, so the selection steps are usually confirmations rather than changes; the confirmation number is read from the success page's text with a regular expression, never a literal; and the Proceed to Checkout click does not always navigate - the page can stay on /checkout/cart/ with no checkout hash and none of the shipping step's controls, and a wait that times out only returns false, so the click is verified against the shipping step's own controls, repeated once while the page is still the cart, and only then is the checkout opened directly at /checkout/.",
  params: {
    payment_method: {
      type: "string",
      description:
        "The payment method to choose, as the payment step shows it, e.g. \"Check / Money Order\". Leave it out to keep the method the step already has selected.",
      optional: true,
    },
  },
  returns:
    "An object: order_number (the confirmation number the success page shows, e.g. \"000000190\", or null when the checkout did not reach a success page) and error (a short reason when order_number is null, otherwise null).",
  usage_log: [
    "iter_7: payment_method left out - the cart at /checkout/cart/ held 7 items (12 units, subtotal $511.94); Proceed to Checkout was clicked through button[data-role=\"proceed-to-checkout\"] (the button.action.primary.checkout element is hidden and its click failed first); the shipping step preselected the saved address (<REDACTED>, <REDACTED>, San Mateo, California 94010) and the single shipping method (flatrate_flatrate, Flat Rate - Fixed, $60.00, already checked); Next advanced to the payment step, where Check / Money order (payment[method]=checkmo) was preselected with the billing-same-as-shipping box checked; Place Order reached /checkout/onepage/success/ and the read-back returned order number 000000190, with the mini-cart emptied.",
    "iter_18: payment_method left out - the cart at /checkout/cart/ held 5 rows (10 units) after the tea was added; the click on button[data-role=\"proceed-to-checkout\"] did not navigate - the page stayed at /checkout/cart/ with an empty hash and no button.action.continue.primary - and because browser.waitFor only returns false on a timeout, the click that followed failed with 'No element matches button.action.continue.primary' and the call returned ok:false; the checkout was then completed with direct page scripts (the click repeated, then /checkout/ opened directly), which is why the click is now verified against the shipping step's controls and retried while the page is still the cart before the checkout is opened directly.",
    "iter_22: payment_method left out - the cart at /checkout/cart/ held 2 rows (4 units): the Honest Tea Organic Fair Trade Half Tea & Half Lemonade Gluten Free, 16.9 fl oz at quantity 1 that add_cheapest_matching_product_to_cart had just added, and one item from an earlier visit; Proceed to Checkout was clicked through button[data-role=\"proceed-to-checkout\"] and the shipping step's own controls appeared, so the checkout ran on the signed-in shopper's saved address with the step's own selections kept, Next advanced to the payment step where Check / Money order (payment[method]=checkmo) was kept as the step's preselection, and Place Order reached /checkout/onepage/success/ and the read-back returned order number 000000195 (grand total $45.08), with the mini-cart emptied. The non-navigating click of iter_18 did not recur, and the same number was read again from the success page's text and from the shopper's order history and order view, which also showed the payment method as Check / Money order.",
  ],
};

export async function run({ payment_method }) {
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

  browser.waitFor('location.pathname.indexOf("/checkout/onepage/success/") !== -1', { timeoutMs: 20000 });
  const result = browser.exec(`
    const m = document.body.innerText.match(/order number is:\\s*([^\\s.]+)/i);
    return { order_number: m ? m[1] : null };
  `);
  if (!result.order_number) {
    return { order_number: null, error: "the checkout reached the success page but no order number was shown" };
  }
  return { order_number: result.order_number, error: null };
}

runApi(import.meta.url, meta, run);
