// PlanDashboardが必要とするデータ操作をまとめたインターフェース。
// 実アカウント（バックエンドAPI）とゲストモード（localStorage）の両方が
// これを実装することで、PlanDashboard自体はどちらのモードでも同じまま動く。
import type { Plan, Note, PlanInput, NoteInput, CategoryOption, NoteAttachment } from "./PlanTypes";
import {
  plansApi,
  createPlanApi,
  updatePlanApi,
  reparentPlanApi,
  reorderPlansApi,
  deletePlanApi,
  notesApi,
  createNoteApi,
  updateNoteApi,
  deleteNoteApi,
  linkNoteApi,
  unlinkNoteApi,
  toggleNoteTodoApi,
  addNoteAttachmentApi,
  deleteNoteAttachmentApi,
  CategoriesApi,
  TagsApi,
} from "./Api";

export interface PlanDataBundle {
  plans: Plan[];
  notes: Note[];
  categories: CategoryOption[];
  tagOptions: string[];
}

export interface PlanDataSource {
  fetchAll(): Promise<PlanDataBundle>;
  // 戻り値は新規作成したプランのid（ドラッグでメモから新規プランを作った直後の自動リンクに使う）
  createPlan(data: PlanInput): Promise<number>;
  updatePlan(id: number, data: PlanInput): Promise<void>;
  reparentPlan(id: number, parentId: number | null): Promise<void>;
  reorderPlans(items: { id: number; sort_order: number }[]): Promise<void>;
  deletePlan(id: number): Promise<void>;
  createNote(data: NoteInput): Promise<void>;
  updateNote(id: number, data: NoteInput): Promise<void>;
  deleteNote(id: number): Promise<void>;
  linkNote(id: number, planId: number): Promise<void>;
  unlinkNote(id: number, planId: number): Promise<void>;
  toggleNoteTodo(todoItemId: number, checked: boolean): Promise<void>;
  addNoteAttachment(noteId: number, attachment: Omit<NoteAttachment, "id" | "note_id">): Promise<void>;
  deleteNoteAttachment(attachmentId: number): Promise<void>;
}

// ログイン済みアカウント用: 既存のバックエンドAPIをそのまま呼び出す
export const apiPlanDataSource: PlanDataSource = {
  async fetchAll() {
    const [plans, notes, categories, tags] = await Promise.all([
      plansApi(),
      notesApi(),
      CategoriesApi(),
      TagsApi(),
    ]);
    return {
      plans: plans ?? [],
      notes: notes ?? [],
      categories: categories ?? [],
      tagOptions: ((tags ?? []) as { name: string }[]).map((t) => t.name),
    };
  },
  async createPlan(data) {
    return createPlanApi(data);
  },
  async updatePlan(id, data) {
    await updatePlanApi(id, data);
  },
  async reparentPlan(id, parentId) {
    await reparentPlanApi(id, parentId);
  },
  async reorderPlans(items) {
    await reorderPlansApi(items);
  },
  async deletePlan(id) {
    await deletePlanApi(id);
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
  async linkNote(id, planId) {
    await linkNoteApi(id, planId);
  },
  async unlinkNote(id, planId) {
    await unlinkNoteApi(id, planId);
  },
  async toggleNoteTodo(todoItemId, checked) {
    await toggleNoteTodoApi(todoItemId, checked);
  },
  async addNoteAttachment(noteId, attachment) {
    await addNoteAttachmentApi(noteId, attachment);
  },
  async deleteNoteAttachment(attachmentId) {
    await deleteNoteAttachmentApi(attachmentId);
  },
};
