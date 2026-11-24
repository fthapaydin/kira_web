import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthSplitLayout } from '../components/AuthSplitLayout';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import { formatPhone10, stripDigits } from '../lib/formatters';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [userType, setUserType] = useState<'LANDLORD' | 'TENANT'>('LANDLORD');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !surname.trim()) {
      setError('Lütfen ad ve soyad bilgilerinizi girin.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Lütfen geçerli bir e-posta adresi girin.');
      return;
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        name: name.trim(),
        surname: surname.trim(),
        email: email.trim(),
        password,
        passwordConfirmation: passwordConfirm,
        phone: stripDigits(phone),
        userType,
      });
      navigate('/panel', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Kayıt sırasında bir hata oluştu.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthSplitLayout
      eyebrow="Yeni Kayıt"
      title="Hesabınızı oluşturun"
      subtitle="Mülk sahibi veya kiracı rolünü seçin; mobil uygulamanızla aynı hesap üzerinden çalışır."
      footer={
        <p className="text-[13.5px] text-ink-muted">
          Zaten hesabınız var mı?{' '}
          <Link
            to="/giris"
            className="font-semibold text-accent hover:text-accent-hover transition-colors"
          >
            Giriş yapın →
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="px-4 py-3 rounded-lg border border-danger/30 bg-danger-soft/70 text-[13px] text-danger whitespace-pre-line"
          >
            {error}
          </div>
        )}

        {/* Role Selector */}
        <div>
          <span className="block text-[12.5px] font-medium text-ink mb-1.5">
            Hesap Türü
          </span>
          <div className="grid grid-cols-2 p-1 rounded-xl bg-variant border border-hairline">
            {(
              [
                ['LANDLORD', 'Mülk Sahibi'],
                ['TENANT', 'Kiracı'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setUserType(value)}
                className={`py-2 rounded-md text-[13px] font-medium transition-colors cursor-pointer ${
                  userType === value
                    ? 'bg-paper text-ink shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="reg-name" className="block text-[12.5px] font-medium text-ink mb-1.5">
              Ad
            </label>
            <input
              id="reg-name"
              type="text"
              required
              placeholder="Adınız"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline text-[14px] text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="reg-surname" className="block text-[12.5px] font-medium text-ink mb-1.5">
              Soyad
            </label>
            <input
              id="reg-surname"
              type="text"
              required
              placeholder="Soyadınız"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline text-[14px] text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-[12.5px] font-medium text-ink mb-1.5">
            E-posta Adresi
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            required
            placeholder="ornek@eposta.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline text-[14px] text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label htmlFor="reg-phone" className="block text-[12.5px] font-medium text-ink mb-1.5">
            Telefon <span className="text-ink-subtle font-normal">(Opsiyonel)</span>
          </label>
          <input
            id="reg-phone"
            type="tel"
            placeholder="555 555 55 55"
            value={phone}
            onChange={(e) => setPhone(formatPhone10(e.target.value))}
            className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline font-mono text-[13.5px] text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="reg-pass" className="block text-[12.5px] font-medium text-ink mb-1.5">
              Şifre
            </label>
            <input
              id="reg-pass"
              type="password"
              autoComplete="new-password"
              required
              placeholder="En az 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline text-[14px] text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="reg-pass2" className="block text-[12.5px] font-medium text-ink mb-1.5">
              Şifre Tekrar
            </label>
            <input
              id="reg-pass2"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Tekrar girin"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline text-[14px] text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 mt-1 rounded-lg bg-accent text-white text-[14px] font-semibold hover:bg-accent-hover disabled:opacity-60 transition-colors cursor-pointer"
        >
          {isSubmitting ? 'Hesap oluşturuluyor...' : 'Hesap Oluştur →'}
        </button>
      </form>
    </AuthSplitLayout>
  );
}
