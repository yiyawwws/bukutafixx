import React, { createContext, useState, useEffect, useContext } from 'react';
import { cartService } from '../services/cartService';
import { AuthContext } from './AuthContext';

export const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCart = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await cartService.getCart();
      if (data.success) {
        setCart(data.data);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch cart', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      setCart([]);
      setTotal(0);
    }
  }, [user]);

  const addToCart = async (bookId, quantity = 1) => {
    try {
      await cartService.addToCart(bookId, quantity);
      await fetchCart();
      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, message: error.response?.data?.message || 'Gagal menambahkan ke keranjang' };
    }
  };

  return (
    <CartContext.Provider value={{ cart, total, loading, fetchCart, addToCart }}>
      {children}
    </CartContext.Provider>
  );
};
