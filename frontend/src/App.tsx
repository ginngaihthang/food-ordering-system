import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import AdminLogin from "./pages/admin/Login"
import RequireAuth from "./components/admin/RequireAuth"
import AdminLayout from "./components/admin/AdminLayout"
import Dashboard from "./pages/admin/Dashboard"
import RequireGuest from "./components/admin/ReauireGuest"
import Products from "./pages/admin/Products"
import Tables from "./pages/admin/Tables"
import Menu from "./pages/customer/Menu"
import Cart from "./pages/customer/Cart"
import OrderStatus from "./pages/customer/OrderStatus"
import Orders from "./pages/admin/Orders"
import SessionOrders from "./pages/customer/SessionOrders"
import OrderHistory from "./pages/admin/OrderHistory"
import Receipt from "./pages/admin/Receipt"
import Categories from "./pages/admin/Categories"
import MyTakeawayOrders from "./pages/customer/MyTakeawayOrders"
import TakeawayOrders from "./pages/admin/TakeawayOrders"
import RequireRole from "./pages/admin/RequireRole"
import Users from "./pages/admin/User"
import Settings from "./pages/admin/Settings"
import TakeawayQr from "./pages/admin/TakeawayQr"

function App() { 
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/menu" replace />} />
        <Route path="/admin/login" element={<RequireGuest> <AdminLogin/></RequireGuest> }/>
        
        <Route 
          path="/admin"
          element= {
            <RequireAuth>
              <AdminLayout/>
            </RequireAuth>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="categories" element={<Categories />} />
          <Route path="tables" element={<Tables />} />
          <Route path="takeaway" element={<TakeawayOrders />} />
          <Route path="orders" element={<Orders />} />
          <Route path="order-history" element={<OrderHistory />} />
          <Route path="receipt/:id" element={<Receipt />} />
          <Route path="settings" element={<Settings />} />
          <Route
            path="users"
            element={
              <RequireRole roles={['ADMIN']}>
                <Users />
              </RequireRole>
            }
          />
          <Route
            path="takeaway-qr"
            element={
              <RequireAuth>
                <TakeawayQr />
              </RequireAuth>
            }
          />
        </Route>
        
         <Route path="/menu" element={<Menu />} />
         <Route path="/cart" element={<Cart />} />
         <Route path="/order/:token" element={<OrderStatus />} />
         <Route path="/session-orders" element={<SessionOrders />} />
         <Route path="/my-orders" element={<MyTakeawayOrders />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App