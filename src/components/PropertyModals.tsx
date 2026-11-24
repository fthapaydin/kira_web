import { useState, type FormEvent } from 'react';
import {
  ApiError,
  createApartmentApi,
  createPropertyApi,
  updatePropertyApi,
} from '../lib/api';
import type { Property } from '../types/api';

export function PropertyFormModal({
  editingProperty,
  onClose,
  onSuccess,
}: {
  editingProperty?: Property | null;
  onClose: () => void;
  onSuccess: (message: string, selectPropertyId?: number) => void;
}) {
  const [name, setName] = useState(editingProperty?.name ?? '');
  const [address, setAddress] = useState(editingProperty?.address ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Lütfen mülk / bina adını girin.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingProperty) {
        await updatePropertyApi(editingProperty.id, {
          name: name.trim(),
          address: address.trim(),
        });
        onSuccess('Mülk güncellendi.', editingProperty.id);
      } else {
        const created = await createPropertyApi({
          name: name.trim(),
          address: address.trim(),
        });
        onSuccess('Yeni mülk eklendi.', created.id);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Mülk kaydedilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-paper border border-hairline rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-divider flex items-center justify-between">
          <h2 className="text-[16.5px] font-bold text-ink">
            {editingProperty ? 'Mülk Düzenle' : 'Yeni Mülk / Bina Ekle'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg border border-hairline text-[12px] text-ink-muted hover:text-ink cursor-pointer"
          >
            Kapat
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-danger-soft border border-danger/30 text-[13px] text-danger">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-medium text-ink-muted mb-1.5">
              Mülk / Bina Adı
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Güneş Apartmanı"
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline text-[14px] text-ink focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-muted mb-1.5">
              Adres (Opsiyonel)
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Mahalle, sokak, ilçe..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline text-[13.5px] text-ink focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-hairline text-[13px] font-medium text-ink-muted hover:text-ink cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? 'Kaydediliyor...' : editingProperty ? 'Güncelle' : 'Mülkü Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ApartmentFormModal({
  property,
  onClose,
  onSuccess,
}: {
  property: Property;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [doorNumber, setDoorNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [roomCount, setRoomCount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!doorNumber.trim()) {
      setError('Lütfen kapı / daire numarasını girin.');
      return;
    }
    setIsSubmitting(true);
    try {
      await createApartmentApi({
        propertyId: property.id,
        doorNumber: doorNumber.trim(),
        floor: floor.trim() || undefined,
        roomCount: roomCount.trim() || undefined,
      });
      onSuccess('Daire / dükkan eklendi.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Daire eklenemedi.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-paper border border-hairline rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-divider flex items-center justify-between">
          <div>
            <h2 className="text-[16.5px] font-bold text-ink">Daire / Dükkan Ekle</h2>
            <p className="text-[12px] text-ink-muted">{property.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg border border-hairline text-[12px] text-ink-muted hover:text-ink cursor-pointer"
          >
            Kapat
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-danger-soft border border-danger/30 text-[13px] text-danger">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-ink-muted mb-1.5">
                Kapı / Daire No
              </label>
              <input
                type="text"
                required
                value={doorNumber}
                onChange={(e) => setDoorNumber(e.target.value)}
                placeholder="Örn: 4"
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline text-[14px] text-ink focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink-muted mb-1.5">
                Kat (Opsiyonel)
              </label>
              <input
                type="text"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="Örn: 2. Kat"
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline text-[14px] text-ink focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-muted mb-1.5">
              Oda / Tip (Opsiyonel)
            </label>
            <input
              type="text"
              value={roomCount}
              onChange={(e) => setRoomCount(e.target.value)}
              placeholder="Örn: 2+1 veya Dükkan 40 m²"
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline text-[14px] text-ink focus:outline-none focus:border-accent"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-hairline text-[13px] font-medium text-ink-muted hover:text-ink cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? 'Ekleniyor...' : 'Daireyi Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
