import { useMemo } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import { useFullScreenDialog } from "./useFullScreenDialog";
import { layoutGraph, type GraphRelatable } from "./graphLayout";

interface RelatedGraphItem extends GraphRelatable {
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  items: RelatedGraphItem[];
  onOpenItem: (id: number) => void;
}

// 表示件数の上限（多すぎると力学レイアウトが重くなり、見た目も潰れるため）
const MAX_NODES = 80;
const WIDTH = 800;
const HEIGHT = 560;

const PALETTE = [
  "#4f46e5", "#0ea5a4", "#f97316", "#e11d48", "#7c3aed",
  "#059669", "#d97706", "#2563eb", "#db2777", "#65a30d",
];
const UNCATEGORIZED_COLOR = "#94a3b8";

const colorForCategory = (name: string) => {
  if (!name) return UNCATEGORIZED_COLOR;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
};

/**
 * Obsidianのグラフビューのように、学習記録同士のつながり（タグ・カテゴリー・
 * タイトルの共通語）をネットワーク図として可視化するダイアログ。
 * 「関連する過去の記録」と同じロジック(findRelatedItems)を、記録同士を横断して使う
 */
export default function RelatedGraphDialog({ open, onClose, items, onOpenItem }: Props) {
  const fullScreenDialog = useFullScreenDialog();

  const cappedItems = useMemo(() => {
    if (items.length <= MAX_NODES) return items;
    return [...items]
      .sort((a, b) => (new Date(b.created_at).getTime() || 0) - (new Date(a.created_at).getTime() || 0))
      .slice(0, MAX_NODES);
  }, [items]);

  const { nodes, edges } = useMemo(
    () => (open ? layoutGraph(cappedItems, WIDTH, HEIGHT) : { nodes: [], edges: [] }),
    [cappedItems, open]
  );

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.item.id, n])), [nodes]);

  const categories = useMemo(
    () => Array.from(new Set(cappedItems.map((i) => i.category_name).filter(Boolean))).sort(),
    [cappedItems]
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={fullScreenDialog}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <HubOutlinedIcon color="primary" /> 学びのつながり
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
          タグ・カテゴリー・タイトルの共通語をもとに、記録同士のつながりを図にしています。丸をクリックすると、その記録を開けます。
          {items.length > MAX_NODES && `（新しい${MAX_NODES}件のみ表示しています）`}
        </Typography>

        {categories.length > 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
            {categories.map((cat) => (
              <Box key={cat} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: colorForCategory(cat),
                  }}
                />
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {cat}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {cappedItems.length === 0 ? (
          <Typography sx={{ color: "text.secondary", textAlign: "center", py: 6 }}>
            まだ記録がありません。記録が増えると、ここにつながりが見えてきます。
          </Typography>
        ) : (
          <Box sx={{ overflowX: "auto", border: 1, borderColor: "divider", borderRadius: 2 }}>
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              width={WIDTH}
              height={HEIGHT}
              style={{ display: "block", minWidth: WIDTH }}
            >
              {edges.map((e, i) => {
                const a = nodeById.get(e.sourceId);
                const b = nodeById.get(e.targetId);
                if (!a || !b) return null;
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="currentColor"
                    strokeOpacity={0.18}
                    strokeWidth={1}
                  />
                );
              })}
              {nodes.map((node) => {
                const radius = 7 + Math.min(node.degree, 5) * 2;
                const label =
                  node.item.title.length > 10 ? `${node.item.title.slice(0, 10)}…` : node.item.title;
                return (
                  <g
                    key={node.item.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    style={{ cursor: "pointer" }}
                    onClick={() => onOpenItem(node.item.id)}
                  >
                    <title>{`${node.item.title}（${node.item.category_name || "未分類"}）`}</title>
                    <circle
                      r={radius}
                      fill={colorForCategory(node.item.category_name)}
                      stroke="#fff"
                      strokeWidth={1.5}
                    />
                    <text
                      y={radius + 12}
                      textAnchor="middle"
                      fontSize={10}
                      fill="currentColor"
                      style={{ pointerEvents: "none" }}
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          とじる
        </Button>
      </DialogActions>
    </Dialog>
  );
}
