import { Routes, Route, Navigate } from 'react-router-dom';
import { SellerCenterPage } from '../pages/seller/SellerCenter';
import { ProductManagementPage } from '../pages/seller/ProductManagement';
import { AddProductPage } from '../pages/seller/AddProduct';
import { EditProductPage } from '../pages/seller/EditProduct';
import { SellerOrderManagement } from '../pages/seller/OrderManagement';
import { SellerOrderDetail } from '../pages/seller/OrderDetail';
import { CheckoutPage } from '../pages/CheckoutPage';
import { OrderSuccess } from '../pages/OrderSuccess';
import { MyPurchasesPage } from '../pages/MyPurchases';
import { MarketplaceHomePage } from '../pages/MarketplaceHomePage';
import { ProductsPage } from '../pages/ProductsPage';
import { ProductDetailPage } from '../pages/ProductDetail';
import { BuyerOrderDetail } from '../pages/BuyerOrderDetail';
import { ShopPage } from '../pages/ShopPage';
import { CartPage } from '../pages/CartPage';
import { AuthPage } from '../pages/auth/AuthPage';
import AdminDashboard from '../pages/admin/AdminDashboard';
import ProductModeration from '../pages/admin/ProductModeration';
import { SellerProtectedRoute } from '../components/auth/SellerProtectedRoute';
import { SellerRegistration } from '../pages/seller/SellerRegistration';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<MarketplaceHomePage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/product/:id" element={<ProductDetailPage />} />
      <Route path="/shop/:id" element={<ShopPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />

      {/* Seller Routes */}
      <Route path="/seller/register" element={<SellerRegistration />} />
      <Route element={<SellerProtectedRoute />}>
        <Route path="/seller" element={<Navigate to="/seller/center" replace />} />
        <Route path="/seller/center" element={<SellerCenterPage />} />
        <Route path="/seller/products" element={<ProductManagementPage />} />
        <Route path="/seller/add-product" element={<AddProductPage />} />
        <Route path="/seller/edit-product/:id" element={<EditProductPage />} />
        <Route path="/seller/orders" element={<SellerOrderManagement />} />
        <Route path="/seller/orders/:id" element={<SellerOrderDetail />} />
      </Route>
      
      {/* Order Flow */}
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/order-success" element={<OrderSuccess />} />
      <Route path="/orders" element={<MyPurchasesPage />} />
      <Route path="/orders/:id" element={<BuyerOrderDetail />} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/products" element={<ProductModeration />} />
      <Route path="/admin/applications" element={<div className="p-10 text-center font-bold text-slate-400">Shop Approval - Coming Soon</div>} />

    </Routes>
  );
}

export default App;
