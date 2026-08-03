import { useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Rating from "@mui/material/Rating";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import { parseAttachments } from "./attachments";
import { useFullScreenDialog } from "./useFullScreenDialog";

interface LearningListItem {
  id: number;
  title: string;
  explanatory_text: string;
  understanding_level: number | null;
  created_at: string;
  category_name: string;
  tags: string[];
  reference_url: string | null;
  github_path: string;
  commit_sha: string | null;
  // このカラムが追加される前に作られた記録はnull（フィルターでは「すべて」にのみ含まれる）
  repo_name?: string | null;
}

interface Categories {
  id: number;
  name: string;
}

interface LearningListDialogProps {
  open: boolean;
  onClose: () => void;
  items: LearningListItem[];
  categories: Categories[];
  onViewFile: (path: string, commitSha?: string | null) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onPublish?: (item: LearningListItem) => void;
  // 一覧から直接、新規学習記録の登録ダイアログを開く
  onAddNew?: () => void;
}

type OrderBy = "title" | "category_name" | "understanding_level" | "created_at";
type Order = "asc" | "desc";

const formatDate = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

/** 学習記録をまとめて見比べられる、ソート・絞り込み可能な一覧テーブル */
export default function LearningListDialog({
  open,
  onClose,
  items,
  categories,
  onViewFile,
  onEdit,
  onDelete,
  onPublish,
  onAddNew,
}: LearningListDialogProps) {
  const fullScreenDialog = useFullScreenDialog();
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [repoFilter, setRepoFilter] = useState("all");
  const [orderBy, setOrderBy] = useState<OrderBy>("created_at");
  const [order, setOrder] = useState<Order>("desc");

  // 複数のリポジトリを使い分けている場合だけ、リポジトリ絞り込みを表示する
  // （無料版は常に1つしか使わないため、自然にPro版だけの導線になる）
  const repoOptions = useMemo(() => {
    const names = new Set(
      items.map((item) => item.repo_name).filter((name): name is string => !!name)
    );
    return Array.from(names);
  }, [items]);
  const showRepoFilter = repoOptions.length >= 2;

  const handleSort = (column: OrderBy) => {
    if (orderBy === column) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(column);
      setOrder("asc");
    }
  };

  const filteredSorted = useMemo(() => {
    const lower = searchText.trim().toLowerCase();
    let rows = items.filter((item) => {
      const matchesCategory =
        categoryFilter === "all" || item.category_name === categoryFilter;
      const matchesRepo = repoFilter === "all" || item.repo_name === repoFilter;
      const matchesText =
        !lower ||
        item.title.toLowerCase().includes(lower) ||
        item.explanatory_text.toLowerCase().includes(lower) ||
        item.tags.some((tag) => tag.toLowerCase().includes(lower));
      return matchesCategory && matchesRepo && matchesText;
    });

    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      if (orderBy === "title" || orderBy === "category_name") {
        cmp = (a[orderBy] || "").localeCompare(b[orderBy] || "", "ja");
      } else if (orderBy === "understanding_level") {
        // 未設定（メモのみ）は最後尾に回す
        cmp = (a.understanding_level ?? -1) - (b.understanding_level ?? -1);
      } else {
        cmp = (new Date(a.created_at).getTime() || 0) - (new Date(b.created_at).getTime() || 0);
      }
      return order === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [items, searchText, categoryFilter, repoFilter, orderBy, order]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={fullScreenDialog}>
      <DialogTitle>学習記録の一覧</DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          <TextField
            size="small"
            placeholder="タイトル・本文・タグで絞り込み"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ flex: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Autocomplete
            size="small"
            sx={{ minWidth: 200 }}
            options={["all", ...categories.map((cat) => cat.name)]}
            getOptionLabel={(option) => (option === "all" ? "すべて" : option)}
            value={categoryFilter || "all"}
            onChange={(_event, newValue) => setCategoryFilter(newValue || "all")}
            disableClearable
            renderInput={(params) => <TextField {...params} label="カテゴリー" />}
          />
          {showRepoFilter && (
            <Autocomplete
              size="small"
              sx={{ minWidth: 200 }}
              options={["all", ...repoOptions]}
              getOptionLabel={(option) => (option === "all" ? "すべて" : option)}
              value={repoFilter}
              onChange={(_event, newValue) => setRepoFilter(newValue || "all")}
              disableClearable
              renderInput={(params) => <TextField {...params} label="リポジトリ" />}
            />
          )}
          {onAddNew && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onAddNew}
              sx={{ flexShrink: 0 }}
            >
              新規追加
            </Button>
          )}
        </Box>

        {filteredSorted.length === 0 ? (
          <Typography sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>
            条件に一致する学習記録がありません。
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 480 }}>
            {/* minWidthを指定し、狭い画面では列を潰さず横スクロールさせる
                （指定なしだと日本語の見出しが1文字ずつ折り返されてしまう） */}
            <Table stickyHeader size="small" sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell sortDirection={orderBy === "title" ? order : false} sx={{ whiteSpace: "nowrap" }}>
                    <TableSortLabel
                      active={orderBy === "title"}
                      direction={orderBy === "title" ? order : "asc"}
                      onClick={() => handleSort("title")}
                    >
                      タイトル
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === "category_name" ? order : false} sx={{ whiteSpace: "nowrap" }}>
                    <TableSortLabel
                      active={orderBy === "category_name"}
                      direction={orderBy === "category_name" ? order : "asc"}
                      onClick={() => handleSort("category_name")}
                    >
                      カテゴリー
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>タグ</TableCell>
                  <TableCell
                    align="center"
                    sortDirection={orderBy === "understanding_level" ? order : false}
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    <TableSortLabel
                      active={orderBy === "understanding_level"}
                      direction={orderBy === "understanding_level" ? order : "asc"}
                      onClick={() => handleSort("understanding_level")}
                    >
                      理解度
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === "created_at" ? order : false} sx={{ whiteSpace: "nowrap" }}>
                    <TableSortLabel
                      active={orderBy === "created_at"}
                      direction={orderBy === "created_at" ? order : "asc"}
                      onClick={() => handleSort("created_at")}
                    >
                      更新日
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSorted.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ fontWeight: 600, maxWidth: 220 }}>
                      {item.title}
                    </TableCell>
                    <TableCell>
                      {item.category_name && (
                        <Chip label={item.category_name} size="small" color="primary" />
                      )}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {item.tags.length > 0 ? (
                          item.tags.map((tag) => (
                            <Chip key={tag} label={`#${tag}`} size="small" variant="outlined" />
                          ))
                        ) : (
                          <Typography variant="caption" sx={{ color: "text.disabled" }}>
                            -
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      {item.understanding_level == null ? (
                        <Typography variant="caption" sx={{ color: "text.disabled" }}>
                          未設定
                        </Typography>
                      ) : (
                        <Rating value={item.understanding_level} readOnly size="small" />
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {formatDate(item.created_at)}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      {parseAttachments(item.github_path, item.commit_sha).map((att, index) => (
                        <Tooltip key={`${att.path}-${index}`} title={`ファイルを見る（${att.path.split("/").pop()}）`}>
                          <IconButton size="small" onClick={() => onViewFile(att.path, att.sha)}>
                            <DescriptionOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ))}
                      {onPublish && (
                        <Tooltip title="記事化">
                          <IconButton size="small" onClick={() => onPublish(item)}>
                            <ArticleOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="編集">
                        <IconButton size="small" onClick={() => onEdit(item.id)}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="削除">
                        <IconButton size="small" color="error" onClick={() => onDelete(item.id)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {filteredSorted.length} / {items.length} 件を表示
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          とじる
        </Button>
      </DialogActions>
    </Dialog>
  );
}
