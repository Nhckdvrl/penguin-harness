# One Stop Market

One Stop Market is a Magento 2 storefront served at http://localhost:7770. The catalog spans a
dozen top-level categories, and every page carries the same header, footer and search block. The
shopper in these observations was signed in as <REDACTED>: the header greeted "Welcome, Emma
Lopez!" beside a mini-cart holding items, the cart page showed those earlier items beside the
ones added here, and the shopper's saved address was used to place an order at checkout. The
observations cover adding products to the cart, adding every product featured in the homepage's
Product Showcases row to the cart in one batch — including walking the row's own pager through
all of its pages so every featured product is read and added — changing a cart quantity, taking
an item back out of the cart, emptying the whole shopping cart, moving an item from the shopping
cart to the wish list, buying the cheapest matching product in a category, placing an order and
recovering its confirmation number
from the shopper's order history, buying a past order again through the Reorder link of the
shopper's order history, adding a product to the wish list, putting every wish-list item into the
cart at once through the wish list's Add All to Cart button, putting every wish-list item into
the cart at exactly the quantity the wish list lists without placing an order, reading a cart
of more than twenty rows through the cart page's own pager, and taking an item back out of the
wish list.

## Header, search and navigation

The header holds the account links (My Account, My Wish List, Sign Out), the mini-cart with its
item count, and the store logo. Below it sit the mini search form, labelled "Search entire store
here...", and next to it an "Advanced Search" link, repeated among the footer links. The
navigation strip lists the top-level categories: Beauty & Personal Care, Sports & Outdoors,
Clothing, Shoes & Jewelry, Home & Kitchen, Office Products, Tools & Home Improvement, Health &
Household, Patio, Lawn & Garden, Electronics, Cell Phones & Accessories, Video Games, and Grocery
& Gourmet Food. The homepage shows a "Product Showcases" row of featured products with ratings,
prices and Add to Cart buttons, and each featured product's name is a link to its own product
page. The row is paginated — the row observed here read "Items 1 to 12 of 24 total", so
twenty-four products are featured and twelve are shown at a time — and the names it shows are the
products' exact names, which can be far longer than a shopper's shorthand for them: one featured
product's full name is "Belle Of The Ball Princess Sprinkle Mix| Wedding Colorful Sprinkles| Cake
Cupcake Cookie Sprinkles| Ice cream Candy Sprinkles| Yellow Gold Red Royal Red Rose Icing Flowers
Decorating Sprinkles, 8OZ", another reads "V8 +Energy, Healthy Energy Drink, Steady Energy from
Black and Green Tea, Pomegranate Blueberry, 8 Ounce Can ,Pack of 24" with a space before its
comma, and a third carries a parenthesised ingredient suffix, "Cheongeun Sweet Potato Starch
Powder 500g, 2ea(Sweet Potato 55%, Corn 45%)". Each featured product's name link carries the
product-item-link class, the same product blocks the category and search-result pages use, so the
row's products can be read off the homepage by their name links. The row's pager is a `.pager`
element that holds the row's amount toolbar and its page links: a numbered link per page (an
`a.page` anchor whose visible text is "Page 2", "Page 3", and so on) and an "action next" link
beside it, all carrying the row's own page address — the homepage URL with the row's page
parameter, `?pbaocw=2` for the second page. The amount toolbar states the row's totals ("Items 1
to 12 of 24 total" on the first page, "Items 13 to 24 of 24 total" on the second), so the row's
own total is the signal for when every featured product has been seen. The header's mini-cart is
rendered client-side, so a static read of a freshly loaded page can still show its empty template
— "My Cart 0" beside "You have no items in your shopping cart." — even when the cart table below
lists every item; the cart table is the authoritative read. The mini search form runs a quick
keyword search at /catalogsearch/result/, which lists the matching products in the same product
blocks as the category pages. The search matches on the words given, so a query built from a
product's leading words is enough to surface it, and each result block carries the product's name
as a link — the product can be picked out of the results by comparing that link's text with the
exact name wanted.

## Advanced Search

The Advanced Search page lives at /catalogsearch/advanced/ and holds a single form that submits
by GET to /catalogsearch/advanced/result/. Its fields are Product Name, SKU, Description, Short
Description, Price from and Price to, plus a hidden currency field (USD by default), and one
Search button. There is no category field: an advanced search always covers the whole catalog,
whatever the category navigation shows.

## Advanced Search results

The results page states how many items were found and repeats the criteria used (for example,
"515 items were found using the following search criteria - Product Name: tea, Price: $5.00 -
$20.00"), then lists the matches twelve to a page. Each product block carries its name link, its
final price with the currency sign, its rating and an Add to Cart button; a Sort By control and a
grid/list view switcher sit above the list, and "Don't see what you're looking for? Modify your
search." leads back to the form. The results endpoint honours the form's own parameters (name,
sku, description, short_description, price from and to) but ignores category parameters: adding
cat, category or category_id to the URL leaves the result set unchanged. A category therefore
cannot be scoped through this search, and its hit count is always an all-category count.

## Category pages

Each navigation entry opens its category page at a readable URL — Grocery & Gourmet Food is
/grocery-gourmet-food.html — listing that category's products twelve per page with a toolbar that
states the total ("Items 1-12 of 17938" for Grocery & Gourmet Food, a count that includes its
subcategories). Pages continue with a p parameter (page 2, 3, and so on). One rendered page can
show fewer items than a full one, so a page coming back short does not mean the listing has
ended; the toolbar's total is the reliable end signal.

## Product data on the same origin

The store serves its catalog data from a GraphQL endpoint at /graphql on the same origin, which
page scripts can call directly. Categories are looked up by their readable URL key (the slug the
navigation uses, e.g. grocery-gourmet-food) and each returns an internal id and a uid; product
queries need the uid, not the numeric id (Grocery & Gourmet Food is id 14, uid "MTQ="). Products
are then queried by category uid together with a name match written with % wildcards, a hundred
at a time and a page at a time; each product returns its name, SKU and price range, and the price
to report is the final price of the minimum price. A product query can also ask for the product's
url_key, the slug its page's URL is built from (the cheapest tea's page was
/honest-tea-organic-fair-trade-half-tea-half-lemonade-gluten-free-16-9-fl-oz.html). The query
reports a total_count, which is the reliable signal for when the last page has arrived.

The products query also takes a sort argument: sort {price: ASC} returns the cheapest matching
products first and sort {price: DESC} the dearest, which is a second way to find an extreme price
when a full scan is not practical.

The products query is not perfectly dependable: it intermittently answers with an empty items
list and no error, so a page that comes back empty is not proof that the listing has ended. The
same query — same filter, same page size, same page number — has been seen to return nothing
once and a full page minutes later, and a query that selects the price range has been seen to
return nothing at a page size where the same query without it succeeds. Paging through a
category therefore works best when the page size is first probed with the exact query that will
be used, trying the largest sizes first, and each page is requested again when it comes back
empty before the scan gives up.

## Product pages

A product page shows the product's name as its heading, its final price with the currency sign,
its SKU, its stock state ("In stock"), its rating, and the add-to-cart form. The form is the
store's own product_addtocart_form; it posts to /checkout/cart/add/ with a URL that names the
product, and it carries hidden fields for the product and item ids, the form key, related
products and the return URL, plus a visible quantity field that defaults to 1. A product page can
be fetched and its form posted from a page script on the same origin, which is how products were
added here. Below the add-to-cart form sits the product's "Add to Wish List" control (see Adding
a product to the wish list).

## Adding a product to the cart

Posting the product page's add-to-cart form with the quantity and any required custom-option
choice adds the product to the cart. The store answers such a post with HTTP 200 and a redirect
back to the product page, and the landing page carries no success or error message whether the
add worked or not — a post that is missing a required option choice is silently ignored. The only
reliable confirmation is the shopping cart page, which lists every item in the cart with its
quantity; the added product appears there at the requested quantity. A successful add also leaves
a one-time confirmation banner waiting on the next load of the cart page (see Shopping cart),
which is a second way to tell that an add took. Adding several products is the same procedure
repeated per product, in the order the shopper lists them.

An add is additive to an existing cart line rather than a set: when the cart already holds the
product, the store raises that row's quantity by the quantity posted instead of setting it to it
— a product already in the cart at 2 that is added at quantity 1 comes back at 3 — so the added
product appears at the requested quantity only when the cart held none of it beforehand. Setting
an exact quantity on a row the cart already holds is the cart page's own Update Shopping Cart
form (see Changing a cart quantity). This was observed when a wish-list item that an earlier
visit had left in the cart at 2 was added at its listed quantity of 1 and came back at 3, after
which the update form set the row to 1. It was observed again in a batch add of a whole showcase
row: twelve of the featured products were already in the cart from earlier visits — eleven at
quantity 2 and the Stove Top stuffing mix at quantity 1 — and adding one of each brought them
back at 3 and 2 respectively, while the twelve products the cart did not hold came back at
exactly 1.

## Adding the homepage's showcase products to the cart

The products the homepage's Product Showcases row shows can all be put in the cart in one batch,
one of each. The row is read for its products' exact names in row order — each name is the link
text of a product-item-link element, the same product blocks the category and search pages use —
and each product is then added the ordinary way, located through the quick search and its product
page's add-to-cart form posted at the quantity wanted with the first offered choice of any
required custom option.

Because the row is paginated, reading it completely means walking the row's own pager: the row's
amount toolbar states its totals ("Items 1 to 12 of 24 total" on the first page, "Items 13 to 24
of 24 total" on the second), and its `.pager` element carries a numbered link per page (an
`a.page` anchor reading "Page 2") and an "action next" link, both pointing at the row's own page
address — the homepage URL with the row's page parameter (`?pbaocw=2`). Clicking the pager's
second-page link (or opening that address) reloads the row with the next twelve products, and the
walk stops when the number of names read matches the total the toolbar states. This was observed
with all twenty-four featured products: the first page's twelve names were read, the pager's page
2 link was clicked, the reloaded row's twelve more names were read, and the twenty-four distinct
names were then added in one batch at quantity 1. Six of them needed a required custom option and
took the first offered choice — the Belle Of The Ball sprinkle mix with "2 Ounce (Pack of 1)",
the Stove Top stuffing mix with "12 Ounce (Pack of 1)", the Crunchy Rice Rollers with "White
Rice", the 20 PCS Balls Cake Topper ... Cake Decoration with "Black", the Amosfun 100pcs Cupcake
Toppers ... (Welsh) with "Greece" and the Krusteaz Buttermilk Pancake Mix (10 lb.) with "10 Pound
(Pack of 1)". The cart page then listed all twenty-four rows, and because the cart already held
twelve of them from earlier visits, those rows read at the held quantity plus one while the other
twelve read at exactly 1 (see Adding a product to the cart).

The cart page read that confirms such a batch has to be taken page by page too, because the cart
page itself paginates (see Shopping cart): the cart of twenty-four rows read "Items 1 to 20 of 24
total" on its first page and "Items 21 to 24 of 24 total" on its second, the last four products —
the curry paste, the Chao Thai coconut powder, the Viva Doria peppercorns and the Krusteaz pancake
mix — sitting on the second page at quantity 1.

## Required custom options

Some products carry a custom option the shopper must choose, shown on the product page as a
required field — for example a "Size" radio list whose choices are labelled "12 Ounce (Pack of 1)"
and "12 Ounce (Pack of 3)". The choice is posted under the option's own field name (options[...])
with the chosen radio's internal value, which differs from the label; a page script can read the
label beside each radio to map between the two, and the Add to Cart button stays disabled on the
raw page until a choice is made. The labels are the store's own data and need not match the
product's name: the product "Stove Top Turkey Stuffing Mix (12 oz Boxes, Pack of 2)" offers only
Pack of 1 and Pack of 3 choices despite its name, and both are priced the same, so any add of
that product has to pick one of the offered choices. The required option is not always a size
list: the "Belle Of The Ball Princess Sprinkle Mix| ... , 8OZ" carries one whose first offered
choice is "2 Ounce (Pack of 1)", and the "Crunchy Rice Rollers - Gluten Free - Vegan - 3.5 oz
Individual Packs (4 Packs of 8 Rollers)" carries a flavour list whose first offered choice is
"White Rice". Nor is it always a size, flavour or pack list: the "20 PCS Balls Cake Topper ... Cake
Decoration" carries a colour list whose first offered choice is "Black", the "Amosfun 100pcs
Cupcake Toppers ... (Welsh)" a country list whose first offered choice is "Greece", and the
"Krusteaz Buttermilk Pancake Mix (10 lb.)" a pack-size list whose first offered choice is "10
Pound (Pack of 1)". A batch add that leaves the choice to the store takes the first offered
choice of each and reports it, which is what the showcase-row batch did for these six products.

## Shopping cart

The cart lives at /checkout/cart/ and is headed "Shopping Cart". It holds one row per item with
the product's name and its quantity, keeps items from earlier visits, and when nothing is in it
shows "You have no items in your shopping cart." with the header's mini-cart count at 0 (see
Emptying the shopping cart). Reading this page is the way to confirm what the cart contains,
after an add, after a removal, after a reorder, or at any other time. Each row shows the
product's name, the labels of any custom options chosen for it (for example "Size Large, Color
Blue"), the unit price, a quantity input whose id is cart-<item>-qty and whose name is
cart[<item>][qty], and the line subtotal. The row itself is narrow: an item row carries four
cells only — item, price, qty and subtotal — and its Edit, Move to Wishlist and Remove item
controls are not in it. Those controls sit in the page's own action row, which is a separate
element beside the item row rather than a cell inside it, so a row cannot be acted on by looking
for a link within it. Each item is instead tied to its controls through the cart item id the
store assigns: the same number appears in the row's quantity input name, in the remove control's
own request, and in the Move to Wishlist control's own request (see Moving an item from the cart
to the wish list). Below the table sit Continue Shopping and Update Shopping Cart, and the
Summary block holds Estimate Shipping and Tax, Apply Discount Code, Proceed to Checkout and Check
Out with Multiple Addresses; the Summary also states the cart's Subtotal, the Shipping line and
the cart's Order Total. After a successful add, the next load of this page can carry a one-time
"You added <product name> to your shopping cart." banner; it is shown once and then gone — in
this run only the second of two adds still had its banner waiting on the cart page, the first
add's having been consumed by the cart read-back that followed it. The banners of several adds
wait together: after a batch add of a whole showcase row, the next full page load of the cart
page showed one "You added <product name> to your shopping cart." banner per add, all twelve at
once, so the banners can confirm a batch add product by product — and a same-origin fetch of the
cart page, the way the library's add APIs confirm a post, does not consume them, which is why
they were all still waiting after the batch API's own read-back. The header's mini-cart counts
units rather than rows: seven rows holding nine units read "9 items". The cart item id inside the
quantity input's id and name is the store's own — it grows as items are added and changes when
the cart is rebuilt — so a row has to be located by the product's name rather than by a
remembered id. The input also carries data-cart-item-id (the product's SKU) and data-item-qty
(the quantity the page was rendered with), and the Update Shopping Cart button is a submit button
named update_cart_action.

The cart page is paginated at twenty rows to a page, with the same `.pager` structure the
showcase row uses: an amount toolbar stating the cart's totals ("Items 1 to 20 of 24 total" on
the first page of a twenty-four-row cart, "Items 21 to 24 of 24 total" on its second), a numbered
`a.page` link per page and an "action next" link, each carrying the cart page's own page address.
A read that wants every row therefore has to follow the cart's pager and collect the rows of each
page; a read that stops at the first page reports only twenty of the cart's twenty-four rows and
can make products that sit on a later page look absent. The item cell also renders an inline
`<style>` block beside the product's image, so a row's name has to be read from its
`.product-item-name` element — a fallback to any anchor in the cell picks up the style text
instead of the name.

## Changing a cart quantity

A quantity already in the cart is changed on the cart page itself. The row's quantity input is
given the new value — set through the input's native value setter, with input and change events,
so the page's own scripts see the change — and the form's Update Shopping Cart button is then
clicked. The button posts the whole cart form, so the quantity of every other row is sent as the
page currently shows it. The store answers with a plain reload of the cart page: the rows then
carry the new quantities and their line subtotals recomputed as quantity x unit price (a tea at
$19.36 moved from 2 to 4 showed its subtotal go from $38.72 to $77.44). An update brings no
message of its own, so the reloaded page is the confirmation: read the row back and check both
the quantity input's value and the line subtotal.

The same update can be posted as a form post from a page script, the way the store's other forms
are posted rather than clicked: the cart page's own form is collected with its hidden fields and
every row's quantity input, one row's quantity is changed and every other row is sent at the
value the page shows, and the post goes to the form's own action, /checkout/cart/updatePost/. The
store answers with a plain reload of the cart page and no message of its own, so the cart page
read after the post is the confirmation, exactly as it is for the button. This is how a wish-list
item the cart already held at another quantity was brought to the quantity the wish list lists:
the row went from 3 to 1 with every other row unchanged, the read-back showing the row's quantity
input at the new value.

## Removing an item from the cart

An item already in the cart is taken out from the cart page. Each item's Remove item control is a
link whose visible text is "Remove item" and whose href is only "#", so it carries no address of
its own: the request it makes is described in a data-post attribute on the link, naming
/checkout/cart/delete/ as the action and passing the cart item id together with an encoded return
URL. That id is the same one in the row's quantity input name (cart[<item>][qty]), which is what
ties a row to its own remove link when the controls are not inside the row. The request can be
posted as the link carries it, with the cart page's own form key posted alongside when the page
exposes one, from a page on the store's origin — the same way a product page's add-to-cart form is
posted rather than clicked. The store answers with a redirect back to the cart page, and the
removal brings no success or error message of its own, so the cart page read after it is the only
reliable confirmation: the row is simply gone and the remaining rows keep their quantities. A
removal that has nothing to remove leaves the page unchanged. When the shopper wants an item out
of the cart whatever it takes, the item can be added first — located through the quick search and
its product page's add-to-cart form posted at quantity 1 — and then removed, which is how this
was observed: a cart of ten rows for five products gained the gingerbread house kit at quantity 1
and then lost it again, leaving the five original rows. Removing every row at once is the same
request posted for every row, gathered across every page of the cart's pager and repeated pass by
pass, which is described under Emptying the shopping cart.

## Emptying the shopping cart

A whole cart is emptied by taking every row out at once, each with its own remove request — the
data-post of the row's a.action.action-delete link naming /checkout/cart/delete/ with that row's
cart item id and uenc, the same request a single removal posts (see Removing an item from the
cart). The requests are collected from the cart page and posted one after another, each as the
link carries it with the cart page's own form key added when the page exposes one, from a page on
the store's origin. Because the cart page paginates at twenty rows to a page, the collection has
to cover every page of the cart's own pager — a pass that stops at the first page leaves the rows
on the later ones in the cart. Each pass also re-collects the links rather than reusing a
remembered list, because the cart item ids are the store's own and change when the cart is
rebuilt, and the pager shrinks as rows go: the links are read fresh and posted pass by pass until
no delete link remains. The store answers each post with a redirect back to the cart page and no
message of its own, so the confirmation is the reads afterwards: the cart page read-back shows no
item rows and reads "You have no items in your shopping cart.", and the header's mini-cart reads
0 on the reloaded live page, where it is rendered client-side. This was observed with a cart of
24 rows for 47 units — its toolbar reading "Items 1 to 20 of 24 total" with a second pager page —
emptied with 24 deletes and no errors.

## Adding a product to the wish list

Every product page carries an "Add to Wish List" control below its add-to-cart form. It is an
anchor with class "action towishlist" (and data-action "add-to-wishlist") whose href is only "#",
so it carries no address of its own: the request it makes is described in a data-post attribute
on the link, naming /wishlist/index/add/ as the action and passing the product's internal id
together with uenc, a base64-encoded return URL holding the product page's own address. The
request can be posted as the link carries it, with the product page's own form key posted
alongside when the page exposes one, from a page on the store's origin — the same way a product
page's add-to-cart form and the cart page's remove links are posted rather than clicked — and a
trusted click on the link submits the same request. Activating the control reloads the page onto
the shopper's wish list view, at a URL of the form /wishlist/index/index/wishlist_id/<id>/, rather
than back to the product page, and that landing page carries a one-time confirmation banner,
"<product name> has been added to your Wish List. Click here to continue shopping." The product's
page itself is reached the usual way — the quick search at /catalogsearch/result/ with a query
built from the product's leading words, or a link to it from the homepage's Product Showcases row
— and picked out of the results by comparing the result link's text with the exact name wanted.
This was observed with the homepage's featured ginger ale, whose product page held the control
carrying product 104493 and whose click landed on the wish list with the banner and the product
listed there.

## The wish list

The wish list lives at /wishlist/, linked from the header as "My Wish List" with the item count
shown beside it ("My Wish List 1 item"). The page is headed "My Wish List", states how many items
it holds ("1 Item"), and carries a Show 10 20 50 per page control above the list. Each product
appears in a grid block with its name link, its rating, its price, and a Comment field and a Qty
input; beneath it sit that product's own Add to Cart, Edit and Remove item controls, and the page
ends with Update Wish List, Share Wish List and Add All to Cart buttons. Reading this page is
the way to confirm what the wish list holds after an add: the product is listed with its price and
its Qty field, and the count in the heading and the header agrees. The confirmation banner is
shown once, on the landing page, and is gone afterwards, so the page itself is the confirmation
that outlasts it. The wish list keeps items from earlier visits, so it can list more than what
one add put there. The page's footer also carries a "Recently Ordered" block of previously
ordered products, each with its own Add to Cart checkbox, and its blocks use the same
product-item classes the wish list's own lines use; a read that wants the wish list's lines
therefore takes them from the page's own wish list view form, or recognises them by the Comment
and Qty fields each line carries (description[<item>], qty[<item>]), whose item number is the one
that ties the line to its own controls. The per-item Add to Cart control is an anchor whose href
is only "#" and which carries its request in a data-post attribute naming /wishlist/index/cart/
and passing the line's item number with the quantity, the same way the page's other "#"-href
controls carry theirs; the per-item Remove item control is described under Removing an item from
the wish list. The cart page's per-item controls also include a Move to Wishlist link beside
Edit and Remove item in the page's own action row; using it is described under Moving an item
from the cart to the wish list.

## Removing an item from the wish list

An item already on the wish list is taken out from the wish list page itself. Each line's own
Remove item control is an anchor whose visible text is "Remove item" and whose href is only "#",
with the class "btn-remove action delete", so it carries no address of its own: the request it
makes is described in a data-post attribute on the link, naming /wishlist/index/remove/ as the
action and passing the line's wishlist item number together with an encoded return URL (uenc,
observed empty). That item number is the same one in the line's Comment and Qty field names
(description[<item>], qty[<item>]), which is what ties a line to its own remove control when the
controls are read across the page. The request can be posted as the link carries it, with the
wish list page's own form key posted alongside when the page exposes one, from a page on the
store's origin — the same way the cart page's remove links and a product page's add-to-cart form
are posted rather than clicked — and a trusted click on the link submits the same request. The
store answers with a reload of the wish list page, and that page carries a one-time confirmation
banner, "<product name> has been removed from your Wish List."; the banner is shown once and
then gone, so the wish list page read after it is the reliable confirmation: the line is gone
and the remaining lines keep their quantities, while an emptied wish list reads "My Wish List"
with "You have no items in your wish list." and reports no item count. A removal that has
nothing to remove leaves the page unchanged. This was observed with a wish list holding one
item, the Stove Top stuffing mix at $8.49: its Remove item control carried item 4, the click
reloaded the page with the banner, and the page then read "You have no items in your wish
list.".

## Adding every wish-list item to the cart

The wish list page ends with an Add All to Cart button beside Update Wish List and Share Wish
List. It is a button of class "action tocart" whose title is "Add All to Cart" — not to be
confused with the per-item Add to Cart buttons of class "action tocart primary" — and a trusted
click on it is the store's own way of putting every wish-list item into the shopping cart at
once, each at the quantity its Qty field lists. This was observed with a wish list reading "My
Wish List / 4 Item(s)" that held four items each at quantity 1 — the Q Mixers ginger ale at
$68.50, the Stove Top stuffing mix at $8.49, the gingerbread house kit at $19.99 and the
Elmwood Inn tea at $19.36 — where the click reloaded the page onto the wish list view at
/wishlist/index/index/wishlist_id/5/ rather than onto the cart page.

The reloaded page carries the store's messages, and they say what happened product by product:
"3 product(s) have been added to shopping cart: ..." names the items that went in, and "The
product's required option(s) weren't entered. Make sure the options are entered and try again
for "<product name>"." names the one that did not. The button cannot choose a required custom
option (see Required custom options), so a product carrying one — the Stove Top stuffing mix
with its Size radio list — is left out of the cart however the button is used; such a product
is added on its own afterwards, located through the quick search and its product page's
add-to-cart form posted with the first offered choice, exactly the way the library's add APIs
add a product. Whether the button also takes the items out of the wish list was not observed
here.

Putting every wish-list item into the cart at exactly the quantities the wish list lists — the
whole point of the button, and of the manual route when it refuses an item — takes one more step
when the cart already holds a wish-list product from an earlier visit: because an add raises an
existing line rather than setting it (see Adding a product to the cart), such an item comes back
at the held quantity plus the added one, and its row has to be set to the listed quantity through
the cart's own Update Shopping Cart form before the cart matches the wish list. This was observed
with a wish list holding one item, the Stove Top stuffing mix at Qty 1: the Add All to Cart
button refused it for its required option, the product-page add at quantity 1 raised a row the
earlier visit had left at 2 up to 3, and the cart's update form then set the row to 1 — the
read-back showed the row's quantity input at 1, every other row unchanged — leaving the cart
showing the wish-list item at exactly the listed quantity beside the other items the cart kept,
with no order placed. An item the cart does not hold at all lands at exactly the listed quantity
from the product-page add alone, so the update step is needed only for items the cart already
held.

The cart page at /checkout/cart/ is the confirmation, the same way it is for the store's other
adds: it listed all four items at quantity 1 once the stuffing mix had been added on its own,
with the header's mini-cart reading "4 items" and a one-time "You added <product name> to your
shopping cart." banner waiting on it for the product-page add. Because the cart keeps items from
earlier visits, it can list more lines than the wish list has.

## Moving an item from the cart to the wish list

An item already in the shopping cart is moved to the wish list from the cart page itself, without
visiting the product page again. Each item row's per-item controls in the page's own action row
include a Move to Wishlist link beside Edit and Remove item. The link is an anchor whose visible
text is "Move to Wishlist" and whose href is only "#", so it carries no address of its own: the
request it makes is described in a data-post attribute naming /wishlist/index/fromcart/ as the
action and passing the cart item id — the same number embedded in the row's quantity input name
(cart[<item>][qty]) — together with uenc, a base64-encoded return URL holding the cart page's own
address. A trusted click on the link submits that request, and the request can also be posted as
the link carries it, with the cart page's own form key posted alongside when the page exposes one,
from a page on the store's origin — the same way the cart page's remove links and a product page's
add-to-cart form are posted rather than clicked. Unlike the product page's Add to Wish List
control, this one does not navigate away to a wish list view: the store answers the move with a
plain reload of the cart page.

That reloaded cart page carries a one-time confirmation banner, "<product name> has been moved to
your wish list.", followed by a "Click here to continue shopping." link. The banner is shown once
and then gone, so the cart page read after the move is the reliable confirmation, the same way it
is for the other cart actions: when the moved item was the cart's only one, the page then reads
"You have no items in your shopping cart." and the header's mini-cart count drops to 0. The wish
list itself is the second confirmation: reading /wishlist/ after the move lists the product with
its name link, its price and a Qty field beside the per-item Add to Cart, Edit and Remove item
controls, and both the page's item count and the header's count go up. This was observed with the
gingerbread house kit at $19.99, which moved into a wish list that already held two products: the
page then read "My Wish List" with "3 Item(s)" and the header "My Wish List 3 items". The wish
list keeps items from earlier visits, so it can list more than what one move put there, and each
of its lines carries its own item number in the Comment and Qty field names (description[<item>],
qty[<item>]).

## Buying the cheapest product in a category

A shopper who wants the cheapest product matching a word inside one category gets it from the
store's own product data rather than from any of the site's search forms: the category's display
name is resolved to its internal uid, and the category's products are then queried with a name
match, page by page, until the store's reported total is reached, the lowest final price among
them being the product to buy. Sorting the query by price instead is a shortcut to the same
answer, but the full scan is the dependable one because a products query can come back with an
empty items list and no error. The product's page is then located through the quick search — the
full name, the name without a trailing parenthesised part, and its first five words — or built
from the url_key the data query returned, and its add-to-cart form is posted at the quantity
wanted, taking the first offered choice of any required custom option. The cart page is read back
to confirm the add, and the checkout then orders everything in the cart, not only the product
just added: buying the cheapest "tea" in Grocery & Gourmet Food this way put a $1.32 Honest Tea at
quantity 1 in a cart that already held a $7.92 seasoning at quantity 3, and the order that came
out of it carried both lines. From there the purchase follows the ordinary onepage checkout
described below, on the shopper's saved address and with the store's own payment-method
preselection.

## Starting the checkout

Proceed to Checkout in the cart page's Summary block starts the store's onepage checkout for the
signed-in shopper. One quirk matters here: the button Magento's markup styles as
button.action.primary.checkout is a hidden duplicate with no size on the page, and clicking it
fails; the control that works is the one carrying data-role="proceed-to-checkout". Clicking it
reloads the page into the checkout at /checkout/#shipping, headed "Checkout" with a progress bar
of "Shipping" and "Review & Payments". The checkout requires a signed-in shopper, and it orders
every item in the cart — in this run seven rows, twelve units, subtotal $511.94.

That click is not fully dependable, though: it can leave the page on /checkout/cart/ with no
checkout hash and none of the checkout's own controls, so nothing advances and a click aimed at
the shipping step's Next button afterwards finds no such button. Clicking Proceed to Checkout
again gets through, and opening /checkout/ directly brings up the same checkout; a walk that
verifies the shipping step's controls actually appeared, and repeats the click when they did
not, gets through where a single click does not.

## Shipping step

The shipping step of the checkout is a knockout-rendered view of the one checkout page, not a
page of its own, so it advances without a full navigation. It shows the Shipping Address section
with the shopper's saved address already selected and merely displayed — <REDACTED>, 101 S San
Mateo Dr, San Mateo, California 94010, United States, <REDACTED> — with a New Address button
beside it and no address radio to click when the saved address is the selected one. Below it, the
Shipping Methods section lists the available methods as radio inputs; this store offered a single
method, flatrate_flatrate, shown as "$60.00 Fixed Flat Rate" and already checked. The amount is
the store's flat rate for the cart and differs between runs — $60.00 for the $511.94 cart of one
run, $20.00 for a $25.08 cart in another — while the method stays the single one, already
checked. A step's Next button (button.action.continue.primary) confirms the step and moves the
progress bar on; here it advanced the checkout to /checkout/#payment.

## Payment step

The payment step, at /checkout/#payment, holds the Payment Method list as radios named
payment[method]; this store offers a single method, Check / Money order (payment[method]=checkmo),
which arrives already checked. Under it sits a "My billing and shipping address are the same"
checkbox (id billing-address-same-as-shipping-checkmo), checked by default, with the saved address
shown beneath it. The step's primary button is Place Order; beside it the Order Summary repeats
the Cart Subtotal, the Shipping line ("Flat Rate - Fixed", $60.00), the Order Total ($571.94 for
this cart), the "12 Items in Cart" count, and the Ship To and Shipping Method chosen. Clicking
Place Order submits the order and the browser lands on the success page.

## Order confirmation

A placed order lands on /checkout/onepage/success/, headed "Thank you for your purchase!" with a
Print receipt link, the line "Your order number is: 000000190." and the note "We'll email you an
order confirmation with details and tracking info.", plus a Continue Shopping button. The header's
mini-cart is emptied — it read "You have no items in your shopping cart." with a count of 0 —
which independently confirms the order went through. The order number is the confirmation number
to report back to the shopper; the one read from the success page in the latest run was 000000197,
placed for the cart an order-history Reorder link had just refilled (see Buying a past order
again).

That number is shown once. The success page reads the order out of the checkout session, so a
later visit to /checkout/onepage/success/ — or even a fetch of it — shows the page without any
number, and the number has to be taken from the success page while it is being shown. In the
page's markup the number sits inside an anchor ("Your order number is: <a …>000000192</a>."), so
it has to be read from the page's rendered text rather than from the raw HTML, where the anchor's
own tag comes before the digits. The browser is not always left on the success page either: after
the order the tab can end up back on the cart page, which then reads "You have no items in your
shopping cart.".

## The shopper's order history

The shopper's past orders are listed at /sales/order/history/, reached from My Account, and the
account page carries links to the most recent orders as well. Each row of the history states the
order's number, its date, its grand total and its status, and carries View Order and Reorder
links; the newest order of this run read "000000195 11/21/26 $45.08 Pending" beside them. The
rows are listed newest first, ten to a page ("Items 1 to 10 of 44 total") with page links and a
Show-per-page limiter below them, so an order older than the ten shown needs its page opened
first. Each order in the history links to its own view at a URL of the form
/sales/order/view/order_id/<id>/, which shows the order's number as an "Order # 000000NNN" line,
the Order Date, the items ordered with their quantities and prices, and the Grand Total. Each item
line names the product and its SKU and then gives the unit price, the quantity ordered and the
line total — "Honest Tea Organic Fair Trade Half Tea & Half Lemonade Gluten Free, 16.9 fl oz
B01HBB1LMG $1.32 Ordered 1 $1.32" — and the view also states the payment method the order was
placed with, "Check / Money order" for this store. This is where a confirmation number can be
recovered once the success page's one-time display is gone: the order views are checked newest
first, and the one listing the product just bought is the order that was placed — in this run the
history held order 000000192, dated November 21, 2026, with a grand total of $159.76, listing the
Elmwood Inn tea among its items beside the products that were already in the cart. The account
page beside the history carries a "Recently Ordered" block that lists individual products from
recent orders, each with a checkbox and a shared Add to Cart button; that control adds the chosen
products to the cart one at a time, which is a different thing from restoring a whole order (see
Buying a past order again).

## Buying a past order again

Every row of the order history carries a Reorder link beside its View Order link, and that link
is the store's own way of buying a past order again. The Reorder control is an anchor whose
visible text is "Reorder" and whose href is only "#", so it carries no address of its own; a
click on it makes the store put every product of that order back into the shopping cart at the
quantities the order lists and navigate to the cart page at /checkout/cart/. The restoration is
the store's doing — the shopper only clicks the link — and the cart page read after it is the
confirmation: the order's products appear there at the order's quantities, with their line
subtotals recomputed as quantity x unit price and the Summary's Order Total matching the order's
own grand total. Because the cart keeps items from earlier visits and the reorder adds the order's
units to whatever the cart already holds, the cart can list more lines, and more units, than the
order has; the mini-cart counts units, so it reads the order's unit count only when the cart was
empty beforehand. Order 000000195 of this run (11/21/26, $45.08, Pending) was reordered this way
into a cart that had been empty: it came back holding Tony Chachere's More Spice Creole Seasoning
- 14 oz at quantity 3 ($7.92 each, $23.76) and Honest Tea Organic Fair Trade Half Tea & Half
Lemonade Gluten Free, 16.9 fl oz at quantity 1 ($1.32), a subtotal of $25.08 that with the $20.00
Flat Rate - Fixed shipping came to the order's own $45.08. The checkout then orders everything in
the cart, not only the reordered lines, and it produced order 000000197 — one number above
000000196, the most recent order in the history beforehand — on the shopper's saved address with
the store's preselected Check / Money order payment method.
