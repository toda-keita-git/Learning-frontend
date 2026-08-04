// GoalDashboardが必要とするデータ操作をまとめたインターフェース。
// 実アカウント（バックエンドAPI）とゲストモード（localStorage）の両方が
// これを実装することで、GoalDashboard自体はどちらのモードでも同じまま動く。
import type {
  Goal,
  ActionPlan,
  Note,
  GoalInput,
  ActionPlanInput,
  NoteInput,
  CategoryOption,
} from "./GoalTypes";
import {
  goalsApi,
  createGoalApi,
  updateGoalApi,
  deleteGoalApi,
  actionPlansApi,
  createActionPlanApi,
  updateActionPlanApi,
  deleteActionPlanApi,
  reorderActionPlansApi,
  notesApi,
  createNoteApi,
  updateNoteApi,
  deleteNoteApi,
  attachNoteApi,
  toggleNoteTodoApi,
  CategoriesApi,
  TagsApi,
} from "./Api";

export interface GoalDataBundle {
  goals: Goal[];
  actionPlans: ActionPlan[];
  notes: Note[];
  categories: CategoryOption[];
  tagOptions: string[];
}

export interface GoalDataSource {
  fetchAll(): Promise<GoalDataBundle>;
  createGoal(data: GoalInput): Promise<void>;
  updateGoal(id: number, data: GoalInput): Promise<void>;
  deleteGoal(id: number): Promise<void>;
  createActionPlan(data: ActionPlanInput): Promise<void>;
  updateActionPlan(id: number, data: ActionPlanInput): Promise<void>;
  deleteActionPlan(id: number): Promise<void>;
  reorderActionPlans(items: { id: number; priority: number }[]): Promise<void>;
  createNote(data: NoteInput): Promise<void>;
  updateNote(id: number, data: NoteInput): Promise<void>;
  deleteNote(id: number): Promise<void>;
  attachNote(id: number, actionPlanId: number): Promise<void>;
  toggleNoteTodo(todoItemId: number, checked: boolean): Promise<void>;
}

// ログイン済みアカウント用: 既存のバックエンドAPIをそのまま呼び出す
export const apiGoalDataSource: GoalDataSource = {
  async fetchAll() {
    const [goals, actionPlans, notes, categories, tags] = await Promise.all([
      goalsApi(),
      actionPlansApi(),
      notesApi(),
      CategoriesApi(),
      TagsApi(),
    ]);
    return {
      goals: goals ?? [],
      actionPlans: actionPlans ?? [],
      notes: notes ?? [],
      categories: categories ?? [],
      tagOptions: ((tags ?? []) as { name: string }[]).map((t) => t.name),
    };
  },
  async createGoal(data) {
    await createGoalApi(data);
  },
  async updateGoal(id, data) {
    await updateGoalApi(id, data);
  },
  async deleteGoal(id) {
    await deleteGoalApi(id);
  },
  async createActionPlan(data) {
    await createActionPlanApi(data);
  },
  async updateActionPlan(id, data) {
    await updateActionPlanApi(id, data);
  },
  async deleteActionPlan(id) {
    await deleteActionPlanApi(id);
  },
  async reorderActionPlans(items) {
    await reorderActionPlansApi(items);
  },
  async createNote(data) {
    await createNoteApi(data);
  },
  async updateNote(id, data) {
    await updateNoteApi(id, data);
  },
  async deleteNote(id) {
    await deleteNoteApi(id);
  },
  async attachNote(id, actionPlanId) {
    await attachNoteApi(id, actionPlanId);
  },
  async toggleNoteTodo(todoItemId, checked) {
    await toggleNoteTodoApi(todoItemId, checked);
  },
};
