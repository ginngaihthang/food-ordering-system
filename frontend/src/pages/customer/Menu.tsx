import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchMenu, type MenuCategory, type MenuProduct } from '@/api/menu';
import { fetchTableByToken } from '@/api/tables';
import { useCart } from '@/context/CartContext';
import { useSettings } from '@/context/SettingsContext';

const QUICK_SEARCHES = ['roll', 'spicy','sushi', 'maki', 'iced', 'drink'];

/* ---------- UI-only helpers (no data or logic) ---------- */

// Each dish gets a colour behind its photo. Picked from the product id, so it stays the same.
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

// Fixed colours so the menu looks the same in light and dark mode
const PAGE = 'bg-[#fff6e8] text-[#2b1a12]';

function chipClass(active: boolean) {
  return `px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition active:scale-95 ${
    active
      ? `${BRAND} text-white shadow-[0_6px_16px_rgba(232,67,45,0.35)]`
      : 'bg-white text-[#2b1a12] shadow-sm hover:bg-white/80'
  }`;
}

export default function Menu() {
  const [searchParams] = useSearchParams();
  const tableToken = searchParams.get('table');
  const navigate = useNavigate();
  const { addItem, totalItems } = useCart();
  const { settings, money } = useSettings();

  const [tableInfo, setTableInfo] = useState<{ tableNumber: number } | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [underFive, setUnderFive] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Staff can pause dine-in and takeaway separately in Settings
  const orderingPaused = tableToken ? !settings.acceptDineIn : !settings.acceptTakeaway;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        if (tableToken) {
          const table = await fetchTableByToken(tableToken);
          setTableInfo(table);
        }
        const menu = await fetchMenu();
        setCategories(menu);
      } catch {
        setError('This QR code is invalid or has expired. Please ask staff for help.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tableToken]);

  function handleAddToCart(product: MenuProduct) {
    if (orderingPaused) return;
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      imageUrl: product.imageUrl,
    });
  }

  const filteredCategories = useMemo(() => {
    return categories
      .filter((cat) => activeCategory === 'ALL' || cat.name === activeCategory)
      .map((cat) => ({
        ...cat,
        Products: cat.Products.filter((p) => {
          const matchesSearch =
            !search ||
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.description ?? '').toLowerCase().includes(search.toLowerCase());
          const matchesPrice = !underFive || Number(p.price) < 5;
          return matchesSearch && matchesPrice;
        }),
      }))
      .filter((cat) => cat.Products.length > 0);
  }, [categories, activeCategory, search, underFive]);

  const totalDishCount = filteredCategories.reduce((sum, c) => sum + c.Products.length, 0);
  const hasActiveFilters = !!search || activeCategory !== 'ALL' || underFive;

  function clearFilters() {
    setSearch('');
    setActiveCategory('ALL');
    setUnderFive(false);
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${PAGE}`}>
        <div className="w-full max-w-6xl mx-auto p-4 space-y-4 overflow-x-hidden">
          <Skeleton className="h-44 w-full rounded-[28px]" />
          <Skeleton className="h-12 w-full rounded-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[7.5rem] sm:h-auto sm:aspect-[4/5] w-full rounded-3xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${PAGE}`}>
        <div className="w-full max-w-md mx-auto p-8 text-center space-y-2 overflow-x-hidden">
          <p className="text-5xl">🍽️</p>
          <p className="font-display text-2xl font-bold">Unable to load menu</p>
          <p className="text-[#2b1a12]/60">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${PAGE}`}>
      <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 pb-24 sm:pb-28 space-y-4 sm:space-y-5 overflow-x-hidden box-border">
        {/* Hero header */}
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#e8432d] via-[#ff8a3d] to-[#ffb627] px-4 pb-10 pt-4 text-white sm:px-8 sm:pb-16 sm:pt-7">
          <div className="pointer-events-none absolute -right-14 -top-16 h-52 w-52 rounded-full bg-white/15" />
          <div className="pointer-events-none absolute -bottom-14 -left-10 h-36 w-36 rounded-full bg-white/15" />

          <div className="relative z-10 flex items-center justify-between gap-3">
            <span className="rounded-full bg-white/25 px-3 py-1 text-xs sm:px-3.5 sm:py-1.5 sm:text-sm font-semibold backdrop-blur">
              {tableInfo ? '🪑 Dine-in' : '🛍️ Takeaway'}
            </span>
            <button
              onClick={() => navigate(tableToken ? `/session-orders?table=${tableToken}` : '/my-orders')}
              className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm font-bold text-[#e8432d] transition active:scale-95"
            >
              My orders
            </button>
          </div>

          <div className="relative z-10 mt-3 sm:mt-5 min-w-0">
            <h1 className="font-display text-2xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl truncate">
              {tableInfo ? `Table ${tableInfo.tableNumber}` : settings.restaurantName}
            </h1>
            <p className="mt-0.5 text-sm text-white/90 sm:mt-2 sm:text-lg md:text-xl leading-tight">
              {tableInfo ? 'Order from your seat' : 'Order ahead for pickup'}
            </p>
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 right-3 z-10 flex gap-0.5 text-3xl drop-shadow-lg sm:bottom-3 sm:right-8 sm:text-7xl"
          >
            <span className="motion-safe:animate-[bob_3.2s_ease-in-out_infinite]">🍛</span>
            <span className="motion-safe:animate-[bob_3.2s_ease-in-out_0.5s_infinite]">🍜</span>
            <span className="motion-safe:animate-[bob_3.2s_ease-in-out_1s_infinite]">🧋</span>
          </div>
        </section>

        {/* Search (overlaps the hero) */}
        <div className="relative z-10 -mt-8 mx-3 sm:-mt-12 sm:mx-8 w-auto">
          <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-[#e8432d]" />
          <Input
            ref={searchInputRef}
            type="search"
            placeholder="Search dishes, e.g. chicken, spicy..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-12 sm:pl-12 sm:pr-14 h-11 sm:h-14 text-base rounded-full w-full border-0 bg-white text-[#2b1a12] placeholder:text-[#2b1a12]/50 shadow-[0_8px_24px_rgba(140,70,20,0.15)] focus-visible:ring-2 focus-visible:ring-[#e8432d] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                searchInputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-2 sm:right-3 top-1/2 grid h-8 w-8 sm:h-10 sm:w-10 -translate-y-1/2 place-items-center rounded-full bg-[#2b1a12]/10 text-[#2b1a12]/70 transition hover:bg-[#2b1a12]/15 active:scale-90"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}
        </div>

        {/* Shown when staff have switched ordering off in Settings */}
        {orderingPaused && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {settings.closedMessage || 'Ordering is paused right now. Please ask staff for help.'}
          </div>
        )}

        {/* Category pills + quick filter */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
          <button onClick={() => setActiveCategory('ALL')} className={chipClass(activeCategory === 'ALL')}>
            🍽️ All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.name)}
              className={chipClass(activeCategory === cat.name)}
            >
              {cat.name}
            </button>
          ))}
          <span className="h-6 w-px shrink-0 bg-[#2b1a12]/15" />
          <button onClick={() => setUnderFive((v) => !v)} className={chipClass(underFive)}>
            💸 Under {settings.currencySymbol}5
          </button>
        </div>

        {/* Quick search suggestions */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
          <span className="text-xs sm:text-sm text-[#2b1a12]/60 shrink-0">Try:</span>
          {QUICK_SEARCHES.map((term) => (
            <button
              key={term}
              onClick={() => setSearch(term)}
              className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full border border-[#2b1a12]/10 bg-white/70 text-[#2b1a12] text-xs sm:text-sm whitespace-nowrap shrink-0 transition hover:bg-white active:scale-95"
            >
              {term}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <p className="text-sm text-[#2b1a12]/60">{totalDishCount} dishes</p>
        )}

        {totalDishCount === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-5xl">🍽️</p>
            <p className="font-display text-2xl font-bold">Nothing found</p>
            <p className="text-[#2b1a12]/60">No dishes match these filters.</p>
            <button
              onClick={clearFilters}
              className={`mt-2 px-6 py-3 rounded-full ${BRAND} text-white text-sm font-bold shadow-[0_8px_18px_rgba(232,67,45,0.35)] active:scale-95`}
            >
              Clear search & filters
            </button>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <section key={category.id} className="space-y-3 w-full">
              <h2 className="font-display text-lg sm:text-3xl font-bold tracking-tight text-[#2b1a12]">
                {category.name}
              </h2>

              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {category.Products.map((product) => (
                  <div
                    key={product.id}
                    className={`group relative flex flex-row items-center gap-3 p-2 sm:flex-col sm:items-stretch sm:gap-0 sm:p-0 overflow-hidden rounded-3xl bg-white shadow-[0_8px_24px_rgba(140,70,20,0.12)] transition duration-200 hover:-translate-y-0.5 ${
                      !product.isAvailable ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Photo */}
                    <div
                      className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl sm:h-auto sm:w-full sm:rounded-none sm:aspect-[4/3] bg-gradient-to-br ${gradientFor(product.id)}`}
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-4xl drop-shadow-lg sm:text-6xl">
                          🍽️
                        </span>
                      )}
                      {!product.isAvailable && (
                        <span className="absolute left-1.5 top-1.5 sm:left-2 sm:top-2 rounded-full bg-white px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-neutral-700 shadow">
                          Sold out
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:items-end sm:p-4">
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold leading-tight line-clamp-2 text-[#2b1a12]">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="mt-0.5 text-xs text-[#2b1a12]/60 line-clamp-1">
                            {product.description}
                          </p>
                        )}
                        <p className="mt-0.5 sm:mt-1 font-display text-base font-black text-[#e8432d] sm:text-xl">
                          {money(product.price)}
                        </p>
                      </div>

                      {product.isAvailable ? (
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={orderingPaused}
                          className={`h-9 w-9 sm:h-11 sm:w-11 rounded-full ${BRAND} text-white flex items-center justify-center shrink-0 shadow-[0_6px_14px_rgba(232,67,45,0.4)] transition active:scale-90 hover:brightness-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none`}
                          aria-label={`Add ${product.name} to cart`}
                        >
                          <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                      ) : (
                        <div className="h-9 w-9 sm:h-11 sm:w-11 shrink-0" /> // keeps layout aligned, no button shown
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}

        {totalItems > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#fff6e8] via-[#fff6e8]/90 to-transparent p-3 sm:p-4 w-full box-border">
            <div className="max-w-2xl mx-auto">
              <button
                onClick={() => navigate(tableToken ? `/cart?table=${tableToken}` : '/cart')}
                className={`w-full h-11 sm:h-14 rounded-xl sm:rounded-2xl ${BRAND} text-white text-sm sm:text-base font-bold shadow-[0_12px_28px_rgba(232,67,45,0.45)] transition active:scale-[0.98]`}
              >
                View Cart ({totalItems} {totalItems === 1 ? 'item' : 'items'})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}