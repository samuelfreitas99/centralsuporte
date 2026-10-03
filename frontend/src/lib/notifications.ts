/**
 * Notificações do navegador e PWA.
 *
 * Navegadores só liberam service worker e notificações em contexto seguro (HTTPS ou localhost).
 * Em HTTP comum na rede interna, `notificationsSupported()` retorna false e o sino continua
 * funcionando normalmente, só sem o aviso do sistema operacional.
 */
const NOTIFIED_KEY = 'central.notified';

export const notificationsSupported = () =>
  typeof window !== 'undefined' && window.isSecureContext && 'Notification' in window;

export const notificationPermission = (): NotificationPermission | 'unsupported' =>
  notificationsSupported() ? Notification.permission : 'unsupported';

export const requestNotificationPermission = async () =>
  notificationsSupported() ? Notification.requestPermission() : ('denied' as NotificationPermission);

/** Registra o service worker (só no build de produção e em contexto seguro). */
export const registerServiceWorker = () => {
  if (!import.meta.env.PROD || !window.isSecureContext || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service worker não registrado:', err));
  });
};

/** Mostra uma notificação do sistema; `url` é aberta ao clicar (ex.: "/#tasks?id=3"). */
export const showNotification = async (title: string, body: string, url = '/#dashboard', tag?: string) => {
  if (notificationPermission() !== 'granted') return;
  const options: NotificationOptions = { body, icon: '/icon-192.png', badge: '/icon-192.png', tag, data: { url } };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) {
      await reg.showNotification(title, options);
      return;
    }
  } catch {
    // cai para a API simples abaixo
  }
  const n = new Notification(title, options);
  n.onclick = () => {
    window.focus();
    window.location.hash = url.replace(/^\/?#/, '');
    n.close();
  };
};

const readNotified = (): number[] => {
  try {
    return JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]');
  } catch {
    return [];
  }
};

/** Devolve só os ids ainda não avisados e os marca como avisados (guarda os últimos 300). */
export const takeUnnotified = (ids: number[]): number[] => {
  const seen = new Set(readNotified());
  const fresh = ids.filter((id) => !seen.has(id));
  if (fresh.length) {
    try {
      localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...seen, ...fresh].slice(-300)));
    } catch {
      // armazenamento indisponível: no pior caso avisa de novo
    }
  }
  return fresh;
};
