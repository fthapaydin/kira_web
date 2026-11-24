import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthSplitLayout } from '../components/AuthSplitLayout';
import { ApiError, forgotPasswordApi, resetPasswordApi } from '../lib/api';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim() || !email.includes('@')) {
      setError('Lütfen kayıtlı e-posta adresinizi girin.');
      return;
    }
    setIsSubmitting(true);
    try {
      await forgotPasswordApi(email.trim());
      setStep('reset');
      setInfo('E-posta adresinize doğrulama kodu gönderildi.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kod gönderilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim()) {
      setError('Lütfen e-postadaki doğrulama kodunu girin.');
      return;
    }
    if (password.length < 6) {
      setError('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    setIsSubmitting(true);
    try {
      await resetPasswordApi({
        verificationCode: code.trim(),
        password,
        passwordConfirmation: passwordConfirm,
      });
      navigate('/giris', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Şifre güncellenemedi.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthSplitLayout
      eyebrow="Şifre Yenileme"
      title={step === 'request' ? 'Şifrenizi sıfırlayın' : 'Yeni şifre belirleyin'}
      subtitle={
        step === 'request'
          ? 'Kayıtlı e-posta adresinizi girin, doğrulama kodunu hemen gönderelim.'
          : 'E-postanıza gelen kodu ve yeni şifrenizi aşağıya girin.'
      }
      footer={
        <p className="text-[13.5px] text-ink-muted">
          Şifrenizi hatırladınız mı?{' '}
          <Link
            to="/giris"
            className="font-semibold text-accent hover:text-accent-hover transition-colors"
          >
            Giriş sayfasına dön →
          </Link>
        </p>
      }
    >
      {error && (
        <div
          role="alert"
          className="mb-4 px-4 py-3 rounded-lg border border-danger/30 bg-danger-soft/70 text-[13px] text-danger"
        >
          {error}
        </div>
      )}
      {info && (
        <div className="mb-4 px-4 py-3 rounded-lg border border-paid/30 bg-paid-soft/70 text-[13px] text-paid">
          {info}
        </div>
      )}

      {step === 'request' ? (
        <form onSubmit={handleRequest} className="space-y-5" noValidate>
          <div>
            <label htmlFor="fp-email" className="block text-[12.5px] font-medium text-ink mb-1.5">
              E-posta Adresi
            </label>
            <input
              id="fp-email"
              type="email"
              required
              placeholder="ornek@eposta.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline text-[14px] text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-lg bg-accent text-white text-[14px] font-semibold hover:bg-accent-hover disabled:opacity-60 transition-colors cursor-pointer"
          >
            {isSubmitting ? 'Gönderiliyor...' : 'Doğrulama Kodu Gönder →'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-4" noValidate>
          <div>
            <label htmlFor="fp-code" className="block text-[12.5px] font-medium text-ink mb-1.5">
              Doğrulama Kodu
            </label>
            <input
              id="fp-code"
              type="text"
              required
              placeholder="E-postadaki kod"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline font-mono text-[14px] text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="fp-pass" className="block text-[12.5px] font-medium text-ink mb-1.5">
              Yeni Şifre
            </label>
            <input
              id="fp-pass"
              type="password"
              required
              placeholder="En az 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline text-[14px] text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="fp-pass2" className="block text-[12.5px] font-medium text-ink mb-1.5">
              Yeni Şifre Tekrar
            </label>
            <input
              id="fp-pass2"
              type="password"
              required
              placeholder="Tekrar girin"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline text-[14px] text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-lg bg-accent text-white text-[14px] font-semibold hover:bg-accent-hover disabled:opacity-60 transition-colors cursor-pointer"
          >
            {isSubmitting ? 'Güncelleniyor...' : 'Şifreyi Güncelle →'}
          </button>
        </form>
      )}
    </AuthSplitLayout>
  );
}
