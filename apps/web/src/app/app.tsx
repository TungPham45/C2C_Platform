import { Routes, Route, Navigate } from 'react-router-dom';
import { SellerCenterPage } from '../pages/seller/SellerCenter';
import { ProductManagementPage } from '../pages/seller/ProductManagement';
import { AddProductPage } from '../pages/seller/AddProduct';
import { EditProductPage } from '../pages/seller/EditProduct';
import { SellerOrderManagement } from '../pages/seller/OrderManagement';
import { SellerOrderDetail } from '../pages/seller/OrderDetail';
import SellerChat from '../pages/seller/SellerChat';
import { AnalyticsPage } from '../pages/seller/Analytics';
import { InventoryPage } from '../pages/seller/Inventory';
import { SettingsPage } from '../pages/seller/Settings';
import { ReviewsPage } from '../pages/seller/Reviews';
import { CheckoutPage } from '../pages/CheckoutPage';
import { OrderSuccess } from '../pages/OrderSuccess';
import { MyPurchasesPage } from '../pages/MyPurchases';
import { BuyerOrderDetail } from '../pages/BuyerOrderDetail';
import { MarketplaceHomePage } from '../pages/MarketplaceHomePage';
import { ProductsPage } from '../pages/ProductsPage';
import { ProductDetailPage } from '../pages/ProductDetail';
import { ShopPage } from '../pages/ShopPage';
import { CartPage } from '../pages/CartPage';
import { ProfilePage } from '../pages/ProfilePage';
import { AuthPage } from '../pages/auth/AuthPage';
import { MessagesPage } from '../pages/MessagesPage';
import AdminDashboard from '../pages/admin/AdminDashboard';
import ProductModeration from '../pages/admin/ProductModeration';
import ShopModeration from '../pages/admin/ShopModeration';
import ShopManagement from '../pages/admin/ShopManagement';
import AccountManagement from '../pages/admin/AccountManagement';
import UserAnalytics from '../pages/admin/UserAnalytics';
import ShopSalesAnalytics from '../pages/admin/ShopSalesAnalytics';
import CategoryManagement from '../pages/admin/CategoryManagement';
import { BannersAdminPage } from '../pages/admin/BannersAdminPage';
import { SellerProtectedRoute } from '../components/auth/SellerProtectedRoute';
import { BuyerProtectedRoute } from '../components/auth/BuyerProtectedRoute';
import { AdminProtectedRoute } from '../components/auth/AdminProtectedRoute';
import { SellerRegistration } from '../pages/seller/SellerRegistration';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<MarketplaceHomePage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/category/:slug" element={<ProductsPage />} />
      <Route path="/product/:id" element={<ProductDetailPage />} />
      <Route path="/shop/:id" element={<ShopPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />

      {/* Seller Routes */}
      <Route element={<BuyerProtectedRoute />}>
        <Route path="/seller/register" element={<SellerRegistration />} />
      </Route>
      <Route element={<SellerProtectedRoute />}>
        <Route path="/seller" element={<Navigate to="/seller/center" replace />} />
        <Route path="/seller/center" element={<SellerCenterPage />} />
        <Route path="/seller/products" element={<ProductManagementPage />} />
        <Route path="/seller/add-product" element={<AddProductPage />} />
        <Route path="/seller/edit-product/:id" element={<EditProductPage />} />
        <Route path="/seller/orders" element={<SellerOrderManagement />} />
        <Route path="/seller/orders/:id" element={<SellerOrderDetail />} />
        <Route path="/seller/chat" element={<SellerChat />} />
        <Route path="/seller/analytics" element={<AnalyticsPage />} />
        <Route path="/seller/reviews" element={<ReviewsPage />} />
        <Route path="/seller/inventory" element={<InventoryPage />} />
        <Route path="/seller/settings" element={<SettingsPage />} />
      </Route>
      
      {/* Order Flow */}
      <Route element={<BuyerProtectedRoute />}>
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/orders" element={<MyPurchasesPage />} />
        <Route path="/orders/:id" element={<BuyerOrderDetail />} />
        <Route path="/messages" element={<MessagesPage />} />
      </Route>
      <Route element={<BuyerProtectedRoute />}>
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      
      {/* Admin Routes */}
      <Route element={<AdminProtectedRoute />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/products" element={<ProductModeration />} />
        <Route path="/admin/applications" element={<ShopModeration />} />
        <Route path="/admin/shops" element={<ShopManagement />} />
        <Route path="/admin/banners" element={<BannersAdminPage />} />
        <Route path="/admin/users" element={<AccountManagement />} />
        <Route path="/admin/analytics/users" element={<UserAnalytics />} />
        <Route path="/admin/analytics/shop-sales" element={<ShopSalesAnalytics />} />
        <Route path="/admin/categories" element={<CategoryManagement />} />
      </Route>

    </Routes>
  );
}

export default App;
