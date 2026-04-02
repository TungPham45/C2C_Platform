import { useState, useCallback } from 'react';

// Centralize API fetches through the Next-Gen API Gateway
const API_BASE = 'http://localhost:3000/api/products'; 

export const useProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShopProducts = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('c2c_token');
      if (!token) throw new Error('Unauthorized Session');

      const res = await fetch(`${API_BASE}/seller`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch products from gateway');
      const data = await res.json();
      setProducts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProduct = async (productData: any) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('c2c_token');
      const res = await fetch(`${API_BASE}/seller`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      });
      if (!res.ok) throw new Error('Failed to create product');
      await fetchShopProducts(); // refresh list
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: number) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('c2c_token');
      const res = await fetch(`${API_BASE}/seller/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete product');
      setProducts(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { products, loading, error, fetchShopProducts, createProduct, deleteProduct };
};
