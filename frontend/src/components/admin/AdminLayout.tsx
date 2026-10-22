import { useCallback, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, PanelLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AdminSidebar } from './AdminSidebar';
import { ConnectionBanner } from './ConnectionBanner';
import { SidebarDrawer } from './SidebarDrawer';
import { adminNavGroups, adminNavItems } from './navigation';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // The phone drawer is "open for this page", so it closes by itself when the page changes
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const drawerOpen = drawerPath === location.pathname;
  const closeDrawer = useCallback(() => setDrawerPath(null), []);

  const sidebarUser = { name: user?.username ?? 'Admin', role: user?.role ?? 'STAFF' };
  const current = adminNavItems.find((item) => location.pathname.startsWith(item.to));

  // Staff don't see admin-only pages in the menu
  const visibleGroups = useMemo(
    () =>
      adminNavGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !item.adminOnly || user?.role === 'ADMIN'),
        }))
        .filter((group) => group.items.length > 0),
    [user?.role]
  );

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <div className="min-h-screen bg-muted/20 md:flex">
      {/* Tablet (768 to 1279): icon rail */}
      <aside className="sticky top-0 hidden h-screen w-[5.5rem] shrink-0 border-r bg-background md:block xl:hidden">
        <AdminSidebar
          variant="rail"
          groups={visibleGroups}
          user={sidebarUser}
          onLogout={handleLogout}
        />
      </aside>

      {/* Desktop (1280 and up): full sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r bg-background xl:block">
        <AdminSidebar groups={visibleGroups} user={sidebarUser} onLogout={handleLogout} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phone only: top bar with the menu button */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4 md:hidden">
          <button
            type="button"
            onClick={() => setDrawerPath(location.pathname)}
            className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
          >
            <PanelLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-1.5 text-sm">
            {current && (
              <>
                <span className="hidden text-muted-foreground sm:inline">{current.group}</span>
                <ChevronRight className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
              </>
            )}
            <span className="font-medium">{current?.label ?? 'Admin'}</span>
          </div>
        </header>

        <ConnectionBanner />

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      {/* Phone drawer */}
      <SidebarDrawer open={drawerOpen} onClose={closeDrawer}>
        <AdminSidebar
          groups={visibleGroups}
          user={sidebarUser}
          onNavigate={closeDrawer}
          onLogout={handleLogout}
        />
      </SidebarDrawer>
    </div>
  );
}