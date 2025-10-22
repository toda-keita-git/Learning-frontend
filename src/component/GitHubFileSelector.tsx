import React, { useState, useEffect, useContext } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  IconButton,
  DialogActions,
  Button,
  Box,
  Typography,
  ListItemIcon,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import ArticleIcon from "@mui/icons-material/Article";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { AuthContext } from "../Context";
import.meta.env;

const owner = import.meta.env.VITE_REPO_OWNER;
const repoName = import.meta.env.VITE_REPO_NAME;

interface Props {
  open: boolean;
  onClose: () => void;
  onFileSelect: (path: string) => void;
}

const GitHubFileSelector: React.FC<Props> = ({
  open,
  onClose,
  onFileSelect,
}) => {
  const { octokit } = useContext(AuthContext);
  const [currentPath, setCurrentPath] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (open && octokit) {
      const fetchContent = async () => {
        try {
          const { data } = await octokit.repos.getContent({
            owner: owner,
            repo: repoName,
            path: currentPath,
          });
          const sortedData = (Array.isArray(data) ? data : [data]).sort(
            (a, b) => {
              if (a.type === b.type) return a.name.localeCompare(b.name);
              return a.type === "dir" ? -1 : 1;
            }
          );
          setItems(sortedData);
        } catch (error) {
          console.error("GitHubコンテンツの取得に失敗しました", error);
        }
      };
      fetchContent();
    }
  }, [currentPath, open, octokit]);

  const handleItemClick = (item: any) => {
    if (item.type === "dir") {
      setHistory([...history, currentPath]);
      setCurrentPath(item.path);
    }
  };
  const handleBack = () => {
    const prevPath = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setCurrentPath(prevPath);
  };
  const handleSelect = (item: any) => {
    onFileSelect(item.path);
  };

  useEffect(() => {
    if (open) {
      setCurrentPath("");
      setHistory([]);
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {history.length > 0 && (
            <IconButton onClick={handleBack} edge="start">
              <ArrowBackIcon />
            </IconButton>
          )}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, ml: 1 }}>
            ファイルを選択
          </Typography>
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ ml: 1, mt: 1 }}
        >
          /{currentPath}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <List>
          {items.map((item) => (
            <ListItem
              key={item.sha}
              secondaryAction={
                <Button size="small" onClick={() => handleSelect(item)}>
                  選択
                </Button>
              }
            >
              <ListItemIcon
                onClick={() => handleItemClick(item)}
                sx={{ cursor: item.type === "dir" ? "pointer" : "default" }}
              >
                {item.type === "dir" ? <FolderIcon /> : <ArticleIcon />}
              </ListItemIcon>
              <ListItemText
                primary={item.name}
                onClick={() => handleItemClick(item)}
                sx={{ cursor: item.type === "dir" ? "pointer" : "default" }}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
      </DialogActions>
    </Dialog>
  );
};

export default GitHubFileSelector;
