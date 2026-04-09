import { FC, ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface SellerProtectedRouteProps {
  children?: ReactNode;
}

export const SellerProtectedRoute: FC<SellerProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem('c2c_token');
  const userStr = localStorage.getItem('c2c_user');
  
  if (!token || !userStr) {
    // Not logged in -> redirect to login
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    if (!user.shop) {
      // Logged in but no shop registered -> redirect to shop registration
      return <Navigate to="/seller/register" replace />;
    }
  } catch (e) {
    // Parsing error, assume bad session
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
