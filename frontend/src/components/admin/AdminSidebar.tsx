import { NavLink } from 'react-router-dom';
import { LogOut, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import type { NavGroup } from './navigation';

interface AdminSidebarProps {
  groups: NavGroup[];
  user: { name: string; role: string };
  onLogout: () => void;
  /** Called after a link is clicked (the mobile drawer uses it to close itself) */
  onNavigate?: () => void;
  /** "rail" is the narrow icon column used on tablets */
  variant?: 'full' | 'rail';
  brand?: { title: string; subtitle: string; icon?: LucideIcon };
}

export function AdminSidebar({
  groups,
  user,
  onLogout,
  onNavigate,
  variant = 'full',
  brand = { title: 'Restaurant Admin', subtitle: 'Order console', icon: UtensilsCrossed },
}: AdminSidebarProps) {
  const BrandIcon = brand.icon ?? UtensilsCrossed;
  const initials = user.name.slice(0, 2).toUpperCase() || 'AD';

  if (variant === 'rail') {
    const items = groups.flatMap((group) => group.items);

    return (
      <div className="flex h-full flex-col items-center py-4">
        <div
          title={brand.title}
          className="mb-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background"
        >
          <BrandIcon className="h-5 w-5" />
        </div>

        <nav
          aria-label="Main"
          className="flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto px-2"
        >
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-center text-[11px] font-medium leading-tight transition-colors ${
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`
              }
            >
              <Icon className="h-6 w-6" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-2 flex w-full shrink-0 flex-col items-center gap-1 border-t px-2 pt-3">
          <div
            title={`${user.name} (${user.role.toLowerCase()})`}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-sm font-semibold"
          >
            {initials}
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
            Log out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
          <BrandIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold leading-tight">{brand.title}</p>
          <p className="text-sm leading-tight text-muted-foreground">{brand.subtitle}</p>
        </div>
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-3 pt-2">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 pb-1 text-xs text-muted-foreground">{group.label}</p>
            {group.items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] transition-colors ${
                    isActive
                      ? 'bg-muted font-semibold text-foreground'
                      : 'text-foreground/80 hover:bg-muted/60'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User + logout */}
      <div className="border-t p-3">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">{user.name}</p>
            <p className="text-sm capitalize leading-tight text-muted-foreground">
              {user.role.toLowerCase()}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] text-foreground/80 transition-colors hover:bg-muted/60"
        >
          <LogOut className="h-5 w-5" />
          Log out
        </button>
      </div>
    </div>
  );
}