import { StrictMode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import * as ReactDOM from 'react-dom/client';
import App from './app/app';

const SESSION_BOOTSTRAP_KEY = 'c2c_session_bootstrapped';
const AUTH_STORAGE_KEYS = ['c2c_token', 'c2c_user', 'c2c_user_id', 'c2c_shop_id'];

if (!sessionStorage.getItem(SESSION_BOOTSTRAP_KEY)) {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  sessionStorage.setItem(SESSION_BOOTSTRAP_KEY, 'true');
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
