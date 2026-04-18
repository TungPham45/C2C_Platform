import { FC, ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface BuyerProtectedRouteProps {
  children?: ReactNode;
}

export const BuyerProtectedRoute: FC<BuyerProtectedRouteProps> = ({ children }) => {
  const userStr = localStorage.getItem('c2c_user');
  
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      // Nếu là admin thì không được phép truy cập luồng mua hàng
      if (user.role === 'admin') {
        return <Navigate to="/admin" replace />;
      }
    } catch (e) {
      // Bỏ qua lỗi parse
    }
  }

  // Cho phép người dùng chưa đăng nhập hoặc không phải admin (yêu cầu đăng nhập cụ thể sẽ xử lý trong component nếu cần)
  return children ? <>{children}</> : <Outlet />;
};
