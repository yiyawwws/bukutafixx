import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './context/ToastContext';

// Templates
import MainLayout from './components/templates/MainLayout';
import AuthLayout from './components/templates/AuthLayout';
import DashboardLayout from './components/templates/DashboardLayout';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import BookDetail from './pages/BookDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import BuyerOrders from './pages/BuyerOrders';
import Profile from './pages/Profile';

// Admin Pages
import AdminUsers from './pages/admin/AdminUsers';
import AdminBooks from './pages/admin/AdminBooks';
import AdminCategories from './pages/admin/AdminCategories';
import AdminDisputes from './pages/admin/AdminDisputes';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';

// Seller Pages
import SellerBooks from './pages/seller/SellerBooks';
import AddBook from './pages/seller/AddBook';
import SellerOrders from './pages/seller/SellerOrders';
import SellerBankAccount from './pages/seller/SellerBankAccount';
import SellerBalance from './pages/seller/SellerBalance';
import SellerWithdrawal from './pages/seller/SellerWithdrawal';
import SellerReviews from './pages/seller/SellerReviews';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <SocketProvider>
              <Routes>
                {/* Public routes with Navbar + Footer */}
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<Home />} />
                  <Route path="books/:id" element={<BookDetail />} />
                  <Route path="cart" element={<Cart />} />
                  <Route path="checkout" element={<Checkout />} />
                </Route>

                {/* Auth routes (centered, split layout) */}
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                </Route>

                {/* Dashboard routes (sidebar layout) */}
                <Route element={<DashboardLayout />}>
                  <Route path="/buyer/dashboard" element={<Dashboard />} />
                  <Route path="/buyer/orders" element={<BuyerOrders />} />
                  <Route path="/seller/dashboard" element={<Dashboard />} />
                  <Route path="/seller/books" element={<SellerBooks />} />
                  <Route path="/seller/books/add" element={<AddBook />} />
                  <Route path="/seller/orders" element={<SellerOrders />} />
                  <Route path="/seller/bank-account" element={<SellerBankAccount />} />
                  <Route path="/seller/balance" element={<SellerBalance />} />
                  <Route path="/seller/withdrawal" element={<SellerWithdrawal />} />
                  <Route path="/seller/reviews" element={<SellerReviews />} />
                  <Route path="/admin/dashboard" element={<Dashboard />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/books" element={<AdminBooks />} />
                  <Route path="/admin/categories" element={<AdminCategories />} />
                  <Route path="/admin/disputes" element={<AdminDisputes />} />
                  <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>
              </Routes>
            </SocketProvider>
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
