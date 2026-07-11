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
  Tooltip,
  useMediaQuery,
  Typography,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import LocalLibraryIcon from "@mui/icons-material/LocalLibrary";
import UpdateIcon from "@mui/icons-material/Update";
import ArticleIcon from "@mui/icons-material/Article";
import CategoryIcon from "@mui/icons-material/Category";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import TuneIcon from "@mui/icons-material/Tune";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import BackButton from "./BackButton";

export const DRAWER_WIDTH_EXPANDED = 240;
export const DRAWER_WIDTH_COLLAPSED = 68;

interface GitHubFile {
  path: string;
}

interface FileNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
}

interface LeftToolBarProps {
  onAddNewLearning: () => void;
  onAddNewCategory: () => void;
  onAddNewTag: () => void;
  onAddNewFolder: () => void;
  onManage: () => void;
  onFileSelect: (path: string) => void;
  files: GitHubFile[];
  loading: boolean;
  // 省データモードなどでまだ取得していない場合に、取得を促すボタンを出す
  filesNotFetched?: boolean;
  onRequestFiles?: () => void;
  // スマホの左メニュー開閉（親のヘッダーのハンバーガーから制御）
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  // PCでの折りたたみ（アイコンのみのrailモード）
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

// --- ファイルリストをフォルダー構造に変換 ---
function buildFileTree(files: GitHubFile[]): FileNode[] {
  const root: Record<string, any> = {};

  files.forEach(({ path }) => {
    const parts = path.split("/");
    let current = root;

    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = {
          name: part,
          path: parts.slice(0, index + 1).join("/"),
          type: index === parts.length - 1 ? "file" : "folder",
          children: {},
        };
      }
      current = current[part].children;
    });
  });

  function convert(node: any): FileNode[] {
    return Object.values(node)
      .map((n: any) => ({
        name: n.name,
        path: n.path,
        type: n.type,
        children:
          n.type === "folder" ? convert(n.children) : undefined,
      }))
      .sort((a: FileNode, b: FileNode) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === "folder" ? -1 : 1;
      });
  }

  return convert(root);
}

// --- 再帰的にツリーを描画するコンポーネント ---
function FileTree({
  nodes,
  onFileSelect,
  depth = 0, // 階層の深さを追加
}: {
  nodes: FileNode[];
  onFileSelect: (path: string) => void;
  depth?: number;
}) {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (path: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const indent = 2 + depth * 2; // 階層ごとにインデントを増やす (2,4,6,...)


  return (
    <>
      {nodes.map((node) =>
        node.type === "folder" ? (
          <Box key={node.path}>
            <ListItemButton onClick={() => toggleFolder(node.path)} sx={{ pl: indent }}>
              <ListItemIcon>
                {openFolders[node.path] ? <FolderOpenIcon /> : <FolderIcon />}
              </ListItemIcon>
              <ListItemText primary={node.name} />
              {openFolders[node.path] ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>

            <Collapse in={openFolders[node.path]} timeout="auto" unmountOnExit>
              <FileTree
                nodes={node.children || []}
                onFileSelect={onFileSelect}
                depth={depth + 1} // 再帰呼び出し時に階層を1つ深く
              />
            </Collapse>
          </Box>
        ) : (
          <ListItemButton
            key={node.path}
            sx={{ pl: indent + 2 }} // ファイルは少し余分に
            onClick={() => onFileSelect(node.path)}
          >
            <ListItemIcon>
              <ArticleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={node.name}
              primaryTypographyProps={{
                style: {
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                },
              }}
            />
          </ListItemButton>
        )
      )}
    </>
  );
}

export default function LeftToolBar({
  onAddNewLearning,
  onAddNewCategory,
  onAddNewTag,
  onAddNewFolder,
  onManage,
  onFileSelect,
  files,
  loading,
  filesNotFetched = false,
  onRequestFiles,
  mobileOpen: mobileOpenProp,
  onMobileClose,
  collapsed = false,
  onToggleCollapsed,
}: LeftToolBarProps) {
  const [open1, setOpen1] = useState(true);
  const [open2, setOpen2] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width:600px)");
  const navigate = useNavigate();

  // 親から制御されていればそれを使い、なければ内部状態でフォールバック
  const mobileOpen = mobileOpenProp ?? internalMobileOpen;
  const closeMobile = onMobileClose ?? (() => setInternalMobileOpen(false));

  const filteredFiles = files.filter((file) =>
    file.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fileTree = buildFileTree(filteredFiles);

  // PCで折りたたんだときの、アイコンだけのミニ表示
  const collapsedContent = (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 1 }}>
      <Tooltip title="展開する" placement="right">
        <IconButton onClick={onToggleCollapsed} size="small" sx={{ mb: 1 }}>
          <ChevronRightIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="トップに戻る" placement="right">
        <IconButton onClick={() => navigate("/")} sx={{ mb: 1 }}>
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Divider sx={{ width: "70%", mb: 1 }} />
      <Tooltip title="新規学習内容" placement="right">
        <IconButton onClick={onAddNewLearning} sx={{ mb: 0.5 }}>
          <LocalLibraryIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="新規カテゴリー" placement="right">
        <IconButton onClick={onAddNewCategory} sx={{ mb: 0.5 }}>
          <CategoryIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="新規タグ" placement="right">
        <IconButton onClick={onAddNewTag} sx={{ mb: 0.5 }}>
          <LocalOfferIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="新規フォルダー" placement="right">
        <IconButton onClick={onAddNewFolder} sx={{ mb: 0.5 }}>
          <FolderOpenIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="カテゴリー・タグの管理" placement="right">
        <IconButton onClick={onManage} sx={{ mb: 0.5 }}>
          <TuneIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="最新データ編集（展開して検索）" placement="right">
        <IconButton onClick={onToggleCollapsed} sx={{ mb: 0.5 }}>
          <UpdateIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const drawerContent = (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <BackButton />
        {!isMobile && onToggleCollapsed && (
          <Tooltip title="折りたたむ">
            <IconButton onClick={onToggleCollapsed} sx={{ ml: "auto", mr: 1 }} size="small">
              <ChevronLeftIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
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
            <ListItemButton sx={{ pl: 4 }} onClick={onAddNewTag}>
              <ListItemIcon>
                <LocalOfferIcon />
              </ListItemIcon>
              <ListItemText primary="新規タグ" />
            </ListItemButton>
            <ListItemButton sx={{ pl: 4 }} onClick={onAddNewFolder}>
              <ListItemIcon>
                <FolderOpenIcon />
              </ListItemIcon>
              <ListItemText primary="新規フォルダー" />
            </ListItemButton>
          </List>
        </Collapse>

        {/* --- カテゴリー・タグの管理（編集・削除） --- */}
        <ListItemButton onClick={onManage}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <TuneIcon />
          </ListItemIcon>
          <ListItemText
            primary="カテゴリー・タグの管理"
            primaryTypographyProps={{ noWrap: true, fontSize: "0.9rem" }}
          />
        </ListItemButton>

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
            ) : filesNotFetched && onRequestFiles ? (
              <Box sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
                  省データモードのため、ファイル一覧はまだ取得していません。
                </Typography>
                <Button size="small" variant="outlined" onClick={onRequestFiles}>
                  取得する
                </Button>
              </Box>
            ) : (
              <FileTree nodes={fileTree} onFileSelect={onFileSelect} />
            )}
          </List>
        </Collapse>
      </List>
    </Box>
  );

  const effectiveWidth = collapsed && !isMobile ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED;

  return (
    <>
      {/* Drawer表示（スマホのヘッダーは親[LearningContent]に統合済み） */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={closeMobile}
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH_EXPANDED,
              boxSizing: "border-box",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: effectiveWidth,
            flexShrink: 0,
            whiteSpace: "nowrap",
            "& .MuiDrawer-paper": {
              width: effectiveWidth,
              boxSizing: "border-box",
              overflowX: "hidden",
              transition: (theme) =>
                theme.transitions.create("width", {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
            },
          }}
        >
          {collapsed ? collapsedContent : drawerContent}
        </Drawer>
      )}
    </>
  );
}
