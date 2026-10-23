import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
type BackHandler = () => boolean; // return true if handled
let backHandler: BackHandler = () => false;
export const setBackHandler = (h: BackHandler) => (backHandler = h);

/** Light haptic tap; heavier patterns for goals and full time. */
export async function haptic(kind: 'tap' | 'goal' | 'whistle' = 'tap') {
  if (!isNative) return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    if (kind === 'tap') await Haptics.impact({ style: ImpactStyle.Light });
    else if (kind === 'goal') await Haptics.notification({ type: NotificationType.Success });
    else await Haptics.vibrate({ duration: 300 });
  } catch { /* ignore */ }
}

export async function keepAwake(on: boolean) {
  if (!isNative) return;
  try {
    const { KeepAwake } = await import('@capacitor-community/keep-awake');
    await (on ? KeepAwake.keepAwake() : KeepAwake.allowSleep());
  } catch { /* ignore */ }
}

export async function initNative() {
  if (!isNative) return;
  document.documentElement.classList.add('native');
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: '#101c20' });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch { /* ignore */ }
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', () => {
      // close any open sheet/dialog first
      const sheet = document.querySelector('.pp-modal') ?? document.querySelector('.lu-sheet, [role="dialog"]');
      if (sheet) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        const close = sheet.querySelector<HTMLElement>('[aria-label="Close"], .close, .lu-close');
        if (close) { close.click(); return; }
      }
      if (backHandler()) return;
      if (window.confirm('Exit Touchline?')) App.exitApp();
    });
  } catch { /* ignore */ }
  // haptic on any button press
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('click', (e) => {
    if ((e.target as HTMLElement)?.closest('button')) void haptic('tap');
  }, { passive: true });
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    setTimeout(() => SplashScreen.hide(), 300);
  } catch { /* ignore */ }
}
