import { MoreHorizontal, Pencil, Utensils, UtensilsCrossed } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { Product } from '@/types/product';

export type Tint = { bg: string; fg: string };

type Props = {
  product: Product;
  categoryName?: string;
  tint: Tint;
  onEdit: (product: Product) => void;
  onMore: (product: Product) => void;
  onToggleAvailability: (product: Product) => void;
};

export function ProductCard({ product, categoryName, tint, onEdit, onMore, onToggleAvailability }: Props) {
  const available = product.isAvailable;

  return (
    <div className="group relative aspect-square overflow-hidden rounded-2xl bg-neutral-900">
      {/* Photo, or a tinted placeholder when there's no image */}
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className={`absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105 ${
            available ? '' : 'grayscale'
          }`}
        />
      ) : (
        <div className={`absolute inset-0 flex items-center justify-center ${tint.bg}`}>
          <UtensilsCrossed className={`h-12 w-12 ${tint.fg}`} />
        </div>
      )}

      {/* Dark fade at the bottom so the white text stays readable on any photo */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

      {/* Top badges */}
      <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        {categoryName && (
          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
            <Utensils className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{categoryName}</span>
          </span>
        )}
        {!available && (
          <span className="shrink-0 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
            Sold out
          </span>
        )}
      </div>

      {/* Bottom content */}
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <h3 className="truncate text-lg font-bold" title={product.name}>
          {product.name}
        </h3>
        <p className="text-xl font-bold tabular-nums">${Number(product.price).toFixed(2)}</p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <label className="flex min-w-0 cursor-pointer items-center gap-2">
            <Switch
              checked={available}
              onCheckedChange={() => onToggleAvailability(product)}
              className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-white/30"
            />
            <span className="truncate text-sm text-white/85">
              {available ? 'Available' : 'Sold out'}
            </span>
          </label>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => onEdit(product)}
              aria-label={`Edit ${product.name}`}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/40 bg-black/20 text-white backdrop-blur-sm transition hover:bg-white/15 active:scale-95"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onMore(product)}
              aria-label={`More actions for ${product.name}`}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/40 bg-black/20 text-white backdrop-blur-sm transition hover:bg-white/15 active:scale-95"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}