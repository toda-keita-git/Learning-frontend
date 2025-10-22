import * as React from "react";
// ★ useStateとuseEffectをインポート
import { useState } from "react";
import BackButton from "./BackButton";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Collapse from "@mui/material/Collapse";
import AddIcon from "@mui/icons-material/Add";
import LocalLibraryIcon from "@mui/icons-material/LocalLibrary";
import UpdateIcon from "@mui/icons-material/Update";
// ★ TextField, Box, CircularProgress, ArticleIconをインポート
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import ArticleIcon from "@mui/icons-material/Article";
import CategoryIcon from "@mui/icons-material/Category";

const drawerWidth = 240;

// ★ GitHubから取得するファイルの型定義
interface GitHubFile {
  path: string;
}

// ★ 親コンポーネントから受け取るpropsの型定義を修正
interface LeftToolBarProps {
  onAddNewLearning: () => void;
  onAddNewCategory: () => void;
  onFileSelect: (path: string) => void; // ファイル選択時のコールバック
  files: GitHubFile[]; // 親から受け取るファイルリスト
  loading: boolean; // 親から受け取るローディング状態
}

export default function LeftToolBar({
  onAddNewLearning,
  onAddNewCategory,
  onFileSelect,
  files, // propsとして受け取る
  loading, // propsとして受け取る
}: LeftToolBarProps) {
  const [open1, setOpen1] = React.useState(true);
  const handleClick_add = () => {
    setOpen1(!open1);
  };

  const [open2, setOpen2] = React.useState(true);
  const handleClick_GitHubFail = () => {
    setOpen2(!open2);
  };

  const [searchQuery, setSearchQuery] = useState("");

  // ★ 検索クエリに基づいてファイルをフィルタリング
  const filteredFiles = files.filter((file) =>
    file.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
        },
      }}
      variant="permanent"
      anchor="left"
    >
      <BackButton />
      <Divider />
      <List>
        {/* --- 「追加」セクション (変更なし) --- */}
        <ListItemButton onClick={handleClick_add}>
          <ListItemIcon>
            <AddIcon />
          </ListItemIcon>
          <ListItemText primary="追加" />
          {open1 ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={open1} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton sx={{ pl: 4 }} onClick={onAddNewLearning}>
              <ListItemIcon>
                <LocalLibraryIcon />
              </ListItemIcon>
              <ListItemText primary="新規学習内容" />
            </ListItemButton>
            {/* ... 他の追加項目 ... */}
          </List>
          <List component="div" disablePadding>
            <ListItemButton sx={{ pl: 4 }} onClick={onAddNewCategory}>
              <ListItemIcon>
                <CategoryIcon />
              </ListItemIcon>
              <ListItemText primary="新規カテゴリー" />
            </ListItemButton>
            {/* ... 他の追加項目 ... */}
          </List>
        </Collapse>

        {/* --- 「最新データ編集」セクション (ここから変更) --- */}
        <ListItemButton onClick={handleClick_GitHubFail}>
          <ListItemIcon>
            <UpdateIcon />
          </ListItemIcon>
          <ListItemText primary="最新データ編集" />
          {open2 ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={open2} timeout="auto" unmountOnExit>
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              id="outlined-uncontrolled"
              label="ファイル名で検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Box>
          <List
            component="div"
            disablePadding
            sx={{ maxHeight: 300, overflow: "auto" }}
          >
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              filteredFiles.map((file) => (
                <ListItemButton
                  key={file.path}
                  sx={{ pl: 4 }}
                  onClick={() => onFileSelect(file.path)}
                >
                  <ListItemIcon>
                    <ArticleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={file.path}
                    primaryTypographyProps={{
                      style: {
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      },
                    }}
                  />
                </ListItemButton>
              ))
            )}
          </List>
        </Collapse>
      </List>
    </Drawer>
  );
}
