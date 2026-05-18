/**
 * 웹 브라우저 알림 (Web Notification API).
 *
 * V1 (지금): 영업맨이 챙김 탭을 열어둔 상태에서 브라우저 알림 띄움.
 *  · 다음 액션 오늘 도래
 *  · 90일 무연락 진입
 *  · 명절 D-2
 *
 * V2 (네이티브 빌드 후): expo-notifications 로 백그라운드/푸시 받음.
 *
 * 권한 요청은 사용자 명시적 액션으로만 (UX best practice).
 */

import { Platform } from 'react-native';

export type NotificationPermission = 'default' | 'granted' | 'denied' | 'unavailable';

const SHOWN_KEY = 'metsystem.shown_notifications';

export function getNotificationPermission(): NotificationPermission {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !('Notification' in window)) {
    return 'unavailable';
  }
  return window.Notification.permission as NotificationPermission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !('Notification' in window)) {
    return 'unavailable';
  }
  const result = await window.Notification.requestPermission();
  return result as NotificationPermission;
}

/**
 * 중복 방지용 — 한 키당 24시간에 한 번만 알림.
 * key 는 deterministic 해야 함 (예: `next-action-${customerId}-${date}`)
 */
function shouldShow(key: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return true;
  try {
    const raw = window.localStorage.getItem(SHOWN_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    const lastShown = map[key];
    if (lastShown && Date.now() - lastShown < 24 * 60 * 60 * 1000) {
      return false;
    }
    map[key] = Date.now();
    // 오래된 항목 정리 (7일 이상)
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const [k, v] of Object.entries(map)) {
      if (v < cutoff) delete map[k];
    }
    window.localStorage.setItem(SHOWN_KEY, JSON.stringify(map));
    return true;
  } catch {
    return true;
  }
}

export function showNotification(
  title: string,
  options: {
    body?: string;
    /** 중복 방지 키 — 24시간 1회 */
    dedupKey: string;
    onClick?: () => void;
  },
): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }
  if (window.Notification.permission !== 'granted') return;
  if (!shouldShow(options.dedupKey)) return;

  try {
    const notif = new window.Notification(title, {
      body: options.body,
      icon: '/favicon.png',
      tag: options.dedupKey,
    });
    if (options.onClick) {
      notif.onclick = () => {
        window.focus();
        options.onClick?.();
        notif.close();
      };
    }
  } catch (e) {
    console.warn('[notification] show failed', e);
  }
}

/** 알림 상태 한국어 라벨 */
export function permissionLabel(p: NotificationPermission): string {
  switch (p) {
    case 'granted':
      return '✅ 알림 허용됨';
    case 'denied':
      return '🚫 알림 차단됨 (브라우저 설정에서 허용)';
    case 'unavailable':
      return '⚠️ 이 환경은 알림 미지원';
    default:
      return '⚙️ 알림 권한 요청 필요';
  }
}
