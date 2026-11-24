import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { ThemeProvider } from './context/ThemeContext';
import { DashboardPage } from './pages/DashboardPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center text-[13.5px] text-ink-muted">
        Oturum doğrulanıyor...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/giris" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center text-[13.5px] text-ink-muted">
        Yükleniyor...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/panel" replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <ThemeProvider>
      <PreferencesProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route
                path="/giris"
                element={
                  <GuestOnly>
                    <LoginPage />
                  </GuestOnly>
                }
              />
              <Route
                path="/kayit"
                element={
                  <GuestOnly>
                    <RegisterPage />
                  </GuestOnly>
                }
              />
              <Route
                path="/sifremi-unuttum"
                element={
                  <GuestOnly>
                    <ForgotPasswordPage />
                  </GuestOnly>
                }
              />
              <Route
                path="/panel"
                element={
                  <RequireAuth>
                    <DashboardPage />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </PreferencesProvider>
    </ThemeProvider>
  );
}

export default App;
