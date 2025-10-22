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

// APIデータの型定義を実際のデータ構造に合わせる
interface CategoriesRecord {
  id: number;
  name: string;
}

// APIデータの型定義を実際のデータ構造に合わせる
interface HashTagsRecord {
  id: number;
  name: string;
}

// APIデータの型定義を実際のデータ構造に合わせる
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

  const [allCategories, setAllCategoriesData] = useState<CategoriesRecord[]>(
    []
  );

  // コンポーネントが最初に描画された時にAPIからデータを取得する
  useEffect(() => {
    const fetchData = async () => {
      const data = await CategoriesApi();
      if (data) {
        setAllCategoriesData(data);
      }
    };
    fetchData();
  }, []); // 空の依存配列[]を指定することで、初回レンダリング時に一度だけ実行される

  const [allHashtags, setAllHashtagsData] = useState<HashTagsRecord[]>([]);

  // コンポーネントが最初に描画された時にAPIからデータを取得する
  useEffect(() => {
    const fetchData = async () => {
      const data = await TagsApi();
      if (data) {
        setAllHashtagsData(data);
      }
    };
    fetchData();
  }, []); // 空の依存配列[]を指定することで、初回レンダリング時に一度だけ実行される

  // ダイアログが開かれたときに現在のフィルタを同期する
  useEffect(() => {
    if (open) {
      setHashtags(currentFilters.hashtags);
      setCategory(currentFilters.category);
      setSort(currentFilters.sort);
    }
  }, [open, currentFilters]);

  const handleApply = () => {
    onApply({ hashtags, category, sort });
    onClose();
  };

  // Autocompleteのvalue propのために、string配列から対応するオブジェクト配列を見つける
  const selectedHashtagObjects = allHashtags.filter((option) =>
    hashtags.includes(option.name)
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>詳細検索</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 2, mb: 3 }}>
          <Autocomplete
            multiple
            limitTags={2}
            id="multiple-limit-tags"
            options={allHashtags}
            getOptionLabel={(option) => option.name}
            value={selectedHashtagObjects}
            onChange={(event, newValue) => {
              // 選択されたオブジェクトのtitleだけをstateに保存
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
              <MenuItem key={cat["name"]} value={cat["name"]}>
                {cat["name"]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel id="sort-select-label">ソート</InputLabel>
          <Select
            labelId="sort-select-label"
            value={sort}
            label="ソート"
            onChange={(e: SelectChangeEvent) => setSort(e.target.value)}
          >
            <MenuItem value="name-asc">ファイル名 (昇順)</MenuItem>
            <MenuItem value="name-desc">ファイル名 (降順)</MenuItem>
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
