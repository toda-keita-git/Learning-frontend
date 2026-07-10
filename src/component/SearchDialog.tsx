import React, { useState, useEffect } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from "@mui/material";
import { TagsApi, CategoriesApi } from "./Api";

interface CategoriesRecord {
  id: number;
  name: string;
}

interface HashTagsRecord {
  id: number;
  name: string;
}

type SearchDialogProps = {
  open: boolean;
  onClose: () => void;
  onApply: (filters: {
    hashtags: string[];
    category: string;
    sort: string;
  }) => void;
  currentFilters: { hashtags: string[]; category: string; sort: string };
};

export const SearchDialog: React.FC<SearchDialogProps> = ({
  open,
  onClose,
  onApply,
  currentFilters,
}) => {
  const [hashtags, setHashtags] = useState<string[]>(currentFilters.hashtags);
  const [category, setCategory] = useState<string>(currentFilters.category);
  const [sort, setSort] = useState<string>(currentFilters.sort);

  const [allHashtags, setAllHashtagsData] = useState<HashTagsRecord[]>([]);
  const [allCategories, setAllCategoriesData] = useState<CategoriesRecord[]>([]);

  // ダイアログが開かれたときに現在のフィルタを同期 + APIデータを再取得
  useEffect(() => {
  if (open) {
    setHashtags(currentFilters.hashtags);
    setCategory(currentFilters.category);
    setSort(currentFilters.sort);

    TagsApi()
      .then((res) => setAllHashtagsData(res || []))
      .catch((err) => console.error("ハッシュタグ取得失敗:", err));

    CategoriesApi()
      .then((res) => setAllCategoriesData(res || []))
      .catch((err) => console.error("カテゴリー取得失敗:", err));
  }
}, [open, currentFilters]);


  const handleApply = () => {
    onApply({ hashtags, category, sort });
    onClose();
  };

  // 選択済みハッシュタグオブジェクトを復元
  const selectedHashtagObjects = allHashtags.filter((option) =>
    hashtags.includes(option.name)
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>詳細検索</DialogTitle>
      <DialogContent>
        {/* 🔹ハッシュタグ選択 */}
        <FormControl fullWidth sx={{ mt: 2, mb: 3 }}>
          <Autocomplete
            multiple
            limitTags={2}
            id="multiple-limit-tags"
            options={allHashtags}
            getOptionLabel={(option) => option.name}
            value={selectedHashtagObjects}
            onChange={(_event, newValue) => {
              setHashtags(newValue.map((option) => option.name));
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="ハッシュタグ"
                placeholder="ハッシュタグを選択"
              />
            )}
          />
        </FormControl>

        {/* 🔹カテゴリー選択 */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="category-select-label">カテゴリー</InputLabel>
          <Select
            labelId="category-select-label"
            value={category}
            label="カテゴリー"
            onChange={(e: SelectChangeEvent) => setCategory(e.target.value)}
          >
            <MenuItem value="all">すべて</MenuItem>
            {allCategories.map((cat) => (
              <MenuItem key={cat.id} value={cat.name}>
                {cat.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 🔹ソート選択 */}
        <FormControl fullWidth>
          <InputLabel id="sort-select-label">ソート</InputLabel>
          <Select
            labelId="sort-select-label"
            value={sort}
            label="ソート"
            onChange={(e: SelectChangeEvent) => setSort(e.target.value)}
          >
            <MenuItem value="name-asc">タイトル (昇順)</MenuItem>
            <MenuItem value="name-desc">タイトル (降順)</MenuItem>
            <MenuItem value="understanding-desc">理解度が高い順</MenuItem>
            <MenuItem value="understanding-asc">理解度が低い順</MenuItem>
            <MenuItem value="date-desc">更新日が新しい順</MenuItem>
            <MenuItem value="date-asc">更新日が古い順</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button onClick={handleApply} variant="contained">
          適用
        </Button>
      </DialogActions>
    </Dialog>
  );
};
