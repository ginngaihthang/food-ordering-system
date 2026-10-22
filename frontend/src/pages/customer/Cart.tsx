import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Minus, Plus, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useSettings } from '@/context/SettingsContext';
import { fetchMenu, type MenuProduct } from '@/api/menu';
import { rememberOrder } from '@/lib/orderHistory';
import { getErrorMessage, isNetworkError } from '@/lib/error';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OfflineBanner } from '@/components/shared/OfflineBanner';
import { taxIncluded } from '@/lib/tax';
import { createOrder, startTakeawayCheckout } from '@/api/orders';

/* ---------- UI-only helpers (same as Menu.jsx; move to a shared file if you like) ---------- */

const GRADIENTS = [
  'from-[#ffe0a3] to-[#ffb347]',
  'from-[#fff0b8] to-[#ffd25e]',
  'from-[#ffc9a3] to-[#ff8f5a]',
  'from-[#d3f0d0] to-[#7fcf8f]',
  'from-[#ffb9a8] to-[#f2705a]',
  'from-[#ffd0e6] to-[#ff8cc0]',
  'from-[#cdeeff] to-[#6cc3f0]',
  'from-[#f2d6bf] to-[#c99a73]',
];
function gradientFor(id: string | number) {
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

const BRAND = 'bg-gradient-to-br from-[#e8432d] to-[#ff8a3d]';
const CARD = 'rounded-3xl bg-card shadow-[0_8px_24px_rgba(140,70,20,0.12)]';

interface Notice {
  type: 'warning' | 'error';
  text: string;
}

function describeRemoved(names: string[]): string {
  return `${names.join(', ')} ${names.length === 1 ? 'is' : 'are'} no longer available and ${
    names.length === 1 ? 'was' : 'were'
  } removed from your cart.`;
}

export default function Cart() {
  const [searchParams] = useSearchParams();
  const tableToken = searchParams.get('table');
  const navigate = useNavigate();
  const menuPath = tableToken ? `/menu?table=${tableToken}` : '/menu';

  const { items, increaseQuantity, decreaseQuantity, removeItem, subtotal, clearCart, addItem } =
    useCart();

  const { settings, money } = useSettings();
  const orderingPaused = tableToken ? !settings.acceptDineIn : !settings.acceptTakeaway;
  const payOnline = !tableToken && settings.takeawayPrepay;
  const online = useOnlineStatus();

  const [placing, setPlacing] = useState(false);
  const [menuProducts, setMenuProducts] = useState<MenuProduct[] | null>(null); // null = not loaded yet
  const [notice, setNotice] = useState<Notice | null>(null);

  // Keep the latest cart in refs so the menu callback below never reads stale values
  const itemsRef = useRef(items);
  const removeItemRef = useRef(removeItem);
  useEffect(() => {
    itemsRef.current = items;
    removeItemRef.current = removeItem;
  });

  // Used after a failed order to refresh the suggestions
  const loadMenu = useCallback(async () => {
    try {
      const menu = await fetchMenu();
      setMenuProducts(menu.flatMap((cat) => cat.Products));
    } catch (err) {
      console.error('Failed to load the menu:', err);
    }
  }, []);

  // Load the menu once. Dishes that sold out while sitting in the cart are removed here,
  // inside the response callback, so the customer is told before they try to order.
  useEffect(() => {
    let cancelled = false;

    fetchMenu()
      .then((menu) => {
        if (cancelled) return;

        const products = menu.flatMap((cat) => cat.Products);
        setMenuProducts(products);

        const menuById = new Map(products.map((p) => [p.id, p]));
        const gone = itemsRef.current.filter((item) => !menuById.get(item.productId)?.isAvailable);
        if (gone.length > 0) {
          gone.forEach((item) => removeItemRef.current(item.productId));
          setNotice({ type: 'warning', text: describeRemoved(gone.map((i) => i.name)) });
        }
      })
      .catch((err) => console.error('Failed to load the menu:', err));

    return () => {
      cancelled = true;
    };
  }, []);

  // Only suggest dishes that are in stock and not already in the cart
  const suggestions = useMemo(() => {
    const inCartIds = new Set(items.map((i) => i.productId));
    return (menuProducts ?? []).filter((p) => p.isAvailable && !inCartIds.has(p.id)).slice(0, 6);
  }, [menuProducts, items]);

  function handleAddSuggestion(product: MenuProduct) {
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      imageUrl: product.imageUrl,
    });
  }

  async function handlePlaceOrder() {
    if (placing || orderingPaused) return;
    if (!online) {
      setNotice({
        type: 'error',
        text: "You're offline. Your order was not sent. Reconnect and try again.",
      });
      return;
    }

    setNotice(null);
    setPlacing(true);
    let leavingPage = false;
    try {
      const orderItems = items.map((i) => ({ productId: i.productId, quantity: i.quantity }));

      if (payOnline) {
        const checkout = await startTakeawayCheckout(orderItems);
        rememberOrder(checkout.publicToken); // so "My orders" finds it even if the tab is closed
        leavingPage = true;
        window.location.href = checkout.url; // the cart stays intact until the payment succeeds
        return;
      }

      const order = await createOrder({
        orderType: tableToken ? 'DINE_IN' : 'TAKEAWAY',
        tableToken: tableToken ?? undefined,
        items: orderItems,
      });

      clearCart();

      if (tableToken) {
        navigate(`/session-orders?table=${tableToken}`);
      } else {
        rememberOrder(order.publicToken);
        navigate(`/order/${order.publicToken}`);
      }
    } catch (err) {
      const data = axios.isAxiosError(err)
        ? (err.response?.data as { unavailableProductIds?: number[] } | undefined)
        : undefined;
      const unavailableIds = data?.unavailableProductIds ?? [];
      const removed = items.filter((i) => unavailableIds.includes(i.productId));

      if (removed.length > 0) {
        // Remove the sold-out items so the customer can simply press Place Order again
        removed.forEach((i) => removeItem(i.productId));
        setNotice({ type: 'warning', text: describeRemoved(removed.map((i) => i.name)) });
        loadMenu();
      } else if (isNetworkError(err)) {
        // The request may have reached the kitchen even though the reply was lost
        setNotice({
          type: 'error',
          text: "The connection dropped, so we couldn't confirm your order. Please check with staff before ordering again, in case it went through.",
        });
      } else {
        setNotice({ type: 'error', text: getErrorMessage(err, 'Failed to place order') });
      }
    } finally {
      if (!leavingPage) setPlacing(false);
    }
  }

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const taxAmount = taxIncluded(subtotal, settings.taxRate);

  const cannotOrder = placing || orderingPaused || !online;
  const placeLabel = placing
    ? payOnline
      ? 'Opening payment...'
      : 'Placing Order...'
    : !online
      ? 'Offline'
      : orderingPaused
        ? 'Ordering paused'
        : payOnline
          ? `Pay ${money(subtotal)}`
          : 'Place Order';

  return (
    <div className="min-h-screen bg-[#fff6e8] dark:bg-[#1b110c]">
      <div className="w-full max-w-2xl lg:max-w-5xl mx-auto p-4 sm:p-6 pb-36 lg:pb-10 overflow-x-hidden box-border">
        {/* Header */}
        <div className="flex items-center gap-3 pt-1 sm:pt-2">
          <button
            onClick={() => navigate(menuPath)}
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-card shadow-sm flex items-center justify-center shrink-0 transition active:scale-95"
            aria-label="Back to menu"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Your Cart
            </h1>
            <p className="text-xs sm:text-base text-muted-foreground">
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-card px-3 py-1 text-xs sm:text-sm font-semibold shadow-sm">
            {tableToken ? '🪑 Dine-in' : '🛍️ Takeaway'}
          </span>
        </div>

        <OfflineBanner />

        {/* Sold-out and error messages (also visible when the cart ends up empty) */}
        {notice && (
          <div
            role="alert"
            className={`mt-4 flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-medium ${
              notice.type === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            <span className="flex-1">{notice.text}</span>
            <button onClick={() => setNotice(null)} className="shrink-0" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {items.length === 0 ? (
          /* Empty state */
          <div className="py-16 sm:py-24 text-center">
            <div className="text-6xl">🛒</div>
            <h2 className="mt-3 font-display text-xl sm:text-3xl font-bold">Your cart is empty</h2>
            <p className="mt-1 text-sm sm:text-base text-muted-foreground">
              Add something tasty from the menu.
            </p>
            <button
              onClick={() => navigate(menuPath)}
              className={`mt-5 h-11 sm:h-12 px-6 rounded-2xl ${BRAND} text-white text-sm sm:text-base font-bold shadow-[0_10px_22px_rgba(232,67,45,0.35)] transition active:scale-95`}
            >
              Browse menu
            </button>
          </div>
        ) : (
          <div className="mt-4 sm:mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 lg:items-start">
            {/* LEFT: items, suggestions */}
            <div className="space-y-4 sm:space-y-6">
              {/* Shown when staff have switched ordering off in Settings */}
              {orderingPaused && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  {settings.closedMessage ||
                    'Ordering is paused right now. Please ask staff for help.'}
                </div>
              )}

              {/* Cart items */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className={`flex items-center gap-3 p-2.5 sm:p-3 w-full ${CARD}`}
                  >
                    <div
                      className={`h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br ${gradientFor(item.productId)}`}
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-3xl drop-shadow">
                          🍽️
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold truncate">{item.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {tableToken
                          ? `${item.quantity} ${item.quantity === 1 ? 'item' : 'items'}`
                          : `Takeaway · ${item.quantity} ${item.quantity === 1 ? 'item' : 'items'}`}
                      </p>
                      <p className="mt-0.5 font-display text-base sm:text-xl font-black text-[#e8432d]">
                        {money(item.price * item.quantity)}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 sm:gap-2 shrink-0">
                      <div className={`flex items-center rounded-full ${BRAND} p-[3px] text-white`}>
                        <button
                          onClick={() => decreaseQuantity(item.productId)}
                          className="h-7 w-7 sm:h-9 sm:w-9 rounded-full flex items-center justify-center transition hover:bg-white/20 active:scale-90"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                        <span className="w-6 sm:w-8 text-center font-extrabold text-sm sm:text-base">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => increaseQuantity(item.productId)}
                          className="h-7 w-7 sm:h-9 sm:w-9 rounded-full flex items-center justify-center transition hover:bg-white/20 active:scale-90"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-xs sm:text-sm font-medium text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Suggestions */}
              {!orderingPaused && suggestions.length > 0 && (
                <div className="space-y-2 sm:space-y-3">
                  <h2 className="font-display text-base sm:text-2xl font-bold">
                    Add something else?
                  </h2>
                  <div className="flex gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
                    {suggestions.map((product) => (
                      <div
                        key={product.id}
                        className={`flex items-center gap-2.5 px-2.5 py-2.5 shrink-0 w-44 sm:w-56 ${CARD}`}
                      >
                        <div
                          className={`h-11 w-11 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br ${gradientFor(product.id)}`}
                        >
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="grid h-full w-full place-items-center">🍽️</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold truncate">{product.name}</p>
                          <p className="text-xs sm:text-sm font-bold text-[#e8432d]">
                            {money(product.price)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAddSuggestion(product)}
                          className={`h-7 w-7 sm:h-9 sm:w-9 rounded-full ${BRAND} text-white flex items-center justify-center shrink-0 shadow-[0_4px_10px_rgba(232,67,45,0.4)] transition active:scale-90`}
                          aria-label={`Add ${product.name}`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subtotal (phone and tablet; desktop shows it in the side panel) */}
              <div
                className={`flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 lg:hidden ${CARD}`}
              >
                <span className="text-sm sm:text-base text-muted-foreground">
                  Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'items'})
                </span>
                <span className="font-bold sm:text-lg">{money(subtotal)}</span>
              </div>
              {taxAmount > 0 && (
                <p className="px-1 text-center text-xs text-muted-foreground lg:hidden">
                  Total includes {settings.taxLabel} {settings.taxRate}% ({money(taxAmount)})
                </p>
              )}
            </div>

            {/* RIGHT (desktop only): order summary */}
            <aside className={`hidden lg:block sticky top-6 p-6 ${CARD}`}>
              <h2 className="font-display text-2xl font-bold">Order summary</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {tableToken ? 'Dine-in' : 'Takeaway'}
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-dashed border-foreground/15 pt-4 text-muted-foreground">
                <span>
                  Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'items'})
                </span>
                <span className="font-semibold text-foreground">{money(subtotal)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Includes {settings.taxLabel} {settings.taxRate}%
                  </span>
                  <span>{money(taxAmount)}</span>
                </div>
              )}
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-display text-4xl font-black tracking-tight">
                  {money(subtotal)}
                </span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={cannotOrder}
                className={`mt-5 w-full h-14 rounded-2xl ${BRAND} text-white text-[17px] font-bold shadow-[0_12px_28px_rgba(232,67,45,0.45)] transition active:scale-[.99] disabled:opacity-60 disabled:shadow-none disabled:cursor-not-allowed`}
              >
                {placeLabel}
              </button>
            </aside>

            {/* Sticky bottom bar (phone and tablet) */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#fff6e8] via-[#fff6e8]/95 to-transparent dark:from-[#1b110c] dark:via-[#1b110c]/95 px-4 pt-6 pb-[calc(0.75rem+env(safe-area-inset-bottom))] w-full box-border">
              <div className="max-w-2xl mx-auto">
                <div className="flex justify-between items-baseline mb-2 sm:mb-3">
                  <span className="text-sm sm:text-base text-muted-foreground">Total</span>
                  <span className="font-display text-xl sm:text-3xl font-black tracking-tight">
                    {money(subtotal)}
                  </span>
                </div>
                <button
                  onClick={handlePlaceOrder}
                  disabled={cannotOrder}
                  className={`w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl ${BRAND} text-white text-sm sm:text-[17px] font-bold shadow-[0_12px_28px_rgba(232,67,45,0.45)] transition active:scale-[.99] disabled:opacity-60 disabled:shadow-none disabled:cursor-not-allowed`}
                >
                  {placeLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}