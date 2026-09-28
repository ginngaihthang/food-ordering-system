import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ProductSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function ProductSearch({
  value,
  onChange,
}: ProductSearchProps) {
  return (
    <div className="relative ml-auto max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

      <Input
        placeholder="Search products..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pl-9"
      />
    </div>
  );
}