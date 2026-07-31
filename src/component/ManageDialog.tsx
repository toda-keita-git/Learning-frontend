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
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import {
  updateCategoryApi,
  deleteCategoryApi,
  updateTagApi,
  deleteTagApi,
} from "./Api";
import { useToast } from "../ToastContext";

type Entity = { id: number; name: string };
type Kind = "category" | "tag";

interface ManageDialogProps {
  open: boolean;
  onClose: () => void;
  categories: Entity[];
  tags: Entity[];
  // 変更後に一覧を再取得させる
  onChanged: () => void | Promise<void>;
}

export default function ManageDialog({
  open,
  onClose,
  categories,
  tags,
  onChanged,
}: ManageDialogProps) {
  const { showToast } = useToast();
  // 編集中の行（例: "category-3"）と入力値
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [busy, setBusy] = useState(false);

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
    if (!name) return;
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

  const renderSection = (kind: Kind, items: Entity[]) => (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        {kind === "category" ? (
          <CategoryOutlinedIcon color="primary" fontSize="small" />
        ) : (
          <LocalOfferOutlinedIcon color="primary" fontSize="small" />
        )}
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {kind === "category" ? "カテゴリー" : "タグ"}（{items.length}）
        </Typography>
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
                            disabled={busy || !editValue.trim()}
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>カテゴリー・タグの管理</DialogTitle>
      <DialogContent dividers>
        <Typography variant="caption" sx={{ color: "text.secondary", mb: 1.5, display: "block" }}>
          名前の変更（✏️）と削除（🗑️）ができます。学習記録で使用中のものは削除できません。
        </Typography>
        {renderSection("category", categories)}
        <Divider sx={{ my: 1 }} />
        {renderSection("tag", tags)}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          とじる
        </Button>
      </DialogActions>
    </Dialog>
  );
}
