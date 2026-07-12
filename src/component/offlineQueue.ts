// オフライン中に行った学習記録の追加・更新・削除を一時保存し、
// オンライン復帰時にまとめて送信するための簡易キュー。
// GitHubファイルの添付・編集はネットワークが必須のため対象外（呼び出し側で判定する）。
import { createLearningApi, updateLearningApi, deleteLearningApi } from "./Api";

export type QueueAction =
  | { kind: "create"; payload: any; userId: number; label: string }
  | { kind: "update"; id: number; payload: any; userId: number; label: string }
  | { kind: "delete"; id: number; label: string };

const key = (userId: number | null | undefined) => `learningSyncQueue_${userId ?? "anon"}`;

export const loadQueue = (userId: number | null | undefined): QueueAction[] => {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveQueue = (userId: number | null | undefined, queue: QueueAction[]) => {
  try {
    localStorage.setItem(key(userId), JSON.stringify(queue));
  } catch {
    // 容量超過などは無視（同期待ちが多少消えても致命的ではない）
  }
};

export const enqueueAction = (
  userId: number | null | undefined,
  action: QueueAction
): number => {
  const queue = loadQueue(userId);
  queue.push(action);
  saveQueue(userId, queue);
  return queue.length;
};

export const queueLength = (userId: number | null | undefined): number =>
  loadQueue(userId).length;

// キューを先頭から順に送信する。失敗した分は次回に持ち越す。
export const flushQueue = async (
  userId: number | null | undefined
): Promise<{ succeeded: number; failed: number }> => {
  const queue = loadQueue(userId);
  let succeeded = 0;
  const remaining: QueueAction[] = [];

  for (const action of queue) {
    try {
      if (action.kind === "create") {
        await createLearningApi(action.payload, action.userId);
      } else if (action.kind === "update") {
        await updateLearningApi(action.id, action.payload, action.userId);
      } else {
        await deleteLearningApi(action.id);
      }
      succeeded++;
    } catch {
      remaining.push(action);
    }
  }

  saveQueue(userId, remaining);
  return { succeeded, failed: remaining.length };
};
