// 復習リマインドの通知まわりのヘルパー。
//
// 【正直な補足】ここで扱うのは「端末側のローカル通知」です。
// アプリ（PWA）を開いたときに、復習がたまっていれば通知でお知らせします。
// アプリを完全に閉じている間に届くサーバー起点のプッシュ通知（Web Push）は、
// サーバー側のVAPID鍵・購読管理が必要で、フロント単体では実現できません。

const ENABLED_KEY = "reviewRemindersEnabled";
const LAST_NOTIFIED_KEY = "reviewReminderLastDate";

export const isNotificationSupported = (): boolean =>
  typeof window !== "undefined" && "Notification" in window;

export const getPermission = (): NotificationPermission | "unsupported" => {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
};

export const isRemindersEnabled = (): boolean =>
  localStorage.getItem(ENABLED_KEY) === "true";

export const setRemindersEnabled = (v: boolean) => {
  localStorage.setItem(ENABLED_KEY, v ? "true" : "false");
};

// 通知の許可を求め、許可されたらリマインドをオンにする。
export const requestAndEnableReminders = async (): Promise<
  NotificationPermission | "unsupported"
> => {
  if (!isNotificationSupported()) return "unsupported";
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  setRemindersEnabled(permission === "granted");
  return permission;
};

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

// システム通知を表示する（Service Worker経由を優先、なければ通常のNotification）。
const show = async (title: string, body: string) => {
  const options: NotificationOptions = {
    body,
    icon: "/pwa-icon.svg",
    badge: "/pwa-icon.svg",
    tag: "review-reminder",
  };
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      // アクションボタンはService Worker経由の通知でのみ有効（通常のNotificationは非対応）
      await reg.showNotification(title, {
        ...options,
        actions: [{ action: "open-review", title: "今すぐ復習" }],
      } as NotificationOptions);
      return;
    }
  } catch {
    // SW経由に失敗したら通常のNotificationにフォールバック
  }
  new Notification(title, options);
};

// アプリアイコンに未読の復習件数バッジを表示する（Badging API対応ブラウザのみ・主にPWAインストール時）。
export const updateAppBadge = (count: number) => {
  const nav = navigator as unknown as {
    setAppBadge?: (n: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (count > 0) {
      nav.setAppBadge?.(count).catch(() => {});
    } else {
      nav.clearAppBadge?.().catch(() => {});
    }
  } catch {
    // 非対応ブラウザは無視
  }
};

// アプリ起動時などに呼ぶ。条件を満たせば「復習リマインド」を1日1回だけ通知する。
export const maybeNotifyReview = async (reviewCount: number) => {
  if (!isNotificationSupported()) return;
  if (!isRemindersEnabled()) return;
  if (Notification.permission !== "granted") return;
  if (reviewCount <= 0) return;
  // 同じ日に何度も通知しない
  if (localStorage.getItem(LAST_NOTIFIED_KEY) === todayKey()) return;

  localStorage.setItem(LAST_NOTIFIED_KEY, todayKey());
  await show(
    "📖 今日の復習",
    `復習期日が来た学習が${reviewCount}件あります。スキマ時間に振り返りましょう。`
  );
};

// 設定直後などに、動作確認用の通知をすぐ出す。
export const showTestReminder = async (reviewCount: number) => {
  await show(
    "🔔 リマインドをオンにしました",
    reviewCount > 0
      ? `いまは復習候補が${reviewCount}件あります。次にアプリを開いたときにもお知らせします。`
      : "復習がたまったら、アプリを開いたときにお知らせします。"
  );
};
