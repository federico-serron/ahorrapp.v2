import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Avisos del ciclo de vida del service worker (PWA).
 *
 * - offlineReady: el shell ya quedó precacheado, la app abre sin conexión.
 * - needRefresh: hay un build nuevo esperando; sin un aviso el usuario podría
 *   quedarse con la versión vieja indefinidamente.
 *
 * Se monta una sola vez en Layout.jsx y no renderiza nada propio: reutiliza el
 * <Toaster /> de react-hot-toast que ya existe en el proyecto.
 */
function PwaUpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!offlineReady) return;
    toast.success('La app ya funciona sin conexión.');
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (!needRefresh) return;
    toast(
      (t) => (
        <span className="flex items-center gap-3">
          Hay una versión nueva disponible.
          <button
            type="button"
            onClick={() => {
              toast.dismiss(t.id);
              setNeedRefresh(false);
              updateServiceWorker(true);
            }}
            className="rounded-lg bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
          >
            Actualizar
          </button>
        </span>
      ),
      { duration: Infinity },
    );
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}

export default PwaUpdatePrompt;
