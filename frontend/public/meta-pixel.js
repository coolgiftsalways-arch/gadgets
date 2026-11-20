// ---------- Meta Pixel base code ----------
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '2283887475516459');
fbq('track', 'PageView');

// ---------- AddToCart ----------
// Every "add to cart" button saves the cart and fires "gadgete-cart-updated".
// We compare the cart before and after; if a product's quantity went up,
// that is an AddToCart.
(function () {
  var CART_KEY = 'gadgete_cart';

  function readCart() {
    try {
      var cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(cart) ? cart : [];
    } catch (e) { return []; }
  }

  function keyOf(item) { return String(item.slug || item.id) + '|' + (item.color || ''); }

  function priceOf(item) {
    var n = Number(item.numericPrice);
    if (isFinite(n) && n > 0) return n;
    var v = item.price != null ? item.price : 0;
    if (typeof v === 'number') return v;
    var p = Number(String(v).replace(/[^\d.]/g, ''));
    return isFinite(p) ? p : 0;
  }

  function snapshot(cart) {
    var map = {};
    cart.forEach(function (item) { map[keyOf(item)] = Number(item.quantity) || 1; });
    return map;
  }

  var before = snapshot(readCart());

  window.addEventListener('gadgete-cart-updated', function () {
    var cart = readCart();
    cart.forEach(function (item) {
      var added = (Number(item.quantity) || 1) - (before[keyOf(item)] || 0);
      if (added > 0) {
        var id = String(item.slug || item.id);
        fbq('track', 'AddToCart', {
          content_ids: [id],
          content_type: 'product',
          content_name: item.name,
          contents: [{ id: id, quantity: added }],
          value: priceOf(item) * added,
          currency: 'INR'
        });
      }
    });
    before = snapshot(cart);
  });
})();