export type MenuItem = {
  id: string;
  name: string;
  price: number;
  tag: string;
  imageUrl: string;
  stock: number;
};

export type Settings = {
  brandName: string;
  subtitle: string;
  whatsappNumber: string;
  adminPassword: string;
  currencySymbol: string;
  lowStockLimit: number;
};

export const MENU_KEY = "frizza_menu";
export const SETTINGS_KEY = "frizza_settings";

export const defaultMenu: MenuItem[] = [
  {
    id: "mozzarella-jamon",
    name: "Mozzarella y jamon",
    price: 6000,
    tag: "Porcion artesanal",
    imageUrl: "",
    stock: 10,
  },
];

export const defaultSettings: Settings = {
  brandName: "Frizza",
  subtitle: "Carta virtual de sorrentinos",
  whatsappNumber: "3804304711",
  adminPassword: "frizza123",
  currencySymbol: "$",
  lowStockLimit: 3,
};

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(value) as T;
    return parsed ?? fallback;
  } catch (error) {
    return fallback;
  }
};

export const readMenuItems = (): MenuItem[] => {
  if (typeof window === "undefined") {
    return defaultMenu;
  }
  const stored = localStorage.getItem(MENU_KEY);
  const parsed = safeParse<MenuItem[]>(stored, defaultMenu);
  return Array.isArray(parsed) ? parsed : defaultMenu;
};

export const writeMenuItems = (items: MenuItem[]): void => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(MENU_KEY, JSON.stringify(items));
};

export const readSettings = (): Settings => {
  if (typeof window === "undefined") {
    return defaultSettings;
  }
  const stored = localStorage.getItem(SETTINGS_KEY);
  const parsed = safeParse<Settings>(stored, defaultSettings);
  return parsed ?? defaultSettings;
};

export const writeSettings = (settings: Settings): void => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const formatPrice = (value: number, currencySymbol: string): string => {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${currencySymbol} ${safeValue.toLocaleString("es-AR")}`;
};

export const sanitizeWhatsappNumber = (value: string): string =>
  value.replace(/[^\d]/g, "");
