import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, UtensilsCrossed, QrCode, ClipboardList, LogOut } from 'lucide-react';

const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/products', label: 'Products', icon: UtensilsCrossed },
    { to: '/admin/tables', label: 'Tabels', icon: QrCode},
    { to: '/admin/orders', label: 'Orders', icon: ClipboardList},
]

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate =useNavigate();

    function handleLogout() {
        logout();
        navigate('/admin/login');
    }

    return (
        <div className="min-h-screen flex bg-muted/20">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-background flex flex-col">
            <div className="p-6">
            <h1 className="text-lg font-semibold">Restaurant Admin</h1>
            <p className="text-sm text-muted-foreground">{user?.username}</p>
            </div>
            <Separator />
            <nav className="flex-1 p-4 space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`
                }
                >
                <Icon className="h-4 w-4" />
                {label}
                </NavLink>
            ))}
            </nav>
            <Separator />
            <div className="p-4">
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Logout
            </Button>
            </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">
            <Outlet />
        </main>
        </div>
    );

}