import { useMemo, useState, type FormEvent } from 'react';
import {
  ApiError,
  createTenantApi,
  updateTenantApi,
} from '../lib/api';
import {
  getContractEndDate,
  isWorkplaceTenant,
  stripDigits,
} from '../lib/formatters';
import type { Apartment, Property, Tenant } from '../types/api';

export interface TenantFormModalProps {
  mode: 'create' | 'edit' | 'renew';
  sourceTenant?: Tenant | null;
  initialPropertyId?: number | null;
  initialApartmentId?: number | null;
  initialNewRent?: number | null;
  properties: Property[];
  apartments: Apartment[];
  onClose: () => void;
  onSuccess: (message: string, focusTenantId?: number) => void;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function TenantFormModal({
  mode,
  sourceTenant,
  initialPropertyId,
  initialApartmentId,
  initialNewRent,
  properties,
  apartments,
  onClose,
  onSuccess,
}: TenantFormModalProps) {
  const isEditing = mode === 'edit' && Boolean(sourceTenant);
  const isRenewal = mode === 'renew' && Boolean(sourceTenant);

  const defaultStartDate = useMemo(() => {
    if (isRenewal && sourceTenant) {
      const end = getContractEndDate(sourceTenant.startDate, sourceTenant.contractDuration);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return toIsoDate(end > thirtyDaysAgo ? end : new Date());
    }
    if (isEditing && sourceTenant) {
      return sourceTenant.startDate.slice(0, 10);
    }
    return toIsoDate(new Date());
  }, [isEditing, isRenewal, sourceTenant]);

  const initialType: 1 | 2 = sourceTenant
    ? isWorkplaceTenant(sourceTenant.type)
      ? 2
      : 1
    : 1;

  const [type, setType] = useState<1 | 2>(initialType);
  const [propertyId, setPropertyId] = useState<number>(
    sourceTenant?.apartment?.property?.id ??
      initialPropertyId ??
      properties[0]?.id ??
      0,
  );
  const [apartmentId, setApartmentId] = useState<number>(
    sourceTenant?.apartment?.id ?? initialApartmentId ?? 0,
  );
  const [name, setName] = useState(sourceTenant?.name ?? '');
  const [surname, setSurname] = useState(sourceTenant?.surname ?? '');
  const [phone, setPhone] = useState(sourceTenant?.phone ?? '');
  const [rentAmount, setRentAmount] = useState<string>(
    initialNewRent
      ? String(Math.round(initialNewRent))
      : sourceTenant
        ? String(Math.round(sourceTenant.rentAmount))
        : '',
  );
  const [depositAmount, setDepositAmount] = useState<string>(
    sourceTenant ? String(Math.round(sourceTenant.depositAmount)) : '0',
  );
  const [contractDuration, setContractDuration] = useState<string>(
    sourceTenant ? String(sourceTenant.contractDuration) : '12',
  );
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [description, setDescription] = useState(sourceTenant?.description ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Eligible apartments in selected property (vacant + source tenant's own unit)
  const availableApartments = useMemo(() => {
    return apartments.filter((apt) => {
      if (apt.property?.id !== propertyId) return false;
      if (!apt.isOccupied) return true;
      if (sourceTenant?.apartment?.id === apt.id) return true;
      return false;
    });
  }, [apartments, propertyId, sourceTenant]);

  function handlePropertyChange(nextPropId: number) {
    setPropertyId(nextPropId);
    const firstMatch = apartments.find(
      (a) =>
        a.property?.id === nextPropId &&
        (!a.isOccupied || a.id === sourceTenant?.apartment?.id),
    );
    setApartmentId(firstMatch?.id ?? 0);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !surname.trim()) {
      setError('Lütfen kiracı ad ve soyadını girin.');
      return;
    }
    if (!propertyId || !apartmentId) {
      setError('Lütfen bir mülk ve boş daire seçin.');
      return;
    }
    const rent = Number(rentAmount);
    const deposit = Number(depositAmount) || 0;
    const duration = Number(contractDuration);
    if (!Number.isFinite(rent) || rent <= 0) {
      setError('Lütfen geçerli bir kira tutarı girin.');
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      setError('Lütfen geçerli bir sözleşme süresi (ay) girin.');
      return;
    }

    setIsSubmitting(true);
    const cleanPhone = stripDigits(phone);

    try {
      if (isRenewal && sourceTenant) {
        // 1. Archive old tenant first so the apartment becomes free (same flow as mobile)
        const originalType: 1 | 2 = isWorkplaceTenant(sourceTenant.type) ? 2 : 1;
        await updateTenantApi(sourceTenant.id, {
          isArchived: true,
          type: originalType,
        });

        try {
          const created = await createTenantApi({
            name: name.trim(),
            surname: surname.trim(),
            type,
            contractDuration: duration,
            phone: cleanPhone || undefined,
            rentAmount: rent,
            depositAmount: deposit,
            startDate,
            description: description.trim() || undefined,
            apartmentId,
          });
          onSuccess('Yeni sözleşme başarıyla oluşturuldu.', created.id);
          return;
        } catch (createErr) {
          // Rollback archive on creation failure
          await updateTenantApi(sourceTenant.id, {
            isArchived: false,
            type: originalType,
          }).catch(() => {});
          throw createErr;
        }
      }

      if (isEditing && sourceTenant) {
        await updateTenantApi(sourceTenant.id, {
          name: name.trim(),
          surname: surname.trim(),
          type,
          phone: cleanPhone,
          rentAmount: rent,
          depositAmount: deposit,
          startDate,
          description: description.trim(),
          apartmentId,
        });
        onSuccess('Kiracı bilgileri güncellendi.', sourceTenant.id);
      } else {
        const created = await createTenantApi({
          name: name.trim(),
          surname: surname.trim(),
          type,
          contractDuration: duration,
          phone: cleanPhone || undefined,
          rentAmount: rent,
          depositAmount: deposit,
          startDate,
          description: description.trim() || undefined,
          apartmentId,
        });
        onSuccess('Yeni kiracı başarıyla eklendi.', created.id);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'İşlem başarısız oldu.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = isEditing
    ? 'Kiracı Düzenle'
    : isRenewal
      ? 'Sözleşme Yenile'
      : 'Yeni Kiracı Ekle';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-paper border border-hairline rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-divider flex items-center justify-between sticky top-0 bg-paper z-10">
          <h2 className="text-[17px] font-bold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg border border-hairline text-[12px] text-ink-muted hover:text-ink cursor-pointer"
          >
            Kapat
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isRenewal && (
            <div className="p-3.5 rounded-xl bg-accent-soft border border-accent/25 text-[12.5px] text-ink">
              <div className="font-semibold text-accent">
                Aynı Mülk & Kiracı Bilgileri Hazır
              </div>
              <p className="text-ink-muted mt-1 leading-relaxed">
                Onayladığınızda eski sözleşme otomatik olarak Eski Kiracılar listesine
                taşınır ve aynı dairede yeni sözleşme açılır.
              </p>
            </div>
          )}

          {error && (
            <div className="px-4 py-3 rounded-xl bg-danger-soft border border-danger/30 text-[13px] text-danger">
              {error}
            </div>
          )}

          {/* Konut / İşyeri Toggle (Matches Mobile) */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-variant border border-hairline">
            {(
              [
                [1, 'Konut'],
                [2, 'İşyeri'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setType(val)}
                className={`py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                  type === val
                    ? 'bg-paper text-ink shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Property & Apartment Selectors */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-ink-muted mb-1.5">
                Mülk / Bina
              </label>
              <select
                value={propertyId}
                onChange={(e) => handlePropertyChange(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-canvas border border-hairline text-[13.5px] text-ink focus:outline-none focus:border-accent"
              >
                <option value={0}>Seçiniz...</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink-muted mb-1.5">
                Daire / Birim
              </label>
              <select
                value={apartmentId}
                onChange={(e) => setApartmentId(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-canvas border border-hairline text-[13.5px] text-ink focus:outline-none focus:border-accent"
              >
                <option value={0}>
                  {availableApartments.length === 0 ? 'Boş daire yok' : 'Seçiniz...'}
                </option>
                {availableApartments.map((a) => (
                  <option key={a.id} value={a.id}>
                    No: {a.doorNumber || a.id}
                    {a.floor ? ` (Kat ${a.floor})` : ''}
                    {a.roomCount ? ` · ${a.roomCount}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Name & Surname */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-ink-muted mb-1.5">
                Ad
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Kiracı adı"
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline text-[14px] text-ink focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink-muted mb-1.5">
                Soyad
              </label>
              <input
                type="text"
                required
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="Kiracı soyadı"
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline text-[14px] text-ink focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-muted mb-1.5">
              Telefon
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XX XXX XX XX"
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline font-mono text-[13.5px] text-ink focus:outline-none focus:border-accent"
            />
          </div>

          {/* Contract Financials */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-ink-muted mb-1.5">
                Aylık Kira (₺)
              </label>
              <input
                type="number"
                min={1}
                required
                value={rentAmount}
                onChange={(e) => setRentAmount(e.target.value)}
                placeholder="15000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline font-mono text-[14px] text-ink focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink-muted mb-1.5">
                Depozito (₺)
              </label>
              <input
                type="number"
                min={0}
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline font-mono text-[14px] text-ink focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-ink-muted mb-1.5">
                Sözleşme Süresi (Ay)
              </label>
              <input
                type="number"
                min={1}
                max={120}
                disabled={isEditing}
                value={contractDuration}
                onChange={(e) => setContractDuration(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline font-mono text-[14px] text-ink disabled:opacity-60 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink-muted mb-1.5">
                Başlangıç Tarihi
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline font-mono text-[13.5px] text-ink focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-muted mb-1.5">
              Açıklama (Opsiyonel)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="İsteğe bağlı not..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline text-[13.5px] text-ink focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-hairline text-[13.5px] font-medium text-ink-muted hover:text-ink cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-accent text-white text-[13.5px] font-semibold hover:bg-accent-hover disabled:opacity-60 transition-colors cursor-pointer"
            >
              {isSubmitting
                ? 'Kaydediliyor...'
                : isRenewal
                  ? 'Sözleşmeyi Yenile'
                  : isEditing
                    ? 'Güncelle'
                    : 'Kiracıyı Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
