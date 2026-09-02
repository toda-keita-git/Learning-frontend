const localDate = (value: string): Date => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const daysUntil = (value: string, now = new Date()): number => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((localDate(value).getTime() - today.getTime()) / 86_400_000);
};

export const deadlineLabel = (value: string): string => {
  const days = daysUntil(value);
  if (days < 0) return `${Math.abs(days)}日超過`;
  if (days === 0) return "今日が期限";
  if (days <= 7) return `あと${days}日`;
  const date = localDate(value);
  return `${date.getMonth() + 1}/${date.getDate()}まで`;
};
