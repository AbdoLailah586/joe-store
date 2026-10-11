let pendingLoad: Promise<any> | null = null;

// Listen for the library to finish loading instead of guessing with a fixed delay.
export function loadGoogleIdentity(win: Window = window, doc: Document = document, timeoutMs = 20000): Promise<any> {
  if (win.google?.accounts?.id) return Promise.resolve(win.google.accounts.id);
  if (pendingLoad) return pendingLoad;

  const load = new Promise((resolve, reject) => {
    const script = doc.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    let settled = false;
    let timeout: ReturnType<typeof setTimeout>;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      script.onload = null;
      script.onerror = null;
      if (error) {
        script.remove();
        reject(error);
      } else {
        resolve(win.google.accounts.id);
      }
    };
    script.onload = () => finish(win.google?.accounts?.id ? undefined : new Error('خدمة Google غير متاحة الآن. أعيدي المحاولة.'));
    script.onerror = () => finish(new Error('تعذّر تحميل تسجيل Google. تحققي من الاتصال وأعيدي المحاولة.'));
    timeout = setTimeout(() => finish(new Error('استغرق تحميل Google وقتًا طويلًا. أعيدي المحاولة.')), timeoutMs);
    doc.head.appendChild(script);
  });
  pendingLoad = load.finally(() => { pendingLoad = null; });
  return pendingLoad;
}
