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
import { useToast } from "../ToastContext";
import {
  type GuestCategory,
  type GuestTag,
  GUEST_CATEGORY_LIMIT,
  GUEST_TAG_LIMIT,
  createGuestCategory,
  renameGuestCategory,
  deleteGuestCategory,
  createGuestTag,
  renameGuestTag,
  deleteGuestTag,
} from "./guestStorage";

type Kind = "category" | "tag";

interface GuestManageDialogProps {
  open: boolean;
  onClose: () => void;
  categories: GuestCategory[];
  tags: GuestTag[];
  // カテゴリー・タグに変更があったら、一覧を再取得させる
  onChanged: () => void;
}

/** ゲストモード用のカテゴリー・タグ管理（この端末のlocalStorageだけで完結する） */
export default function GuestManageDialog({
  open,
  onClose,
  categories,
  tags,
  onChanged,
}: GuestManageDialogProps) {
  const { showToast } = useToast();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newTagName, setNewTagName] = useState("");

  const startEdit = (kind: Kind, item: { id: number; name: string }) => {
    setEditingKey(`${kind}-${item.id}`);
    setEditValue(item.name);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue("");
  };

  const saveEdit = (kind: Kind, id: number) => {
    const name = editValue.trim().replace(/^#/, "");
    if (!name) {
      showToast("名前を入力してください。", "warning");
      return;
    }
    const ok = kind === "category" ? renameGuestCategory(id, name) : renameGuestTag(id, name);
    if (ok) {
      cancelEdit();
      onChanged();
      showToast("名前を変更しました。", "success");
    } else {
      showToast("名前の変更に失敗しました。", "error");
    }
  };

  const handleDelete = (kind: Kind, item: { id: number; name: string }) => {
    const label = kind === "category" ? "カテゴリー" : "タグ";
    if (!window.confirm(`${label}「${item.name}」を削除しますか？この操作は元に戻せません。`)) return;
    const result = kind === "category" ? deleteGuestCategory(item.id) : deleteGuestTag(item.id);
    if (result.ok) {
      onChanged();
      showToast(`${label}を削除しました。`, "success");
    } else {
      showToast(
        `この${label}は${result.usage}件の学習記録で使用中のため削除できません。`,
        "error"
      );
    }
  };

  const handleCreate = (kind: Kind) => {
    const name = kind === "category" ? newCategoryName : newTagName;
    const result = kind === "category" ? createGuestCategory(name) : createGuestTag(name);
    if (result.ok) {
      if (kind === "category") setNewCategoryName("");
      else setNewTagName("");
      onChanged();
      showToast(`${kind === "category" ? "カテゴリー" : "タグ"}を追加しました。`, "success");
      return;
    }
    if (result.reason === "duplicate") {
      showToast("その名前はすでに使われています。", "warning");
    } else if (result.reason === "limit") {
      const limit = kind === "category" ? GUEST_CATEGORY_LIMIT : GUEST_TAG_LIMIT;
      showToast(
        `ゲストモードでは${kind === "category" ? "カテゴリー" : "タグ"}は${limit}件までとなっています。`,
        "warning"
      );
    } else {
      showToast("保存できませんでした。", "error");
    }
  };

  const renderSection = (kind: Kind, items: { id: number; name: string }[], limit: number) => {
    const remaining = Math.max(0, limit - items.length);
    const atLimit = items.length >= limit;
    const newName = kind === "category" ? newCategoryName : newTagName;
    const setNewName = kind === "category" ? setNewCategoryName : setNewTagName;

    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          {kind === "category" ? (
            <CategoryOutlinedIcon color="primary" fontSize="small" />
          ) : (
            <LocalOfferOutlinedIcon color="primary" fontSize="small" />
          )}
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {kind === "category" ? "カテゴリー" : "タグ"}（{items.length}/{limit}）
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {atLimit ? "上限に達しています" : `あと${remaining}件追加できます`}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder={kind === "category" ? "新しいカテゴリー名" : "新しいタグ名"}
            value={newName}
            disabled={atLimit}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate(kind);
            }}
          />
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            disabled={atLimit || !newName.trim()}
            onClick={() => handleCreate(kind)}
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
            sx={{ border: 1, borderColor: "divider", borderRadius: 1, maxHeight: 220, overflow: "auto" }}
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
                          <IconButton edge="end" color="primary" onClick={() => saveEdit(kind, item.id)}>
                            <CheckIcon />
                          </IconButton>
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
                          <IconButton edge="end" onClick={() => startEdit(kind, item)}>
                            <EditOutlinedIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="削除">
                          <IconButton edge="end" color="error" onClick={() => handleDelete(kind, item)}>
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
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>カテゴリー・タグの管理</DialogTitle>
      <DialogContent dividers>
        <Typography variant="caption" sx={{ color: "text.secondary", mb: 1.5, display: "block" }}>
          この端末に保存されます。学習記録で使用中のものは削除できません。
        </Typography>
        {renderSection("category", categories, GUEST_CATEGORY_LIMIT)}
        <Divider sx={{ my: 1 }} />
        {renderSection("tag", tags, GUEST_TAG_LIMIT)}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          とじる
        </Button>
      </DialogActions>
    </Dialog>
  );
}
