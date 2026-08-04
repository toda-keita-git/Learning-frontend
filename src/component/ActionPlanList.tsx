import { useState } from "react";
import type { DragEvent } from "react";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import type { ActionPlan } from "./GoalTypes";
import { ACTION_PLAN_STATUS_LABEL } from "./GoalTypes";
import ProgressBadge from "./ProgressBadge";

interface ActionPlanListProps {
  actionPlans: ActionPlan[]; // 呼び出し側でpriority昇順に並べ済みのものを渡す
  onSelect: (plan: ActionPlan) => void;
  onEdit: (plan: ActionPlan) => void;
  onDelete: (plan: ActionPlan) => void;
  onReorder: (orderedIds: number[]) => void;
}

// ドラッグ&ドロップでの並べ替え。ライブラリを追加せずHTML5のネイティブDnDで実装する
export default function ActionPlanList({ actionPlans, onSelect, onEdit, onDelete, onReorder }: ActionPlanListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => (e: DragEvent<HTMLDivElement>) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (index: number) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (index !== overIndex) setOverIndex(index);
  };

  const handleDrop = (index: number) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOverIndex(null);
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      return;
    }
    const reordered = [...actionPlans];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    setDragIndex(null);
    onReorder(reordered.map((p) => p.id));
  };

  if (actionPlans.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
        まだアクションプランがありません。「新しいアクションプラン」から追加してください。
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {actionPlans.map((plan, index) => (
        <Paper
          key={plan.id}
          variant="outlined"
          draggable
          onDragStart={handleDragStart(index)}
          onDragOver={handleDragOver(index)}
          onDrop={handleDrop(index)}
          onDragEnd={() => setOverIndex(null)}
          sx={{
            p: 1.5,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
            cursor: "grab",
            opacity: dragIndex === index ? 0.4 : 1,
            outline: overIndex === index && dragIndex !== index ? "2px solid" : "none",
            outlineColor: "primary.main",
          }}
        >
          <DragIndicatorIcon fontSize="small" sx={{ color: "text.disabled" }} />
          <Chip label={index + 1} size="small" color="primary" variant="outlined" sx={{ minWidth: 28 }} />

          <Stack sx={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onSelect(plan)}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ fontWeight: 600 }} noWrap>
                {plan.title}
              </Typography>
              <Chip label={ACTION_PLAN_STATUS_LABEL[plan.status]} size="small" variant="outlined" />
            </Stack>
            <ProgressBadge value={plan.progress} />
          </Stack>

          <IconButton size="small" onClick={() => onEdit(plan)} aria-label="編集">
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => onDelete(plan)} aria-label="削除">
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => onSelect(plan)} aria-label="開く">
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Paper>
      ))}
    </Stack>
  );
}
