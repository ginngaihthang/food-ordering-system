import {
  ClipboardList,
  History,
  LayoutDashboard,
  QrCode,
  ShoppingBag,
  SlidersHorizontal,
  Tags,
  UserCog,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const adminNavGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Orders',
    items: [
      { to: '/admin/orders', label: 'Live orders', icon: ClipboardList },
      { to: '/admin/takeaway', label: 'Takeaway', icon: ShoppingBag },
      { to: '/admin/order-history', label: 'History', icon: History },
    ],
  },
  {
    label: 'Restaurant',
    items: [
      { to: '/admin/products', label: 'Products', icon: UtensilsCrossed },
      { to: '/admin/categories', label: 'Categories', icon: Tags },
      { to: '/admin/tables', label: 'Tables', icon: QrCode },
      { to: '/admin/settings', label: 'Settings', icon: SlidersHorizontal },
    ],
  },
  {
    label: 'Administration',
    items: [{ to: '/admin/users', label: 'Users', icon: UserCog, adminOnly: true }],
  },
];

// Flat list with the group name attached
export const adminNavItems = adminNavGroups.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.label }))
);