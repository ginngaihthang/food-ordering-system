import { ProductSearch } from '@/components/products/ProductSearch';

type Category = { id: number | string; name: string };

type Props = {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (id: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
};

export function ProductToolbar({
  categories,
  activeCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: Props) {
  const pills = [{ id: 'all', name: 'All' }, ...categories.map((c) => ({ id: String(c.id), name: c.name }))];

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      {/* Scrolls sideways on narrow screens instead of wrapping */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:pb-0">
        {pills.map((pill) => {
          const active = activeCategory === pill.id;
          return (
            <button
              key={pill.id}
              onClick={() => onCategoryChange(pill.id)}
              className={`h-11 shrink-0 rounded-full border px-5 text-sm font-semibold transition active:scale-95 ${
                active
                  ? 'border-foreground bg-foreground text-background'
                  : 'bg-card hover:bg-muted'
              }`}
            >
              {pill.name}
            </button>
          );
        })}
      </div>

      <div className="w-full md:w-64 md:shrink-0">
        <ProductSearch value={searchQuery} onChange={onSearchChange} />
      </div>
    </div>
  );
}