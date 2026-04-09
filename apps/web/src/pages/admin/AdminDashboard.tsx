import { FC } from 'react';
import { Navigate } from 'react-router-dom';

const AdminDashboard: FC = () => {
  return <Navigate to="/admin/products" replace />;
};

export default AdminDashboard;
