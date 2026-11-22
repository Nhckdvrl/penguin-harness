if (location.origin !== "http://localhost:7770" || !/^\/customer\/account\/(?:index\/)?$/.test(location.pathname)) {
  throw new Error("Unexpected fixture account page");
}
const resources = [
  "/checkout/cart/",
  "/customer/address/",
  "/multishipping/checkout/",
  "/checkout/cart/",
];
const result = [];
for (const path of resources) {
  const response = await fetch(path, {method: "GET", credentials: "same-origin"});
  if (new URL(response.url).origin !== location.origin || response.status !== 200) {
    throw new Error("Fixture page was unavailable: " + path);
  }
  await response.text();
  result.push(path);
}
return result;
