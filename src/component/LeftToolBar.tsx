import * as React from "react";
import { useState } from "react";
import {
  Drawer,
  List,
  Divider,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  TextField,
  Box,
  CircularProgress,
  IconButton,
  AppBar,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import AddIcon from "@mui/icons-material/Add";
import LocalLibraryIcon from "@mui/icons-material/LocalLibrary";
import UpdateIcon from "@mui/icons-material/Update";
import ArticleIcon from "@mui/icons-material/Article";
import CategoryIcon from "@mui/icons-material/Category";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import BackButton from "./BackButton";

const drawerWidth = 240;

interface GitHubFile {
  path: string;
}

interface LeftToolBarProps {
  onAddNewLearning: () => void;
  onAddNewCategory: () => void;
  onFileSelect: (path: string) => void;
  files: GitHubFile[];
  loading: boolean;
}

export default function LeftToolBar({
  onAddNewLearning,
  onAddNewCategory,
  onFileSelect,
  files,
  loading,
}: LeftToolBarProps) {
  const [open1, setOpen1] = useState(true);
  const [open2, setOpen2] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width:600px)");

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const filteredFiles = files.filter((file) =>
    file.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const drawerContent = (
    <Box>
      <BackButton />
      <Divider />
      <List>
        {/* --- 追加セクション --- */}
        <ListItemButton onClick={() => setOpen1(!open1)}>
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
            <ListItemButton sx={{ pl: 4 }} onClick={onAddNewCategory}>
              <ListItemIcon>
                <CategoryIcon />
              </ListItemIcon>
              <ListItemText primary="新規カテゴリー" />
            </ListItemButton>
          </List>
        </Collapse>

        {/* --- GitHubファイル編集セクション --- */}
        <ListItemButton onClick={() => setOpen2(!open2)}>
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
                  onClick={() => {
                    onFileSelect(file.path);
                    if (isMobile) setMobileOpen(false); // モバイルなら自動で閉じる
                  }}
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
    </Box>
  );

  return (
    <>
      {/* モバイル用 AppBar */}
      {isMobile && (
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              Learning Manager
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Drawer表示 */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  );
}
