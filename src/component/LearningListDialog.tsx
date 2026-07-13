import { useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
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
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import type { SelectChangeEvent } from "@mui/material";

interface LearningListItem {
  id: number;
  title: string;
  explanatory_text: string;
  understanding_level: number;
  created_at: string;
  category_name: string;
  tags: string[];
  reference_url: string | null;
  github_path: string;
  commit_sha: string | null;
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
}: LearningListDialogProps) {
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [orderBy, setOrderBy] = useState<OrderBy>("created_at");
  const [order, setOrder] = useState<Order>("desc");

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
      const matchesText =
        !lower ||
        item.title.toLowerCase().includes(lower) ||
        item.tags.some((tag) => tag.toLowerCase().includes(lower));
      return matchesCategory && matchesText;
    });

    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      if (orderBy === "title" || orderBy === "category_name") {
        cmp = a[orderBy].localeCompare(b[orderBy], "ja");
      } else if (orderBy === "understanding_level") {
        cmp = a.understanding_level - b.understanding_level;
      } else {
        cmp = (new Date(a.created_at).getTime() || 0) - (new Date(b.created_at).getTime() || 0);
      }
      return order === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [items, searchText, categoryFilter, orderBy, order]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>学習記録の一覧</DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          <TextField
            size="small"
            placeholder="タイトル・タグで絞り込み"
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
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="list-category-filter-label">カテゴリー</InputLabel>
            <Select
              labelId="list-category-filter-label"
              label="カテゴリー"
              value={categoryFilter}
              onChange={(e: SelectChangeEvent) => setCategoryFilter(e.target.value)}
            >
              <MenuItem value="all">すべて</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.name}>
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {filteredSorted.length === 0 ? (
          <Typography sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>
            条件に一致する学習記録がありません。
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 480 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sortDirection={orderBy === "title" ? order : false}>
                    <TableSortLabel
                      active={orderBy === "title"}
                      direction={orderBy === "title" ? order : "asc"}
                      onClick={() => handleSort("title")}
                    >
                      タイトル
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === "category_name" ? order : false}>
                    <TableSortLabel
                      active={orderBy === "category_name"}
                      direction={orderBy === "category_name" ? order : "asc"}
                      onClick={() => handleSort("category_name")}
                    >
                      カテゴリー
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>タグ</TableCell>
                  <TableCell
                    align="center"
                    sortDirection={orderBy === "understanding_level" ? order : false}
                  >
                    <TableSortLabel
                      active={orderBy === "understanding_level"}
                      direction={orderBy === "understanding_level" ? order : "asc"}
                      onClick={() => handleSort("understanding_level")}
                    >
                      理解度
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === "created_at" ? order : false}>
                    <TableSortLabel
                      active={orderBy === "created_at"}
                      direction={orderBy === "created_at" ? order : "asc"}
                      onClick={() => handleSort("created_at")}
                    >
                      更新日
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSorted.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ fontWeight: 600, maxWidth: 220 }}>
                      {item.title}
                    </TableCell>
                    <TableCell>
                      <Chip label={item.category_name} size="small" color="primary" />
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
                      <Rating value={item.understanding_level} readOnly size="small" />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {formatDate(item.created_at)}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      {item.github_path && (
                        <Tooltip title="ファイルを見る">
                          <IconButton
                            size="small"
                            onClick={() => onViewFile(item.github_path, item.commit_sha)}
                          >
                            <DescriptionOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
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
