import { useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Collapse from "@mui/material/Collapse";
import Button from "@mui/material/Button";
import Rating from "@mui/material/Rating";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface LearningResultItem {
  id: number;
  title: string;
  explanatory_text: string;
  understanding_level: number;
  reference_url: string | null;
  category_name: string;
  tags: string[];
  github_path: string;
  commit_sha: string | null;
}

interface LearningResultCardsProps {
  header: string;
  timestamp?: string;
  items: LearningResultItem[];
  emptyText?: string;
  onViewFile: (path: string, commitSha?: string | null) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

/** 検索・タグ絞り込み結果を、システムメッセージの一部としてカード一覧で表示する */
export default function LearningResultCards({
  header,
  timestamp,
  items,
  emptyText = "一致する学習記録は見つかりませんでした。",
  onViewFile,
  onEdit,
  onDelete,
}: LearningResultCardsProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggle = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 1.75 }}>
      <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", flexShrink: 0 }}>
        <SmartToyIcon fontSize="small" />
      </Avatar>
      <Box sx={{ maxWidth: "88%", width: "100%" }}>
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", display: "block", mb: 0.5, ml: 0.5 }}
        >
          システム
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, color: "primary.main", mb: 1, ml: 0.5 }}
        >
          {header}
        </Typography>

        {items.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary", ml: 0.5 }}>
            {emptyText}
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            {items.map((item) => {
              const isOpen = expandedIds.has(item.id);
              return (
                <Card
                  key={item.id}
                  variant="outlined"
                  sx={{
                    borderColor: "divider",
                    transition: "box-shadow .2s ease",
                    "&:hover": { boxShadow: 3 },
                  }}
                >
                  <CardContent sx={{ p: "12px 14px", "&:last-child": { pb: "12px" } }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: 1,
                        mb: 0.75,
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, color: "primary.main" }}
                      >
                        {item.title}
                      </Typography>
                      <Rating
                        value={item.understanding_level}
                        readOnly
                        size="small"
                        sx={{ flexShrink: 0 }}
                      />
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 0.5,
                        mb: 0.75,
                      }}
                    >
                      <Chip
                        label={item.category_name}
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 600 }}
                      />
                      {item.tags.length > 0 ? (
                        item.tags.map((tag) => (
                          <Chip key={tag} label={`#${tag}`} size="small" variant="outlined" />
                        ))
                      ) : (
                        <Typography variant="caption" sx={{ color: "text.disabled" }}>
                          タグなし
                        </Typography>
                      )}
                    </Box>

                    <Button
                      size="small"
                      onClick={() => toggle(item.id)}
                      aria-expanded={isOpen}
                      endIcon={
                        <ExpandMoreIcon
                          fontSize="small"
                          sx={{
                            transform: isOpen ? "rotate(180deg)" : "none",
                            transition: "transform .2s",
                          }}
                        />
                      }
                      sx={{ px: 0, minWidth: 0, fontSize: "0.8em" }}
                    >
                      {isOpen ? "詳細を閉じる" : "詳細を見る"}
                    </Button>

                    <Collapse in={isOpen} timeout="auto" unmountOnExit>
                      <Box sx={{ mt: 1, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                        <Typography
                          variant="body2"
                          sx={{
                            color: "text.secondary",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            mb: 1,
                          }}
                        >
                          {item.explanatory_text}
                        </Typography>

                        {item.reference_url && (
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <Box
                              component="a"
                              href={item.reference_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ color: "primary.main", fontWeight: 600, textDecoration: "none" }}
                            >
                              参考リンク 🔗
                            </Box>
                          </Typography>
                        )}

                        <Box
                          sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: 1,
                            justifyContent: item.github_path ? "space-between" : "flex-end",
                          }}
                        >
                          {item.github_path && (
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<DescriptionOutlinedIcon />}
                              onClick={() => onViewFile(item.github_path, item.commit_sha)}
                            >
                              ファイルを見る（{item.github_path.split("/").pop()}）
                            </Button>
                          )}
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<EditOutlinedIcon />}
                              onClick={() => onEdit(item.id)}
                            >
                              編集
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<DeleteOutlineIcon />}
                              onClick={() => onDelete(item.id)}
                            >
                              削除
                            </Button>
                          </Stack>
                        </Box>
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}

        {timestamp && (
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", display: "block", mt: 0.5, ml: 0.5 }}
          >
            {timestamp}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
