import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthSplitLayout } from '../components/AuthSplitLayout';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string } | null)?.from || '/panel';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Lütfen geçerli bir e-posta adresi girin.');
      return;
    }
    if (password.length < 4) {
      setError('Lütfen şifrenizi girin.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(trimmedEmail, password);
      navigate(fromPath, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Giriş yapılırken beklenmeyen bir hata oluştu.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthSplitLayout
      eyebrow="Hesap Erişimi"
      title="Tekrar hoş geldiniz"
      subtitle="KiraTakip hesabınızla giriş yaparak mülk ve tahsilat defterinize devam edin."
      footer={
        <p className="text-[13.5px] text-ink-muted">
          Henüz hesabınız yok mu?{' '}
          <Link
            to="/kayit"
            className="font-semibold text-accent hover:text-accent-hover transition-colors"
          >
            Ücretsiz hesap oluşturun →
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && (
          <div
            role="alert"
            className="px-4 py-3 rounded-lg border border-danger/30 bg-danger-soft/70 text-[13px] text-danger leading-relaxed"
          >
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="login-email"
            className="block text-[12.5px] font-medium text-ink mb-1.5"
          >
            E-posta Adresi
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            placeholder="ornek@eposta.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline text-[14px] text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="login-password"
              className="block text-[12.5px] font-medium text-ink"
            >
              Şifre
            </label>
            <Link
              to="/sifremi-unuttum"
              className="text-[12px] font-medium text-ink-muted hover:text-accent transition-colors"
            >
              Şifremi unuttum
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 pr-16 rounded-xl bg-canvas border border-hairline text-[14px] text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[11.5px] font-medium text-ink-muted hover:text-ink cursor-pointer"
            >
              {showPassword ? 'Gizle' : 'Göster'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 rounded-lg bg-accent text-white text-[14px] font-semibold hover:bg-accent-hover disabled:opacity-60 transition-colors cursor-pointer"
        >
          {isSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap →'}
        </button>
      </form>
    </AuthSplitLayout>
  );
}
