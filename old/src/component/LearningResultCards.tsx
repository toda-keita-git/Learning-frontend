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
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import { findRelatedItems } from "./relatedNotes";
import MarkdownContent from "./MarkdownContent";
import { parseAttachments } from "./attachments";
import { parseReferenceUrls } from "./referenceUrls";

interface LearningResultItem {
  id: number;
  title: string;
  // 検索結果一覧のプレビューに表示する見出し（未設定ならexplanatory_textの先頭を代わりに表示）
  heading_text: string | null;
  explanatory_text: string;
  understanding_level: number | null;
  reference_url: string | null;
  category_name: string;
  tags: string[];
  github_path: string;
  commit_sha: string | null;
  created_at: string;
}

interface LearningResultCardsProps {
  header: string;
  timestamp?: string;
  items: LearningResultItem[];
  emptyText?: string;
  // 関連メモのサジェスト計算に使う全学習記録（未指定ならitemsのみで計算）
  allItems?: LearningResultItem[];
  onViewFile: (path: string, commitSha?: string | null) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  // 星をクリックして理解度を直接更新する（省略時は読み取り専用表示のまま）
  onRateChange?: (id: number, value: number | null) => void;
  // 関連メモをタップしたときの遷移先（省略時は関連メモ欄自体を出さない）
  onOpenRelated?: (id: number) => void;
  // 記事化プレビューを開く（省略時は「記事化」ボタン自体を出さない）
  onPublish?: (item: LearningResultItem) => void;
  // 0件だったときに、行き止まりにせず次の行動へ誘導するボタン（省略時は出さない）
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}

/** 検索・タグ絞り込み結果を、システムメッセージの一部としてカード一覧で表示する */
export default function LearningResultCards({
  header,
  timestamp,
  items,
  emptyText = "一致する学習記録は見つかりませんでした。",
  allItems,
  onViewFile,
  onEdit,
  onDelete,
  onRateChange,
  onOpenRelated,
  onPublish,
  emptyActionLabel,
  onEmptyAction,
}: LearningResultCardsProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  // itemsは検索実行時点のスナップショットで、親側で理解度が更新されても再取得するまで
  // 反映されないため、星クリック直後の見た目だけこのMapで即座に上書きする
  const [ratingOverrides, setRatingOverrides] = useState<Map<number, number | null>>(new Map());

  const toggle = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRatingChange = (id: number, newValue: number | null) => {
    setRatingOverrides((prev) => new Map(prev).set(id, newValue));
    onRateChange?.(id, newValue);
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
          <Box sx={{ ml: 0.5 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: onEmptyAction ? 1 : 0 }}>
              {emptyText}
            </Typography>
            {onEmptyAction && emptyActionLabel && (
              <Button size="small" variant="outlined" onClick={onEmptyAction}>
                {emptyActionLabel}
              </Button>
            )}
          </Box>
        ) : (
          <Stack spacing={1.25}>
            {items.map((item) => {
              const isOpen = expandedIds.has(item.id);
              const relatedItems =
                allItems && onOpenRelated ? findRelatedItems(item, allItems) : [];
              const displayedRating = ratingOverrides.has(item.id)
                ? ratingOverrides.get(item.id) ?? null
                : item.understanding_level;
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
                      {onRateChange ? (
                        <Rating
                          value={displayedRating}
                          size="small"
                          sx={{ flexShrink: 0 }}
                          onChange={(_event, newValue) => handleRatingChange(item.id, newValue)}
                        />
                      ) : item.understanding_level == null ? (
                        <Chip
                          label="未設定"
                          size="small"
                          variant="outlined"
                          sx={{ flexShrink: 0, color: "text.secondary" }}
                        />
                      ) : (
                        <Rating
                          value={item.understanding_level}
                          readOnly
                          size="small"
                          sx={{ flexShrink: 0 }}
                        />
                      )}
                    </Box>

                    {!isOpen && (item.heading_text || item.explanatory_text) && (
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          mb: 0.75,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {item.heading_text || item.explanatory_text}
                      </Typography>
                    )}

                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 0.5,
                        mb: 0.75,
                      }}
                    >
                      {item.category_name && (
                        <Chip
                          label={item.category_name}
                          size="small"
                          color="primary"
                          sx={{ fontWeight: 600 }}
                        />
                      )}
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
                        <Box sx={{ mb: 1 }}>
                          <MarkdownContent text={item.explanatory_text} />
                        </Box>

                        {(() => {
                          const referenceUrls = parseReferenceUrls(item.reference_url);
                          return referenceUrls.length > 0 ? (
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                              {referenceUrls.map((url, index) => (
                                <Typography key={`${url}-${index}`} variant="body2" component="span">
                                  <Box
                                    component="a"
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{ color: "primary.main", fontWeight: 600, textDecoration: "none" }}
                                  >
                                    参考リンク{referenceUrls.length > 1 ? `${index + 1}` : ""} 🔗
                                  </Box>
                                </Typography>
                              ))}
                            </Stack>
                          ) : null;
                        })()}

                        {relatedItems.length > 0 && (
                          <Box sx={{ mb: 1.5 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                mb: 0.5,
                              }}
                            >
                              <AutoAwesomeOutlinedIcon
                                sx={{ fontSize: 14, color: "text.secondary" }}
                              />
                              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                関連する過去の記録
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                              {relatedItems.map((related) => (
                                <Chip
                                  key={related.id}
                                  label={related.title}
                                  size="small"
                                  variant="outlined"
                                  onClick={() => onOpenRelated?.(related.id)}
                                  sx={{ maxWidth: 220 }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}

                        {(() => {
                          const fileAttachments = parseAttachments(item.github_path, item.commit_sha);
                          return (
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                alignItems: "center",
                                gap: 1,
                                justifyContent: fileAttachments.length > 0 ? "space-between" : "flex-end",
                              }}
                            >
                              {fileAttachments.length > 0 && (
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                  {fileAttachments.map((att, index) => (
                                    <Button
                                      key={`${att.path}-${index}`}
                                      size="small"
                                      variant="contained"
                                      startIcon={<DescriptionOutlinedIcon />}
                                      onClick={() => onViewFile(att.path, att.sha)}
                                    >
                                      ファイルを見る（{att.path.split("/").pop()}）
                                    </Button>
                                  ))}
                                </Stack>
                              )}
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {onPublish && (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<ArticleOutlinedIcon />}
                                onClick={() => onPublish(item)}
                              >
                                記事化
                              </Button>
                            )}
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
                          );
                        })()}
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
