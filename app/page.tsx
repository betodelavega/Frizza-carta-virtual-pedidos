'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import styles from './styles/Menu.module.css';
import {
  defaultMenu,
  defaultSettings,
  formatPrice,
  readMenuItems,
  readSettings,
  sanitizeWhatsappNumber,
  writeMenuItems,
} from './lib/menuData';

console.log("");

type OrderForm = {
  flavorId: string;
  name: string;
  phone: string;
  trays: number;
  address: string;
  notes: string;
};

export default function Home() {
  const [menuItems, setMenuItems] = useState(defaultMenu);
  const [settings, setSettings] = useState(defaultSettings);
  const [form, setForm] = useState<OrderForm>({
    flavorId: '',
    name: '',
    phone: '',
    trays: 1,
    address: '',
    notes: '',
  });

  useEffect(() => {
    const storedMenu = readMenuItems();
    const storedSettings = readSettings();
    setMenuItems(storedMenu);
    setSettings(storedSettings);
    setForm((prev) => ({
      ...prev,
      flavorId: storedMenu[0]?.id ?? '',
    }));
  }, []);

  const selectedItem = useMemo(
    () => menuItems.find((item) => item.id === form.flavorId),
    [menuItems, form.flavorId]
  );

  const total = useMemo(() => {
    const unit = selectedItem ? Number(selectedItem.price) : 0;
    return Number.isFinite(form.trays) ? form.trays * unit : 0;
  }, [form.trays, selectedItem]);

  const isOutOfStock = Boolean(selectedItem && selectedItem.stock <= 0);
  const isStockInsufficient = Boolean(
    selectedItem &&
    Number.isFinite(form.trays) &&
    form.trays > selectedItem.stock
  );
  const isLowStock = Boolean(
    selectedItem &&
    selectedItem.stock > 0 &&
    selectedItem.stock <= settings.lowStockLimit
  );

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'trays' ? Number(value) : value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedItem || selectedItem.stock <= 0 || isStockInsufficient) {
      return;
    }
    const nextItems = menuItems.map((item) =>
      item.id === selectedItem.id
        ? { ...item, stock: Math.max(0, item.stock - form.trays) }
        : item
    );
    setMenuItems(nextItems);
    writeMenuItems(nextItems);
    const whatsapp = sanitizeWhatsappNumber(settings.whatsappNumber);
    const messageLines = [
      'Hola! Quiero hacer un pedido de sorrentinos:',
      `Nombre: ${form.name}`,
      `Telefono: ${form.phone}`,
      `Direccion: ${form.address}`,
      `Sabor: ${selectedItem ? selectedItem.name : ''}`,
      `Cantidad de bandejas: ${form.trays}`,
      `Total estimado: ${formatPrice(total, settings.currencySymbol)}`,
    ];

    if (form.notes.trim()) {
      messageLines.push(`Notas: ${form.notes}`);
    }

    const message = encodeURIComponent(messageLines.join('\n'));
    const url = `https://wa.me/${whatsapp}?text=${message}`;
    window.open(url, '_blank');
  };

  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden='true' />
      <div className={styles.backdropSecondary} aria-hidden='true' />
      <main className={styles.card}>
        <section>
          <header className={styles.header}>
            <h1 className={styles.brand}>{settings.brandName}</h1>
            <div className={styles.subtitle}>{settings.subtitle}</div>
          </header>
          <div className={styles.menuSection}>
            <h2 className={styles.sectionTitle}>La carta</h2>
            <div className={styles.menuList}>
              {menuItems.map((item) => (
                <article key={item.id} className={styles.menuItem}>
                  <div className={styles.menuLeft}>
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className={styles.menuMedia}
                      />
                    ) : (
                      <div className={styles.mediaPlaceholder} />
                    )}
                    <div>
                      <div className={styles.menuName}>{item.name}</div>
                      {item.tag ? (
                        <div className={styles.menuTag}>{item.tag}</div>
                      ) : null}
                      <span
                        className={`${styles.stockBadge} ${
                          item.stock <= 0
                            ? styles.stockEmpty
                            : item.stock <= settings.lowStockLimit
                              ? styles.stockLow
                              : ''
                        }`}>
                        {item.stock > 0 ? `Stock: ${item.stock}` : 'Sin stock'}
                      </span>
                    </div>
                  </div>
                  <div className={styles.menuPrice}>
                    {formatPrice(item.price, settings.currencySymbol)}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className={styles.orderSection}>
          <h2 className={styles.sectionTitle}>Arma tu pedido</h2>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div>
              <label className={styles.label} htmlFor='flavor'>
                Sabor
              </label>
              <select
                id='flavor'
                name='flavorId'
                className={styles.select}
                value={form.flavorId}
                onChange={handleChange}
                required>
                {menuItems.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                    disabled={item.stock <= 0}>
                    {item.name} -{' '}
                    {formatPrice(item.price, settings.currencySymbol)}
                    {item.stock <= 0 ? ' (Sin stock)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={styles.label} htmlFor='name'>
                Nombre
              </label>
              <input
                id='name'
                name='name'
                className={styles.input}
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className={styles.row}>
              <div>
                <label className={styles.label} htmlFor='phone'>
                  Telefono
                </label>
                <input
                  id='phone'
                  name='phone'
                  className={styles.input}
                  value={form.phone}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className={styles.label} htmlFor='trays'>
                  Cantidad de bandejas
                </label>
                <input
                  id='trays'
                  name='trays'
                  type='number'
                  min={1}
                  className={styles.input}
                  value={form.trays}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div>
              <label className={styles.label} htmlFor='address'>
                Direccion
              </label>
              <input
                id='address'
                name='address'
                className={styles.input}
                value={form.address}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className={styles.label} htmlFor='notes'>
                Notas y observaciones
              </label>
              <textarea
                id='notes'
                name='notes'
                className={styles.textarea}
                value={form.notes}
                onChange={handleChange}
                placeholder='Ej: sin nuez, timbre, horario'
              />
            </div>
            <div className={styles.total}>
              Total estimado: {formatPrice(total, settings.currencySymbol)}
            </div>
            <button
              className={styles.cta}
              type='submit'
              disabled={isOutOfStock || isStockInsufficient}>
              Enviar pedido por WhatsApp
            </button>
            <div className={styles.note}>
              Al enviar se abre WhatsApp con el mensaje listo.
            </div>
            {isOutOfStock ? (
              <div className={styles.noteDanger}>
                Este sabor no tiene stock por ahora.
              </div>
            ) : null}
            {isLowStock ? (
              <div className={styles.note}>
                Quedan pocas bandejas disponibles.
              </div>
            ) : null}
            {isStockInsufficient ? (
              <div className={styles.note}>
                Stock insuficiente para esa cantidad.
              </div>
            ) : null}
            <div className={styles.adminLink}>
              <a href='/admin'>Ir al panel de administracion</a>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
