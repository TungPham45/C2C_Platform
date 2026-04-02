import { Routes, Route, Navigate } from 'react-router-dom';
import { SellerCenterPage } from '../pages/seller/SellerCenter';
import { ProductManagementPage } from '../pages/seller/ProductManagement';
import { AddProductPage } from '../pages/seller/AddProduct';
import { EditProductPage } from '../pages/seller/EditProduct';
import { LoginPage } from '../pages/auth/Login';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Seller Routes */}
      <Route path="/seller" element={<SellerCenterPage />} />
      <Route path="/seller/products" element={<ProductManagementPage />} />
      <Route path="/seller/add-product" element={<AddProductPage />} />
      <Route path="/seller/edit-product/:id" element={<EditProductPage />} />

    </Routes>
  );
}

export default App;
