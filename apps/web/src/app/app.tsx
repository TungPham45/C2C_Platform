import { Routes, Route, Navigate } from 'react-router-dom';
import { SellerCenterPage } from '../pages/seller/SellerCenter';
import { ProductManagementPage } from '../pages/seller/ProductManagement';
import { AddProductPage } from '../pages/seller/AddProduct';
import { EditProductPage } from '../pages/seller/EditProduct';
import { SellerOrderManagement } from '../pages/seller/OrderManagement';
import { SellerOrderDetail } from '../pages/seller/OrderDetail';
import SellerChat from '../pages/seller/SellerChat';
import { SellerVoucherManagementPage } from '../pages/seller/VoucherManagement';
import { SellerCreateVoucherPage } from '../pages/seller/CreateVoucher';
import { SellerEditVoucherPage } from '../pages/seller/EditVoucher';
import { ShopCategoriesPage } from '../pages/seller/ShopCategories';
import { CheckoutPage } from '../pages/CheckoutPage';
import { OrderSuccess } from '../pages/OrderSuccess';
import { MyPurchasesPage } from '../pages/MyPurchases';
import { MarketplaceHomePage } from '../pages/MarketplaceHomePage';
import { ProductsPage } from '../pages/ProductsPage';
import { ProductDetailPage } from '../pages/ProductDetail';
import { BuyerOrderDetail } from '../pages/BuyerOrderDetail';
import { ShopPage } from '../pages/ShopPage';
import { CartPage } from '../pages/CartPage';
import { ProfilePage } from '../pages/ProfilePage';
import { AuthPage } from '../pages/auth/AuthPage';
import { MessagesPage } from '../pages/MessagesPage';
import { VoucherHub } from '../pages/VoucherHub';
import AdminDashboard from '../pages/admin/AdminDashboard';
import ProductModeration from '../pages/admin/ProductModeration';
import ShopModeration from '../pages/admin/ShopModeration';
import ShopManagement from '../pages/admin/ShopManagement';
import AccountManagement from '../pages/admin/AccountManagement';
import UserAnalytics from '../pages/admin/UserAnalytics';
import ShopSalesAnalytics from '../pages/admin/ShopSalesAnalytics';
import CategoryManagement from '../pages/admin/CategoryManagement';
import { BannersAdminPage } from '../pages/admin/BannersAdminPage';
import { VoucherList } from '../pages/admin/VoucherManagement/VoucherList';
import { CreateVoucher } from '../pages/admin/VoucherManagement/CreateVoucher';
import { EditVoucher } from '../pages/admin/VoucherManagement/EditVoucher';
import { SellerProtectedRoute } from '../components/auth/SellerProtectedRoute';
import { BuyerProtectedRoute } from '../components/auth/BuyerProtectedRoute';
import { SellerRegistration } from '../pages/seller/SellerRegistration';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<MarketplaceHomePage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/category/:slug" element={<ProductsPage />} />
      <Route path="/product/:id" element={<ProductDetailPage />} />
      <Route path="/shop/:id" element={<ShopPage />} />
      <Route path="/vouchers" element={<VoucherHub />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />

      {/* Seller Routes */}
      <Route path="/seller/register" element={<SellerRegistration />} />
      <Route element={<SellerProtectedRoute />}>
        <Route path="/seller" element={<Navigate to="/seller/center" replace />} />
        <Route path="/seller/center" element={<SellerCenterPage />} />
        <Route path="/seller/products" element={<ProductManagementPage />} />
        <Route path="/seller/vouchers" element={<SellerVoucherManagementPage />} />
        <Route path="/seller/vouchers/new" element={<SellerCreateVoucherPage />} />
        <Route path="/seller/vouchers/edit/:id" element={<SellerEditVoucherPage />} />
        <Route path="/seller/categories" element={<ShopCategoriesPage />} />
        <Route path="/seller/add-product" element={<AddProductPage />} />
        <Route path="/seller/edit-product/:id" element={<EditProductPage />} />
        <Route path="/seller/orders" element={<SellerOrderManagement />} />
        <Route path="/seller/orders/:id" element={<SellerOrderDetail />} />
        <Route path="/seller/chat" element={<SellerChat />} />
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
      <Route path="/profile" element={<ProfilePage />} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/products" element={<ProductModeration />} />
      <Route path="/admin/applications" element={<ShopModeration />} />
      <Route path="/admin/shops" element={<ShopManagement />} />
      <Route path="/admin/banners" element={<BannersAdminPage />} />
      <Route path="/admin/vouchers" element={<VoucherList />} />
      <Route path="/admin/vouchers/new" element={<CreateVoucher />} />
      <Route path="/admin/vouchers/edit/:id" element={<EditVoucher />} />
      <Route path="/admin/users" element={<AccountManagement />} />
      <Route path="/admin/analytics/users" element={<UserAnalytics />} />
      <Route path="/admin/analytics/shop-sales" element={<ShopSalesAnalytics />} />
      <Route path="/admin/categories" element={<CategoryManagement />} />

    </Routes>
  );
}

export default App;
