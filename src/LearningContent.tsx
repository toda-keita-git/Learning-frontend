import React, { useState, useEffect, useContext } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { Container, Button } from "@mui/material";
import { MessageLeft, MessageRight } from "./component/Message";
import { TextInputLearning } from "./component/TextInputLearning";
import { SearchDialog } from "./component/SearchDialog";
import Toolbar from "@mui/material/Toolbar";
import LeftToolBar from "./component/LeftToolBar";
import Typography from "@mui/material/Typography";
import CssBaseline from "@mui/material/CssBaseline";
import AppBar from "@mui/material/AppBar";
import {
  learningApi,
  TagsApi,
  LearningTagApi,
  CategoriesApi,
  createLearningApi,
  updateLearningApi,
  deleteLearningApi,
  createCategoryApi,
} from "./component/Api";
import NewLearningDialog from "./component/NewLearningDialog";
import { AuthContext } from "./Context";
import GitHubFileViewerDialog from "./component/GitHubFileViewerDialog";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import NewCategoryDialog from "./component/NewCategoryDialog";
import { decodeBase64Text } from "./component/decodeBase64";

interface LearningRecord {
  id: number;
  title: string;
  explanatory_text: string;
  understanding_level: number;
  reference_url: string | null;
  created_at: string;
  category_name: string;
  category_id?: number | string | null;
  tags: string[];
  github_path: string;
  commit_sha: string | null;
  user_id: number;
}

interface LearningTag {
  learning_id: number;
  tag_id: number;
}

interface Tag {
  id: number;
  name: string;
}

interface Categories {
  id: number;
  name: string;
}

interface GitHubFile {
  path: string;
}

type Message = {
  id: number;
  text: string;
  timestamp: string;
  type: "left" | "right";
  photoURL?: string;
  displayName?: string;
};

export default function LearningContent() {
  const { octokit, isAuthenticated, login, userId, repoName, githubLogin } =
    useContext(AuthContext);
  const [learningData, setLearningData] = useState<LearningRecord[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [allCategories, setAllCategories] = useState<Categories[]>([]);
  const [githubFiles, setGithubFiles] = useState<GitHubFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [isViewerEditable, setIsViewerEditable] = useState(false);
  const [viewingContent, setViewingContent] = useState({
    path: "",
    content: "",
    sha: "",
  });

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "こんにちは！これは学習内容検索botです。",
      timestamp: new Date().toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "left",
      photoURL:
        "https://lh3.googleusercontent.com/a-/AOh14Gi4vkKYlfrbJ0QLJTg_DLjcYyyK7fYoWRpz2r4s=s96-c",
      displayName: "システム",
    },
  ]);

  /** =============================
   * GitHubリポジトリツリーを取得
   ============================== */
  const fetchGitHubFiles = async () => {
    setFilesLoading(true);
    if (!octokit || !githubLogin || !repoName) return;

    try {
      const response = await octokit.git.getTree({
        owner: githubLogin,
        repo: repoName,
        tree_sha: "main",
        recursive: "true",
      });

      const files = response.data.tree
        .filter((item: any) => item.type === "blob")
        .map((item: any) => ({ path: item.path }));

      setGithubFiles(files);
    } catch (err) {
      console.error("Failed to fetch repository tree:", err);
    } finally {
      setFilesLoading(false);
    }
  };

  /** =============================
   * GitHubファイルを取得してDialogに表示
   ============================== */
  const fetchFileForDialog = async (path: string) => {
    if (!octokit || !githubLogin || !repoName) return null;

    try {
      const res = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
        owner: githubLogin,
        repo: repoName,
        path,
      });

      const data = res.data as any;
      const ext = path.split(".").pop() || "";
      const isImage = ["png", "jpg", "jpeg", "gif", "bmp", "svg", "ico", "webp"].includes(ext);

      let content = "";
      if (isImage) {
        content = `data:image/${ext};base64,${data.content.replace(/\r?\n/g, "")}`;
      } else {
        content = decodeBase64Text(data.content);
      }

      return { content, sha: data.sha };
    } catch (e) {
      console.error("Error fetching file:", e);
      return null;
    }
  };

  /** =============================
   * GitHubファイル更新
   ============================== */
  const handleUpdateFile = async (path: string, content: string, sha: string) => {
    if (!octokit || !githubLogin || !repoName) return null;
    try {
      const contentBase64 = btoa(unescape(encodeURIComponent(content)));

      const res = await octokit.repos.createOrUpdateFileContents({
        owner: githubLogin,
        repo: repoName,
        path,
        message: `Update ${path}`,
        content: contentBase64,
        sha,
        branch: "main",
      });

      alert("ファイルを更新しました。");
      setViewerOpen(false);
      return res.data.commit.sha;
    } catch (e: any) {
      alert(`ファイルの更新に失敗しました: ${e.message}`);
      return null;
    }
  };

  /** =============================
   * ファイルを閲覧
   ============================== */
  const handleViewFile = async (path: string, editable = false, commitSha?: string) => {
    if (!octokit || !githubLogin || !repoName) return;

    try {
      const res = await octokit.repos.getContent({
        owner: githubLogin,
        repo: repoName,
        path,
        ref: commitSha,
      });

      if (!("content" in res.data)) throw new Error("ファイル形式ではありません");

      const content = decodeBase64Text(res.data.content);
      setViewingContent({ path, content, sha: res.data.sha });
      setIsViewerEditable(editable && !commitSha);
      setViewerOpen(true);
    } catch (e: any) {
      alert(`ファイル取得エラー: ${e.message}`);
    }
  };

  /** =============================
   * 初回ロード時処理
   ============================== */
  useEffect(() => {
    if (userId) {
      refetchData();
      fetchGitHubFiles();
    }
  }, [userId]);

  /** =============================
   * 学習データ再取得
   ============================== */
  const refetchData = async () => {
    try {
      const [learnings, tags, learningTags, categories] = await Promise.all([
        learningApi(userId ?? 0),
        TagsApi(),
        LearningTagApi(),
        CategoriesApi(),
      ]);

      const tagMap = new Map(tags.map((t: Tag) => [t.id, t.name]));
      const tagLink = new Map<number, number[]>();
      learningTags.forEach((lt: LearningTag) => {
        if (!tagLink.has(lt.learning_id)) tagLink.set(lt.learning_id, []);
        tagLink.get(lt.learning_id)!.push(lt.tag_id);
      });

      const processed = learnings.map((l: any) => ({
        ...l,
        tags: (tagLink.get(l.id) || []).map((tid) => tagMap.get(tid) ?? ""),
      }));

      setLearningData(processed);
      setAllTags(tags);
      setAllCategories(categories);
    } catch (e) {
      console.error("refetchData error:", e);
    }
  };

  /** =============================
   * ファイル選択時
   ============================== */
  const handleFileSelect = (path: string) => handleViewFile(path, true);

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <LeftToolBar files={githubFiles} onFileSelect={handleFileSelect} loading={filesLoading} />

      <Box component="main" sx={{ flexGrow: 1, bgcolor: "background.default", p: 3 }}>
        <Toolbar />
        <Container>
          <Paper sx={{ p: 2, height: "80vh", overflow: "auto" }}>
            <Typography variant="h6" gutterBottom>
              学習記録チャット
            </Typography>
            {/* チャット表示部分 */}
            {messages.map((m) =>
              m.type === "left" ? (
                <MessageLeft key={m.id} message={m} />
              ) : (
                <MessageRight key={m.id} message={m} />
              )
            )}
          </Paper>
        </Container>
      </Box>

      {/* GitHubファイルビューワ */}
      <GitHubFileViewerDialog
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        content={viewingContent}
        editable={isViewerEditable}
        onSave={handleUpdateFile}
      />
    </Box>
  );
}
