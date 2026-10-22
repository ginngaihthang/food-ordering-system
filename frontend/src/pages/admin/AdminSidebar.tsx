import { NavLink } from 'react-router-dom';
import { LogOut, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import type { NavGroup } from '@/components/admin/navigation';

interface AdminSidebarProps {
  groups: NavGroup[];
  user: { name: string; role: string };
  onLogout: () => void;
  /** Called after a link is clicked (the mobile drawer uses it to close itself) */
  onNavigate?: () => void;
  brand?: { title: string; subtitle: string; icon?: LucideIcon };
}

export function AdminSidebar({
  groups,
  user,
  onLogout,
  onNavigate,
  brand = { title: 'Restaurant Admin', subtitle: 'Order console', icon: UtensilsCrossed },
}: AdminSidebarProps) {
  const BrandIcon = brand.icon ?? UtensilsCrossed;
  const initials = user.name.slice(0, 2).toUpperCase() || 'AD';

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2.5 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
          <BrandIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{brand.title}</p>
          <p className="text-xs leading-tight text-muted-foreground">{brand.subtitle}</p>
        </div>
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 pb-3 pt-1">
        {groups.map((group) => (
          <div key={group.label} className="space-y-0.5">
            <p className="px-2 pb-1 text-xs text-muted-foreground">{group.label}</p>
            {group.items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-foreground/80 hover:bg-muted/60'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User + logout */}
      <div className="border-t p-2">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight">{user.name}</p>
            <p className="text-xs capitalize leading-tight text-muted-foreground">
              {user.role.toLowerCase()}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-muted/60"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </div>
  );
}