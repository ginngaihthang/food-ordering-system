import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import AdminLogin from "./pages/admin/Login"
import RequireAuth from "./components/admin/RequireAuth"
import AdminLayout from "./components/admin/AdminLayout"
import Dashboard from "./pages/admin/Dashboard"
import RequireGuest from "./components/admin/ReauireGuest"

function App() { 
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login" element={<RequireGuest> AdminLogin</RequireGuest> }/>
        <Route 
          path="/admin"
          element= {
            <RequireAuth>
              <AdminLayout/>
            </RequireAuth>
          }
        >
          <Route path="/admin/dashboard" element={<Dashboard />} />
        </Route>
         {/* <Route path="dashboard" element={<Dashboard />} /> */}
      </Routes>
    </BrowserRouter>
  )
}

export default App