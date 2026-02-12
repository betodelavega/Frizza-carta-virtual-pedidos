"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import styles from "../styles/Admin.module.css";
import {
  defaultMenu,
  defaultSettings,
  formatPrice,
  type MenuItem,
  readMenuItems,
  readSettings,
  sanitizeWhatsappNumber,
  writeMenuItems,
  writeSettings,
} from "../lib/menuData";

type ItemForm = {
  name: string;
  price: string;
  tag: string;
  imageUrl: string;
  stock: string;
};

type SettingsForm = {
  brandName: string;
  subtitle: string;
  whatsappNumber: string;
  adminPassword: string;
  currencySymbol: string;
  lowStockLimit: string;
};

type ItemErrors = {
  name?: string;
  price?: string;
  stock?: string;
};

type SettingsErrors = {
  brandName?: string;
  whatsappNumber?: string;
  adminPassword?: string;
  currencySymbol?: string;
  lowStockLimit?: string;
};

const sessionKey = "frizza_admin_auth";

export default function AdminPage() {
  const [menuItems, setMenuItems] = useState(defaultMenu);
  const [settings, setSettings] = useState(defaultSettings);
  const [itemForm, setItemForm] = useState<ItemForm>({
    name: "",
    price: "",
    tag: "",
    imageUrl: "",
    stock: "",
  });
  const [settingsForm, setSettingsForm] = useState<SettingsForm>({
    brandName: defaultSettings.brandName,
    subtitle: defaultSettings.subtitle,
    whatsappNumber: defaultSettings.whatsappNumber,
    adminPassword: defaultSettings.adminPassword,
    currencySymbol: defaultSettings.currencySymbol,
    lowStockLimit: String(defaultSettings.lowStockLimit),
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [itemErrors, setItemErrors] = useState<ItemErrors>({});
  const [settingsErrors, setSettingsErrors] = useState<SettingsErrors>({});
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  useEffect(() => {
    const storedMenu = readMenuItems();
    const storedSettings = readSettings();
    setMenuItems(storedMenu);
    setSettings(storedSettings);
    setSettingsForm({
      brandName: storedSettings.brandName,
      subtitle: storedSettings.subtitle,
      whatsappNumber: storedSettings.whatsappNumber,
      adminPassword: storedSettings.adminPassword,
      currencySymbol: storedSettings.currencySymbol,
      lowStockLimit: String(storedSettings.lowStockLimit ?? defaultSettings.lowStockLimit),
    });
    if (typeof window !== "undefined") {
      setIsAuthed(sessionStorage.getItem(sessionKey) === "true");
    }
  }, []);

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passwordInput === settings.adminPassword) {
      setIsAuthed(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(sessionKey, "true");
      }
    }
  };

  const handleLogout = () => {
    setIsAuthed(false);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(sessionKey);
    }
  };

  const handleItemChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setItemForm((prev) => ({ ...prev, [name]: value }));
    if (name === "name" || name === "price" || name === "stock") {
      setItemErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSettingsChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setSettingsForm((prev) => ({ ...prev, [name]: value }));
    if (name in settingsErrors) {
      setSettingsErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const resetItemForm = () => {
    setItemForm({ name: "", price: "", tag: "", imageUrl: "", stock: "" });
    setEditingId(null);
    setItemErrors({});
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setItemForm((prev) => ({ ...prev, imageUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const priceValue = Number(itemForm.price);
    const stockValue = Number(itemForm.stock);
    const nextErrors: ItemErrors = {};

    if (!itemForm.name.trim()) {
      nextErrors.name = "El sabor es obligatorio.";
    }

    if (!itemForm.price.trim()) {
      nextErrors.price = "El precio es obligatorio.";
    } else if (!Number.isFinite(priceValue) || priceValue <= 0) {
      nextErrors.price = "El precio debe ser mayor a 0.";
    }

    if (!itemForm.stock.trim()) {
      nextErrors.stock = "El stock es obligatorio.";
    } else if (!Number.isFinite(stockValue) || stockValue < 0) {
      nextErrors.stock = "El stock debe ser 0 o mayor.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setItemErrors(nextErrors);
      return;
    }

    setItemErrors({});

    const nextItems = [...menuItems];

    if (editingId) {
      const index = nextItems.findIndex((item) => item.id === editingId);
      if (index !== -1) {
        nextItems[index] = {
          ...nextItems[index],
          name: itemForm.name.trim(),
          price: priceValue,
          tag: itemForm.tag.trim(),
          imageUrl: itemForm.imageUrl.trim(),
          stock: Math.max(0, Math.floor(stockValue)),
        };
      }
    } else {
      const slug = itemForm.name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");
      nextItems.push({
        id: `${slug}-${Date.now()}`,
        name: itemForm.name.trim(),
        price: priceValue,
        tag: itemForm.tag.trim(),
        imageUrl: itemForm.imageUrl.trim(),
        stock: Math.max(0, Math.floor(stockValue)),
      });
    }

    setMenuItems(nextItems);
    writeMenuItems(nextItems);
    resetItemForm();
  };

  const handleEditItem = (id: string) => {
    const found = menuItems.find((item) => item.id === id);
    if (!found) {
      return;
    }
    setEditingId(found.id);
    setItemForm({
      name: found.name,
      price: String(found.price),
      tag: found.tag,
      imageUrl: found.imageUrl,
      stock: String(found.stock ?? 0),
    });
  };

  const handleDeleteItem = (id: string) => {
    const target = menuItems.find((item) => item.id === id);
    const label = target ? `"${target.name}"` : "este sabor";
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`¿Seguro que queres borrar ${label}?`);
      if (!confirmed) {
        return;
      }
    }
    const nextItems = menuItems.filter((item) => item.id !== id);
    setMenuItems(nextItems);
    writeMenuItems(nextItems);
  };

  const normalizeMenuItems = (items: MenuItem[]): MenuItem[] =>
    items
      .map((item, index) => {
        const name = String(item.name ?? "").trim();
        const price = Number(item.price ?? 0);
        const tag = String(item.tag ?? "").trim();
        const imageUrl = String(item.imageUrl ?? "").trim();
        const stock = Number(item.stock ?? 0);
        const slug = name.toLowerCase().replace(/\s+/g, "-") || `sabor-${index}`;
        return {
          id: String(item.id ?? "").trim() || `${slug}-${Date.now()}-${index}`,
          name,
          price: Number.isFinite(price) ? price : 0,
          tag,
          imageUrl,
          stock: Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0,
        };
      })
      .filter((item) => item.name.length > 0);

  const handleExport = () => {
    const payload = {
      menu: menuItems,
      settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "frizza-carta.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      try {
        const parsed = JSON.parse(text);
        let nextMenu = menuItems;
        let nextSettings = settings;

        if (Array.isArray(parsed)) {
          nextMenu = normalizeMenuItems(parsed);
        } else if (parsed && typeof parsed === "object") {
          if (Array.isArray(parsed.menu)) {
            nextMenu = normalizeMenuItems(parsed.menu);
          }
          if (parsed.settings && typeof parsed.settings === "object") {
            nextSettings = {
              ...defaultSettings,
              ...parsed.settings,
            };
          }
        }

        setMenuItems(nextMenu);
        setSettings(nextSettings);
        setSettingsForm({
          brandName: nextSettings.brandName,
          subtitle: nextSettings.subtitle,
          whatsappNumber: nextSettings.whatsappNumber,
          adminPassword: nextSettings.adminPassword,
          currencySymbol: nextSettings.currencySymbol,
          lowStockLimit: String(nextSettings.lowStockLimit ?? defaultSettings.lowStockLimit),
        });
        writeMenuItems(nextMenu);
        writeSettings(nextSettings);
      } catch (error) {
        // Ignore invalid JSON
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleSaveSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: SettingsErrors = {};
    const lowStockValue = Number(settingsForm.lowStockLimit);

    if (!settingsForm.brandName.trim()) {
      nextErrors.brandName = "El nombre del negocio es obligatorio.";
    }

    if (!settingsForm.whatsappNumber.trim()) {
      nextErrors.whatsappNumber = "El numero de WhatsApp es obligatorio.";
    }

    if (!settingsForm.adminPassword.trim()) {
      nextErrors.adminPassword = "La clave de admin es obligatoria.";
    }

    if (!settingsForm.currencySymbol.trim()) {
      nextErrors.currencySymbol = "El simbolo de moneda es obligatorio.";
    }

    if (!settingsForm.lowStockLimit.trim()) {
      nextErrors.lowStockLimit = "El limite de stock bajo es obligatorio.";
    } else if (!Number.isFinite(lowStockValue) || lowStockValue < 0) {
      nextErrors.lowStockLimit = "El limite debe ser 0 o mayor.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setSettingsErrors(nextErrors);
      return;
    }

    setSettingsErrors({});
    const sanitizedNumber = sanitizeWhatsappNumber(settingsForm.whatsappNumber);
    const nextSettings = {
      brandName: settingsForm.brandName.trim() || defaultSettings.brandName,
      subtitle: settingsForm.subtitle.trim() || defaultSettings.subtitle,
      whatsappNumber: sanitizedNumber || defaultSettings.whatsappNumber,
      adminPassword: settingsForm.adminPassword.trim() || "frizza123",
      currencySymbol: settingsForm.currencySymbol.trim() || "$",
      lowStockLimit: Number.isFinite(lowStockValue)
        ? Math.max(0, Math.floor(lowStockValue))
        : defaultSettings.lowStockLimit,
    };
    setSettings(nextSettings);
    writeSettings(nextSettings);
    setSettingsForm({
      brandName: nextSettings.brandName,
      subtitle: nextSettings.subtitle,
      whatsappNumber: nextSettings.whatsappNumber,
      adminPassword: nextSettings.adminPassword,
      currencySymbol: nextSettings.currencySymbol,
      lowStockLimit: String(nextSettings.lowStockLimit),
    });
  };

  if (!isAuthed) {
    return (
      <div className={styles.page}>
        <div className={styles.loginCard}>
          <h1 className={styles.loginTitle}>Panel de administracion</h1>
          <p className={styles.note}>Ingresa la clave para continuar.</p>
          <form className={styles.form} onSubmit={handleLogin}>
            <div>
              <label className={styles.label} htmlFor="adminPassword">
                Clave
              </label>
              <div className={styles.passwordField}>
                <input
                  id="adminPassword"
                  type={showLoginPassword ? "text" : "password"}
                  name="adminPassword"
                  className={styles.input}
                  value={passwordInput}
                  onChange={(event) => setPasswordInput(event.target.value)}
                  required
                />
                <button
                  className={styles.eyeButton}
                  type="button"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                >
                  {showLoginPassword ? "Ocultar" : "Ver"}
                </button>
              </div>
            </div>
            <button className={styles.cta} type="submit">
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.panel}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Administracion</h1>
            <p className={styles.subtitle}>
              Configura la carta, los precios y WhatsApp.
            </p>
          </div>
          <button className={`${styles.cta} ${styles.ghost}`} onClick={handleLogout}>
            Salir
          </button>
        </header>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Configuracion general</h2>
          <form className={styles.form} onSubmit={handleSaveSettings}>
            <div className={styles.row}>
              <div>
                <label className={styles.label} htmlFor="brandName">
                  Nombre del negocio
                </label>
                <input
                  id="brandName"
                  name="brandName"
                  className={styles.input}
                  value={settingsForm.brandName}
                  onChange={handleSettingsChange}
                />
                {settingsErrors.brandName ? (
                  <p className={styles.errorText}>{settingsErrors.brandName}</p>
                ) : null}
              </div>
              <div>
                <label className={styles.label} htmlFor="subtitle">
                  Subtitulo
                </label>
                <input
                  id="subtitle"
                  name="subtitle"
                  className={styles.input}
                  value={settingsForm.subtitle}
                  onChange={handleSettingsChange}
                />
              </div>
            </div>
            <div className={styles.row}>
              <div>
                <label className={styles.label} htmlFor="whatsappNumber">
                  Numero de WhatsApp
                </label>
                <input
                  id="whatsappNumber"
                  name="whatsappNumber"
                  className={styles.input}
                  value={settingsForm.whatsappNumber}
                  onChange={handleSettingsChange}
                />
                <p className={styles.note}>
                  Usa codigo de pais si corresponde (ej: 549...)
                </p>
                {settingsErrors.whatsappNumber ? (
                  <p className={styles.errorText}>{settingsErrors.whatsappNumber}</p>
                ) : null}
              </div>
              <div>
                <label className={styles.label} htmlFor="currencySymbol">
                  Simbolo de moneda
                </label>
                <input
                  id="currencySymbol"
                  name="currencySymbol"
                  className={styles.input}
                  value={settingsForm.currencySymbol}
                  onChange={handleSettingsChange}
                />
                {settingsErrors.currencySymbol ? (
                  <p className={styles.errorText}>{settingsErrors.currencySymbol}</p>
                ) : null}
              </div>
            </div>
            <div className={styles.row}>
              <div>
                <label className={styles.label} htmlFor="adminPasswordValue">
                  Clave de admin
                </label>
                <div className={styles.passwordField}>
                  <input
                    id="adminPasswordValue"
                    name="adminPassword"
                    type={showAdminPassword ? "text" : "password"}
                    className={styles.input}
                    value={settingsForm.adminPassword}
                    onChange={handleSettingsChange}
                  />
                  <button
                    className={styles.eyeButton}
                    type="button"
                    onClick={() => setShowAdminPassword((prev) => !prev)}
                  >
                    {showAdminPassword ? "Ocultar" : "Ver"}
                  </button>
                </div>
                {settingsErrors.adminPassword ? (
                  <p className={styles.errorText}>{settingsErrors.adminPassword}</p>
                ) : null}
              </div>
            </div>
            <div className={styles.row}>
              <div>
                <label className={styles.label} htmlFor="lowStockLimit">
                  Limite de stock bajo
                </label>
                <input
                  id="lowStockLimit"
                  name="lowStockLimit"
                  type="number"
                  min={0}
                  className={styles.input}
                  value={settingsForm.lowStockLimit}
                  onChange={handleSettingsChange}
                />
                <p className={styles.note}>
                  Se considera bajo cuando el stock es menor o igual a este limite.
                </p>
                {settingsErrors.lowStockLimit ? (
                  <p className={styles.errorText}>{settingsErrors.lowStockLimit}</p>
                ) : null}
              </div>
            </div>
            <div className={styles.actions}>
              <button className={styles.cta} type="submit">
                Guardar configuracion
              </button>
              <button
                className={`${styles.cta} ${styles.ghost}`}
                type="button"
                onClick={handleExport}
              >
                Exportar carta (JSON)
              </button>
              <button
                className={`${styles.cta} ${styles.ghost}`}
                type="button"
                onClick={handleImportClick}
              >
                Importar carta (JSON)
              </button>
              <input
                ref={importInputRef}
                className={styles.hiddenInput}
                type="file"
                accept="application/json"
                onChange={handleImportFile}
              />
            </div>
          </form>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Sabores y precios</h2>
          <form className={styles.form} onSubmit={handleSaveItem}>
            <div className={styles.row}>
              <div>
                <label className={styles.label} htmlFor="name">
                  Sabor
                </label>
                <input
                  id="name"
                  name="name"
                  className={styles.input}
                  value={itemForm.name}
                  onChange={handleItemChange}
                  required
                />
                {itemErrors.name ? (
                  <p className={styles.errorText}>{itemErrors.name}</p>
                ) : null}
              </div>
              <div>
                <label className={styles.label} htmlFor="price">
                  Precio
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  className={styles.input}
                  value={itemForm.price}
                  onChange={handleItemChange}
                  required
                />
                {itemErrors.price ? (
                  <p className={styles.errorText}>{itemErrors.price}</p>
                ) : null}
              </div>
            </div>
            <div className={styles.row}>
              <div>
                <label className={styles.label} htmlFor="stock">
                  Stock disponible
                </label>
                <input
                  id="stock"
                  name="stock"
                  type="number"
                  min={0}
                  className={styles.input}
                  value={itemForm.stock}
                  onChange={handleItemChange}
                  required
                />
                {itemErrors.stock ? (
                  <p className={styles.errorText}>{itemErrors.stock}</p>
                ) : null}
              </div>
            </div>
            <div className={styles.row}>
              <div>
                <label className={styles.label} htmlFor="tag">
                  Etiqueta
                </label>
                <input
                  id="tag"
                  name="tag"
                  className={styles.input}
                  value={itemForm.tag}
                  onChange={handleItemChange}
                />
              </div>
              <div>
                <label className={styles.label} htmlFor="imageUrl">
                  Imagen (URL)
                </label>
                <input
                  id="imageUrl"
                  name="imageUrl"
                  className={styles.input}
                  value={itemForm.imageUrl}
                  onChange={handleItemChange}
                />
              </div>
            </div>
            <div className={styles.row}>
              <div>
                <label className={styles.label} htmlFor="imageFile">
                  Subir imagen
                </label>
                <input
                  id="imageFile"
                  name="imageFile"
                  type="file"
                  accept="image/*"
                  className={styles.input}
                  onChange={handleImageUpload}
                />
                <p className={styles.note}>
                  La imagen se guarda en este navegador.
                </p>
              </div>
              <div>
                <label className={styles.label}>Preview</label>
                {itemForm.imageUrl ? (
                  <img
                    src={itemForm.imageUrl}
                    alt="Preview"
                    className={styles.preview}
                  />
                ) : (
                  <p className={styles.note}>Sin imagen.</p>
                )}
              </div>
            </div>
            <div className={styles.actions}>
              <button className={styles.cta} type="submit">
                {editingId ? "Actualizar sabor" : "Agregar sabor"}
              </button>
              <button
                className={`${styles.cta} ${styles.ghost}`}
                type="button"
                onClick={resetItemForm}
              >
                Limpiar
              </button>
              {itemForm.imageUrl ? (
                <button
                  className={`${styles.cta} ${styles.ghost}`}
                  type="button"
                  onClick={() => setItemForm((prev) => ({ ...prev, imageUrl: "" }))}
                >
                  Quitar imagen
                </button>
              ) : null}
            </div>
          </form>

          <div className={styles.list}>
            {menuItems.map((item) => (
              <div key={item.id} className={styles.listItem}>
                <div className={styles.listInfo}>
                  <strong>{item.name}</strong>
                  <div className={styles.listMeta}>
                    {formatPrice(item.price, settings.currencySymbol)}
                    {item.tag ? ` • ${item.tag}` : ""}
                    {` • Stock: ${item.stock ?? 0}`}
                    {item.stock > 0 && item.stock <= settings.lowStockLimit ? (
                      <span className={styles.stockLow}>Stock bajo</span>
                    ) : null}
                    {item.stock <= 0 ? (
                      <span className={styles.stockEmpty}>Sin stock</span>
                    ) : null}
                  </div>
                </div>
                <div className={styles.actions}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className={styles.preview} />
                  ) : null}
                  <button
                    className={`${styles.cta} ${styles.ghost}`}
                    type="button"
                    onClick={() => handleEditItem(item.id)}
                  >
                    Editar
                  </button>
                  <button
                    className={`${styles.cta} ${styles.ghost}`}
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Estado actual</h2>
          <p className={styles.note}>
            Datos guardados en este navegador. Cambios visibles al instante en la carta.
          </p>
        </section>
      </main>
    </div>
  );
}
