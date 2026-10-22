import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext.tsx';
import { SettingsProvider } from './context/SettingsContext.tsx';
createRoot(document.getElementById('root')!).render(
  <StrictMode>

    <AuthProvider>
      <SettingsProvider>
        <CartProvider>
            <App />
        </CartProvider>
      </SettingsProvider>
    </AuthProvider>
  </StrictMode>
 
)


// <AuthProvider>
//   <App />
// </AuthProvider>