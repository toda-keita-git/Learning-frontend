import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import {
  createCategoryApi,
  updateCategoryApi,
  deleteCategoryApi,
  createTagApi,
  updateTagApi,
  deleteTagApi,
} from "./Api";
import { useToast } from "../ToastContext";
import { useFullScreenDialog } from "./useFullScreenDialog";

type Entity = { id: number; name: string };
type Kind = "category" | "tag";

interface ManageDialogProps {
  open: boolean;
  onClose: () => void;
  categories: Entity[];
  tags: Entity[];
  // フリープランの上限（あと何件作れるかの表示に使う。省略時は件数のみ表示）
  categoryLimit?: number;
  tagLimit?: number;
  // 変更後に一覧を再取得させる
  onChanged: () => void | Promise<void>;
}

export default function ManageDialog({
  open,
  onClose,
  categories,
  tags,
  categoryLimit,
  tagLimit,
  onChanged,
}: ManageDialogProps) {
  const { showToast } = useToast();
  const fullScreenDialog = useFullScreenDialog();
  // 編集中の行（例: "category-3"）と入力値
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [creating, setCreating] = useState(false);

  const startEdit = (kind: Kind, item: Entity) => {
    setEditingKey(`${kind}-${item.id}`);
    setEditValue(item.name);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue("");
  };

  const saveEdit = async (kind: Kind, id: number) => {
    const name = editValue.trim().replace(/^#/, "");
    if (!name) {
      showToast("名前を入力してください。", "warning");
      return;
    }
    setBusy(true);
    try {
      if (kind === "category") await updateCategoryApi(id, name);
      else await updateTagApi(id, name);
      cancelEdit();
      await onChanged();
      showToast("名前を変更しました。", "success");
    } catch (e) {
      showToast("名前の変更に失敗しました。", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (kind: Kind, item: Entity) => {
    const label = kind === "category" ? "カテゴリー" : "タグ";
    if (
      !window.confirm(
        `${label}「${item.name}」を削除しますか？この操作は元に戻せません。`
      )
    )
      return;
    setBusy(true);
    try {
      if (kind === "category") await deleteCategoryApi(item.id);
      else await deleteTagApi(item.id);
      await onChanged();
      showToast(`${label}を削除しました。`, "success");
    } catch (e: any) {
      // 使用中(409)ならバックエンドのメッセージをそのまま表示
      if (e?.response?.status === 409) {
        showToast(
          e.response.data ||
            `この${label}は学習記録で使用中のため削除できません。`,
          "error"
        );
      } else {
        showToast("削除に失敗しました。", "error");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async (kind: Kind, items: Entity[]) => {
    const raw = kind === "category" ? newCategoryName : newTagName;
    const name = raw.trim().replace(/^#/, "");
    const label = kind === "category" ? "カテゴリー" : "タグ";
    if (!name) return;
    if (items.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      showToast("その名前はすでに使われています。", "warning");
      return;
    }
    setCreating(true);
    try {
      if (kind === "category") await createCategoryApi({ name });
      else await createTagApi({ name });
      if (kind === "category") setNewCategoryName("");
      else setNewTagName("");
      await onChanged();
      showToast(`${label}を追加しました。`, "success");
    } catch (e) {
      const apiError = e as { response?: { status?: number; data?: string } };
      if (apiError?.response?.status === 403) {
        showToast(apiError.response?.data || `${label}の上限に達しています。`, "warning");
      } else {
        showToast(`${label}の追加に失敗しました。`, "error");
      }
    } finally {
      setCreating(false);
    }
  };

  const renderSection = (kind: Kind, items: Entity[], limit?: number) => (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
        {kind === "category" ? (
          <CategoryOutlinedIcon color="primary" fontSize="small" />
        ) : (
          <LocalOfferOutlinedIcon color="primary" fontSize="small" />
        )}
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {kind === "category" ? "カテゴリー" : "タグ"}
          （{items.length}
          {limit !== undefined ? `/${limit}` : ""}）
        </Typography>
        {limit !== undefined && (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {items.length >= limit ? "上限に達しています" : `あと${limit - items.length}件追加できます`}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder={kind === "category" ? "新しいカテゴリー名" : "新しいタグ名"}
          value={kind === "category" ? newCategoryName : newTagName}
          disabled={creating || (limit !== undefined && items.length >= limit)}
          onChange={(e) =>
            kind === "category" ? setNewCategoryName(e.target.value) : setNewTagName(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate(kind, items);
          }}
        />
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          disabled={
            creating ||
            (limit !== undefined && items.length >= limit) ||
            !(kind === "category" ? newCategoryName : newTagName).trim()
          }
          onClick={() => handleCreate(kind, items)}
          sx={{ flexShrink: 0 }}
        >
          追加
        </Button>
      </Box>

      {items.length === 0 ? (
        <Typography variant="caption" sx={{ color: "text.secondary", pl: 1 }}>
          まだありません。
        </Typography>
      ) : (
        <List
          dense
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            maxHeight: 220,
            overflow: "auto",
          }}
        >
          {items.map((item) => {
            const key = `${kind}-${item.id}`;
            const isEditing = editingKey === key;
            return (
              <ListItem
                key={key}
                divider
                secondaryAction={
                  isEditing ? (
                    <>
                      <Tooltip title="保存">
                        <span>
                          <IconButton
                            edge="end"
                            color="primary"
                            disabled={busy}
                            onClick={() => saveEdit(kind, item.id)}
                          >
                            <CheckIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="キャンセル">
                        <IconButton edge="end" onClick={cancelEdit}>
                          <CloseIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <Tooltip title="名前を変更">
                        <IconButton
                          edge="end"
                          disabled={busy}
                          onClick={() => startEdit(kind, item)}
                        >
                          <EditOutlinedIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="削除">
                        <IconButton
                          edge="end"
                          color="error"
                          disabled={busy}
                          onClick={() => handleDelete(kind, item)}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )
                }
              >
                {isEditing ? (
                  <TextField
                    autoFocus
                    variant="standard"
                    size="small"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(kind, item.id);
                      if (e.key === "Escape") cancelEdit();
                    }}
                    sx={{ mr: 10, flex: 1 }}
                  />
                ) : (
                  <ListItemText
                    primary={kind === "tag" ? `#${item.name}` : item.name}
                    sx={{ mr: 10 }}
                  />
                )}
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreenDialog}>
      <DialogTitle>カテゴリー・タグの管理</DialogTitle>
      <DialogContent dividers>
        <Typography variant="caption" sx={{ color: "text.secondary", mb: 1.5, display: "block" }}>
          追加・名前の変更（✏️）・削除（🗑️）ができます。学習記録で使用中のものは削除できません。
        </Typography>
        {renderSection("category", categories, categoryLimit)}
        <Divider sx={{ my: 1 }} />
        {renderSection("tag", tags, tagLimit)}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          とじる
        </Button>
      </DialogActions>
    </Dialog>
  );
}
