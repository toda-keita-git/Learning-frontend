import React, { useState, useEffect, useContext } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { Button } from "@mui/material";
import Chip from "@mui/material/Chip";
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
import GitHubFolderSelector from "./component/GitHubFolderSelector";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import GitHubIcon from "@mui/icons-material/GitHub";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import CreateNewFolderOutlinedIcon from "@mui/icons-material/CreateNewFolderOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { ColorModeContext } from "./ColorModeContext";


const drawerWidth = 240;

// APIデータの型定義を実際のデータ構造に合わせる
interface LearningRecord {
  id: number;
  title: string;
  explanatory_text: string;
  understanding_level: number;
  reference_url: string | null; // nullの可能性も考慮
  created_at: string;
  category_name: string;
  category_id?: number | string | null;
  tags: string[];
  github_path: string;
  commit_sha: string | null;
  user_id: number;
}

// learning_tagsテーブルの型定義
interface LearningTag {
  learning_id: number;
  tag_id: number;
}

// tagsテーブルの型定義
interface Tag {
  id: number;
  name: string;
}

// categoriesテーブルの型定義
interface Categories {
  id: number;
  name: string;
}

// LeftToolBarから移動してきた型定義
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
  const { octokit,isAuthenticated, login, userId,repoName,githubLogin } = useContext(AuthContext);
  // APIから取得した学習記録データを保持するState
  const [learningData, setLearningData] = useState<LearningRecord[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]); // SearchDialogに渡すための全タグリスト
  const [allCategories, setAllCategories] = useState<Categories[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "こんにちは！記録した学びを検索できます。下の入力欄にタイトルやキーワードを入れて送信してください（左のメニューから絞り込み検索もできます）。",
      timestamp: new Date().toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "left",
      displayName: "システム",
    },
  ]);

  const auth = useContext(AuthContext);
  const colorMode = useContext(ColorModeContext); // ライト/ダーク切替

  const githubLoginSafe: string = (auth && auth.githubLogin) ?? "";
  const repoNameSafe: string = (auth && auth.repoName) ?? "";
  const tokenSafe: string = (auth.token) ?? "";

  const [isFolderSelectorOpen, setIsFolderSelectorOpen] = useState(false);
  const [_githubPath, setGithubPath] = useState("");

  const [_selectedFolderPath, setSelectedFolderPath] = useState("");



  // ← LeftToolBar から呼ばれる
  const handleFolderSelect = () => {
    setIsFolderSelectorOpen(true);
  };

  const fetchFileForDialog = async (
  path: string
): Promise<{
  content: string;
  sha: string;
  base64Content: string;
} | null> => {
  if (!octokit || !githubLogin || !repoName) {
    console.error("Octokitまたはリポジトリ情報がありません");
    return null;
  }

  try {
  const response = await octokit.request(
    "GET /repos/{owner}/{repo}/contents/{path}",
    {
      owner: githubLogin,
      repo: repoName,
      path,
    }
  );

  const data = response.data as any;
  const ext = path.split(".").pop()?.toLowerCase() || "";
  const isImageFile = ["png","jpg","jpeg","gif","bmp","svg","ico","webp"].includes(ext);

  let content = "";
  let base64Content = "";

  if (isImageFile) {
    if (data.content && data.content.trim() !== "") {
      // ✅ Base64データがある通常パターン
      base64Content = data.content.replace(/\r?\n/g, "");
      content = `data:image/${ext};base64,${base64Content}`;
    } else {
      // ⚠️ Base64が空（LFSや大容量ファイルなど）
      // ✅ 認証付きで blob を取得（プライベートリポジトリでも表示できる）
      try {
        const blob = await octokit.request(
          "GET /repos/{owner}/{repo}/git/blobs/{file_sha}",
          { owner: githubLogin, repo: repoName, file_sha: data.sha }
        );
        base64Content = ((blob.data as any).content || "").replace(/\r?\n/g, "");
        content = base64Content ? `data:image/${ext};base64,${base64Content}` : "";
      } catch (e) {
        console.error("画像の取得に失敗:", e);
        content = "";
      }
    }
  } else if (data.content) {
    // ✅ テキストの場合：Base64デコード
    try {
      const decoded = decodeURIComponent(
        Array.prototype.map
          .call(atob(data.content), (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      content = decoded;
    } catch (err) {
      console.error("テキストデコード失敗:", err);
      content = "テキストデコードに失敗しました。";
    }
  }

  return {
    content,
    sha: data.sha,
    base64Content: data.content,
  };
  } catch (error: any) {
    console.error("Error fetching file for dialog:", error);
    return null;
  }
};


  const [githubFiles, setGithubFiles] = useState<GitHubFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);

  // ★ GitHubからファイルリストを取得する関数 (旧fetchRepoFiles)
 const fetchGitHubFiles = async () => {
  setFilesLoading(true);

  if (!octokit || !githubLogin || !repoName) {
    console.error("Octokitまたはリポジトリ情報がありません");
    setFilesLoading(false);
    return;
  }

  try {
    // mainブランチのツリーを取得
    const response = await octokit.git.getTree({
      owner: githubLogin,
      repo: repoName,
      tree_sha: "main",
      recursive: "true"
    });

    const tree = response.data.tree;
    const fileList = tree
      .filter((item: any) => item.type === "blob")
      .map((item: any) => ({ path: item.path }));

    setGithubFiles(fileList);
  } catch (error) {
    console.error("Failed to fetch repository tree from GitHub:", error);
  } finally {
    setFilesLoading(false);
  }
};


 const handleUpdateFile = async (
  path: string,
  content: string,
  sha: string,
  options: { contentIsBase64?: boolean } = {}
) => {
  if (!octokit || !githubLogin || !repoName) {
    console.error("Octokitまたはリポジトリ情報がありません");
    return null;
  }

  try {
    // UTF-8対応でBase64に変換
    const contentBase64 = options.contentIsBase64
      ? content
      : btoa(unescape(encodeURIComponent(content)));

    const response = await octokit.repos.createOrUpdateFileContents({
      owner: githubLogin,
      repo: repoName,
      path: path,
      message: `Update ${path}`,
      content: contentBase64,
      sha: sha,
      branch: "main",
    });

    // 成功した場合、新しいコミットSHAを返す
    setViewerOpen(false);
    alert("ファイルを更新しました。");

    return response.data.commit.sha;
  } catch (error: any) {
    console.error("Failed to update file:", error);
    alert(`ファイルの更新に失敗しました。\n${error.message || error}`);
    return null;
  }
};


  const [viewerOpen, setViewerOpen] = useState<boolean>(false);
  const [viewingContent, setViewingContent] = useState({
    path: "",
    content: "",
    sha: "",
  });
  // ★★★ ビューアが編集可能かどうかを管理するStateを追加 ★★★
  const [isViewerEditable, setIsViewerEditable] = useState<boolean>(false);

  // ★ GitHubファイルの内容を取得する関数を修正
  const handleViewFile = async (
  path: string,
  editable: boolean,
  commitSha?: string
) => {
  if (!octokit || !githubLogin || !repoName) {
    console.error("Octokitまたはリポジトリ情報がありません");
    return;
  }

  try {
    const response = await octokit.repos.getContent({
      owner: githubLogin,
      repo: repoName,
      path: path,
      ref: commitSha, // コミットSHAがあればそのバージョンを取得
    });

    // GitHub APIの返却形式が単一ファイルの場合
    if (!("content" in response.data)) {
      throw new Error("取得したデータがファイル形式ではありません");
    }
    const ext = path.split(".").pop() || "";
    const isImageFile = ["png","jpg","jpeg","gif","bmp","svg","ico","webp"].includes(ext);
    const isHistorical = !!commitSha;

    let content = "";
    let base64Content = "";

    if (isImageFile) {
      if (response.data.content && response.data.content.trim() !== "") {
        // ✅ Base64データがある通常パターン
        base64Content = response.data.content.replace(/\r?\n/g, "");
        content = `data:image/${ext};base64,${base64Content}`;
      } else {
        // ⚠️ LFSや大容量ファイルなど：認証付きで blob を取得（プライベートリポジトリ対応）
        try {
          const blob = await octokit.request(
            "GET /repos/{owner}/{repo}/git/blobs/{file_sha}",
            { owner: githubLogin, repo: repoName, file_sha: response.data.sha }
          );
          const b64 = ((blob.data as any).content || "").replace(/\r?\n/g, "");
          content = b64 ? `data:image/${ext};base64,${b64}` : "";
        } catch (e) {
          console.error("画像の取得に失敗:", e);
          content = "";
        }
      }
    } else {
      // テキストの場合は通常のBase64デコード
      content = decodeBase64Text(response.data.content);
    }

    setViewingContent({
      path: response.data.path,
      content,
      sha: response.data.sha,
    });

    // 過去のコミットは編集不可
    setIsViewerEditable(editable && !isHistorical);
    setViewerOpen(true);
  } catch (error: any) {
    console.error("Failed to fetch file:", error);
    alert(`ファイルの取得に失敗しました。\n${error.message || error}`);
  }
};

  // ★ LeftToolBarでファイルが選択されたときの処理を定義
  const handleFileSelect = (path: string) => {
    // LeftToolBarから呼ばれた場合は「編集可能」としてビューアを開く
    handleViewFile(path, true);
  };

  // ★ クリックイベントをリッスンするuseEffectを修正（重複を削除し、内容を統合）
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // クリックされた要素またはその親から、data-action属性を持つ要素を探す
      const actionButton = target.closest<HTMLElement>("[data-action]");

      // actionButtonが見つかった場合のみ処理を実行
      if (actionButton) {
        // ★★★ action, id, path, commitShaはすべてactionButtonから取得する
        const action = actionButton.dataset.action;
        const id = actionButton.dataset.id;
        const path = actionButton.dataset.path;
        const commitSha = actionButton.dataset.commitSha;

        if (action === "toggle-detail") {
          // 詳細の開閉。対象要素の表示を切り替え、ボタンのラベルも更新する
          const targetId = actionButton.dataset.target;
          const detail = targetId ? document.getElementById(targetId) : null;
          if (detail) {
            const willOpen = detail.style.display === "none";
            detail.style.display = willOpen ? "block" : "none";
            actionButton.textContent = willOpen ? "詳細を閉じる ▲" : "詳細を見る ▼";
          }
        } else if (action === "view-file" && path) {
          // commitShaを渡して、特定のバージョンのファイルを表示する
          handleViewFile(path, false, commitSha);
        } else if (action === "edit" && id) {
          openEditDialog(parseInt(id, 10));
        } else if (action === "delete" && id) {
          openDeleteConfirm(parseInt(id, 10));
        }
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [learningData, allCategories]); // 依存配列を維持

  // ダイアログの開閉を管理するStateを追加
  const [openNewDialog, setOpenNewDialog] = React.useState(false);
  // ヘルプ（機能説明）ダイアログ
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  // ★ カテゴリー追加ダイアログ用のStateを追加
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    if (userId) {
      refetchData();
    }
  }, [userId]);

  // データを再取得するための関数
  const refetchData = async () => {
    try {
      const [learnings, tags, learningTags, categories] = await Promise.all([
        learningApi(userId ?? 0),
        TagsApi(),
        LearningTagApi(),
        CategoriesApi(),
      ]);

      // ★ APIからの戻り値が配列であることを保証する
      if (
        Array.isArray(learnings) &&
        Array.isArray(tags) &&
        Array.isArray(learningTags) &&
        Array.isArray(categories)
      ) {
        const tagMap = new Map<number, string>(
          tags.map((tag: Tag) => [tag.id, tag.name])
        );

        const learningIdToTagIdsMap = new Map<number, number[]>();
        learningTags.forEach((lt: LearningTag) => {
          if (!learningIdToTagIdsMap.has(lt.learning_id)) {
            learningIdToTagIdsMap.set(lt.learning_id, []);
          }
          learningIdToTagIdsMap.get(lt.learning_id)!.push(lt.tag_id);
        });

        // learningsが配列であることを確認してから .map を呼び出す
        const processedLearnings = learnings.map((learning: any) => {
          const tagIds = learningIdToTagIdsMap.get(learning.id) || [];
          const tagNames = tagIds
            .map((tagId) => tagMap.get(tagId) || "")
            .filter((name) => name);
          return {
            ...learning,
            tags: tagNames,
          };
        });

        setLearningData(processedLearnings);
        // 他のstateも必要であれば更新
        setAllTags(tags);
        setAllCategories(categories);
      } else {
        // データ取得に失敗した場合のフォールバック処理
        console.error("Failed to fetch some of the required data.");
        setLearningData([]); // エラー時はデータを空にするなど
      }
    } catch (error) {
      console.error("An error occurred during refetchData:", error);
    }
  };

  const messageEndRef = React.useRef<HTMLDivElement>(null);

  const [openSearchDialog, setOpenSearchDialog] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    hashtags: [] as string[],
    category: "all",
    sort: "name-asc",
  });

  // コンポーネントが最初に描画された時にAPIからデータを取得する
  useEffect(() => {
    const fetchData = async () => {
      // 4つのAPIを並行して呼び出し、すべてのデータが揃うのを待つ
      const [learnings, tags, learningTags, categories] = await Promise.all([
        learningApi(userId ?? 0),
        TagsApi(),
        LearningTagApi(),
        CategoriesApi(),
      ]);
      if (learnings && tags && learningTags && categories) {
        // 1. タグIDとタグ名をマッピングするオブジェクトを作成 (例: {1: 'PHP', 2: 'JavaScript'})
        const tagMap = new Map<number, string>(
          tags.map((tag: Tag) => [tag.id, tag.name])
        );

        // 2. 学習IDごとにタグIDの配列をマッピングするオブジェクトを作成 (例: {3: [4, 5], 5: [2]})
        const learningIdToTagIdsMap = new Map<number, number[]>();
        learningTags.forEach((lt: LearningTag) => {
          if (!learningIdToTagIdsMap.has(lt.learning_id)) {
            learningIdToTagIdsMap.set(lt.learning_id, []);
          }
          learningIdToTagIdsMap.get(lt.learning_id)!.push(lt.tag_id);
        });

        // 3. learningsデータに、具体的なタグ名の配列を追加する
        const processedLearnings = learnings.map((learning: any) => {
          const tagIds = learningIdToTagIdsMap.get(learning.id) || [];
          const tagNames = tagIds
            .map((tagId) => tagMap.get(tagId) || "")
            .filter((name) => name); // IDから名前に変換
          return {
            ...learning,
            tags: tagNames, // 'tags'プロパティとしてタグ名の配列を追加
          };
        });

        setLearningData(processedLearnings);
        setAllTags(tags); // SearchDialogで使うための全タグリストをStateに保存
        setAllCategories(categories); // 取得したカテゴリーデータをStateに保存
      }
    };
    fetchData();
    fetchGitHubFiles();
  }, [userId]); // 空の依存配列[]を指定することで、初回レンダリング時に一度だけ実行される

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleApplyFilters = (filters: {
    hashtags: string[];
    category: string;
    sort: string;
  }) => {
    setSearchFilters(filters);

    let filterSummary = "<b>検索条件が更新されました</b><br>";
    filterSummary += `カテゴリー: ${
      filters.category === "all" ? "すべて" : filters.category
    }<br>`;
    filterSummary += `ハッシュタグ: ${
      filters.hashtags.length > 0 ? filters.hashtags.join(", ") : "指定なし"
    }<br>`;
    filterSummary += `ソート: ${
      filters.sort === "name-asc" ? "ファイル名 (昇順)" : "ファイル名 (降順)"
    }`;

    const systemMessage: Message = {
      id: Date.now(),
      text: filterSummary,
      timestamp: new Date().toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "left",
      photoURL: "https://placehold.co/40x40/EFEFEF/AAAAAA?text=BOT",
      displayName: "システム",
    };
    setMessages((prev) => [...prev, systemMessage]);
  };

  // ★ 削除確認ダイアログ用のStateを追加
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  // ★ 編集対象のデータを保持するState
  const [editingItem, setEditingItem] = useState<LearningRecord | null>(null);

  // ★ 削除処理を実行する関数
  const handleDeleteLearning = async () => {
    if (deletingItemId === null) return;
    try {
      await deleteLearningApi(deletingItemId);
      setDeleteConfirmOpen(false);
      setDeletingItemId(null);
      refetchData(); // データを再取得して表示を更新
      // 削除成功のメッセージをチャットに追加
      setMessages((prev: Message[]) => [
        ...prev,
        {
          id: Date.now(),
          text: "学習記録を削除しました。",
          timestamp: new Date().toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          type: "left",
          photoURL: "https://placehold.co/40x40/EFEFEF/AAAAAA?text=BOT",
          displayName: "システム",
        },
      ]);
    } catch (error) {
      console.error("Failed to delete learning record:", error);
      alert("削除に失敗しました。");
    }
  };

  // ★ 削除ボタンがクリックされたときに確認ダイアログを開く関数
  const openDeleteConfirm = (id: number) => {
    setDeletingItemId(id);
    setDeleteConfirmOpen(true);
  };

  // ★ 新規カテゴリーダイアログを開くハンドラ
  const handleAddNewCategory = () => {
    setIsCategoryDialogOpen(true);
  };

  // ★ 新規カテゴリーを登録するハンドラ
  const handleCategorySubmit = async (categoryName: string) => {
    try {
      // APIを呼び出して新しいカテゴリーをバックエンドに保存
      await createCategoryApi({ name: categoryName });
      // 成功したら、全データを再取得して表示を更新
      await refetchData();

      // ダイアログを閉じる
      setIsCategoryDialogOpen(false);

      // チャットに成功メッセージを追加
      const systemMessage: Message = {
        id: Date.now(),
        text: `新しいカテゴリー「${categoryName}」を登録しました。`,
        timestamp: new Date().toLocaleTimeString("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: "left",
        photoURL: "https://placehold.co/40x40/EFEFEF/AAAAAA?text=BOT",
        displayName: "システム",
      };
      setMessages((prev) => [...prev, systemMessage]);
    } catch (error) {
      console.error("Failed to create category:", error);
      alert(`カテゴリーの登録に失敗しました: ${error}`);
    }
  };



  // ★ 新規・更新の両方を処理するハンドラ
  const handleSubmitLearning = async (submissionData: any) => {
    // submissionDataから learningData と editedFile を取り出す
    const { learningData, editedFile } = submissionData;

    try {
      let finalLearningData = { ...learningData };

      finalLearningData.user_id = userId;

      // ... (ファイル更新処理はここに移動・統合)
      if (editedFile) {
        const newCommitSha = await handleUpdateFile(
          editedFile.path,
          editedFile.content,
          editedFile.sha,
          { contentIsBase64: editedFile.contentIsBase64 }
        );
        if (newCommitSha) {
          finalLearningData.commit_sha = newCommitSha;
        } else {
          throw new Error("File update failed, aborting learning record save.");
        }
      }

      // 1. category_idが空文字列ならnullに変換する
      if (finalLearningData.category_id === "") {
        finalLearningData.category_id = null;
      }

      let systemMessageText = "";

      if (finalLearningData.id) {
        // IDがあれば更新
        await updateLearningApi(finalLearningData.id, finalLearningData,userId ?? 0);
        systemMessageText = `「${finalLearningData.title}」を更新しました。`;
      } else {
        // IDがなければ新規作成
        await createLearningApi(finalLearningData,userId ?? 0);
        systemMessageText = `「${finalLearningData.title}」を登録しました。`;
      }

      // 2. データを再読み込みして最新の状態を反映する
      await refetchData();

      // GitHub連携ファイルパスがあれば、ファイルリストも再取得
      if (finalLearningData.github_path) {
        setTimeout(() => {
          fetchGitHubFiles();
        }, 3000);
      }

      // 3. systemMessageに必要なプロパティを全て追加
      const systemMessage: Message = {
        id: Date.now(),
        text: systemMessageText,
        timestamp: new Date().toLocaleTimeString("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: "left",
        photoURL: "https://placehold.co/40x40/EFEFEF/AAAAAA?text=BOT",
        displayName: "システム",
      };

      setMessages((prev) => [...prev, systemMessage]);
    } catch (error) {
      console.error("Failed to save learning record:", error);
      alert(`登録またはファイルの更新に失敗しました: ${error}`);
    }
  };

  // ★ 編集ダイアログを開く関数
  const openEditDialog = (id: number) => {
    const itemToEdit = learningData.find((item) => item.id === id);
    if (itemToEdit) {
      // ★ category_name から category_id を見つける
      const category = allCategories.find(
        (c) => c.name === itemToEdit.category_name
      );
      const category_id = category ? category.id : null; // 見つからなければ空文字

      // ★ 元のデータに category_id を追加してStateにセット
      setEditingItem({
        ...itemToEdit,
        category_id: category_id,
      });
      setOpenNewDialog(true);
    }
  };

  const handleSearch = (query: string) => {
    const trimmedQuery = query.trim();

    const userMessage: Message = {
      id: Date.now(),
      text: trimmedQuery || "詳細条件のみで検索",
      timestamp: new Date().toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "right",
    };
    setMessages((prev) => [...prev, userMessage]);

    // APIから取得したデータを使って検索処理を行う
    let results = [...learningData];

    // 1. カテゴリでフィルタリング
    if (searchFilters.category !== "all") {
      results = results.filter(
        (item) => item.category_name.toString() === searchFilters.category
      );
    }

    // 2. ハッシュタグでフィルタリング
    if (searchFilters.hashtags.length > 0) {
      results = results.filter((item) =>
        // 選択されたハッシュタグが、アイテムの持つタグ配列に「すべて」含まれているかチェック
        searchFilters.hashtags.every((selectedTag) =>
          item.tags.includes(selectedTag)
        )
      );
    }

    // 3. テキストクエリでフィルタリング (titleとexplanatory_textを対象)
    if (trimmedQuery) {
      const lowerCaseQuery = trimmedQuery.toLowerCase();
      results = results.filter(
        (item) =>
          item.title.toLowerCase().includes(lowerCaseQuery) ||
          item.explanatory_text.toLowerCase().includes(lowerCaseQuery)
      );
    }

    // 4. 結果をソート
    results.sort((a, b) => {
      if (searchFilters.sort === "name-asc") {
        return a.title.localeCompare(b.title, "ja");
      } else {
        // 'name-desc'
        return b.title.localeCompare(a.title, "ja");
      }
    });

    // 5. 結果メッセージを生成（カード描画は共通関数へ）
    postResultCards(
      results,
      `<div style="font-weight: 700; color: #4338ca; margin-bottom: 10px; font-size: 0.9em;">🔎 検索結果: ${results.length}件</div>`
    );
  };

  // 学習記録の配列を、検索結果カードとしてチャットに投稿する共通処理
  const postResultCards = (results: LearningRecord[], headerHtml: string) => {
    let resultText = headerHtml;
    if (results.length > 0) {
      resultText += results
        .map((item) => {
          // タグを装飾するHTMLを生成
          const tagsHtml =
            item.tags.length > 0
              ? item.tags
                  .map(
                    (tag) =>
                      `<span style="background-color: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 9999px; font-size: 0.72em; font-weight: 500; display: inline-block;">#${tag}</span>`
                  )
                  .join("")
              : `<span style="color:#9ca3af; font-size:0.75em;">タグなし</span>`;

          // 理解度を★で表現するHTMLを生成
          const understandingHtml = `<span>${"★".repeat(
            item.understanding_level
          )}${"☆".repeat(5 - item.understanding_level)}</span>`;

          const commitShaAttribute = item.commit_sha
            ? `data-commit-sha="${item.commit_sha}"`
            : "";

          // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
          // ★★★ 変更箇所 ★★★
          // ボタンの配置（justify-content）を、「ファイルを見る」ボタンの有無によって動的に変更します。
          // また、「編集」ボタンのスタイルを分かりやすく変更しました。
          const justifyContent: string = item.github_path
            ? "space-between"
            : "flex-end";

          // カード形式のHTMLを返す
          return `
            <div style="
              border: 1px solid #e0e7ff;
              border-radius: 10px;
              padding: 12px 14px;
              margin-bottom: 10px;
              background: #ffffff;
              box-shadow: 0 1px 4px rgba(79, 70, 229, 0.08);
              transition: box-shadow 0.2s ease;
            " onmouseover="this.style.boxShadow='0 4px 12px rgba(79, 70, 229, 0.12)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(79, 70, 229, 0.08)'">
              
              <!-- タイトル＋理解度（1行に凝縮） -->
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 6px;">
                <h3 style="margin: 0; font-size: 1.02em; font-weight: 700; color: #4338ca;">${item.title}</h3>
                <span style="color: #f59e0b; font-size: 0.82em; white-space: nowrap;">${understandingHtml}</span>
              </div>

              <!-- カテゴリ・タグ（インラインのチップ） -->
              <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 5px; margin-bottom: 6px;">
                <span style="background-color: #4f46e5; color: #fff; padding: 2px 8px; border-radius: 9999px; font-size: 0.72em; font-weight: 600;">${item.category_name}</span>
                ${tagsHtml}
              </div>

              <!-- 詳細トグル（クリックで開閉） -->
              <button
                data-action="toggle-detail"
                data-target="details-${item.id}"
                style="background:none; border:none; color:#4f46e5; font-size:0.8em; font-weight:600; cursor:pointer; padding:2px 0; display:inline-flex; align-items:center; gap:4px;"
              >詳細を見る ▼</button>

              <!-- 詳細（初期は非表示。トグルで開く） -->
              <div id="details-${item.id}" style="display:none; margin-top:8px; border-top:1px solid #eef0f6; padding-top:8px;">

              <!-- 説明文 -->
              <p style="
                font-size: 0.85em;
                color: #555;
                line-height: 1.6;
                margin: 0 0 8px 0;
                white-space: pre-wrap;
                word-wrap: break-word;
              ">${item.explanatory_text}</p>
              
              ${
                item.reference_url
                  ? `<div style="margin-bottom: 8px;"><a href="${item.reference_url}" target="_blank" rel="noopener noreferrer" style="color: #4f46e5; text-decoration: none; font-weight: 600; font-size: 0.82em;">参考リンク 🔗</a></div>`
                  : ""
              }

              <!-- アクションボタン -->
              <div style="
                display: flex;
                align-items: center;
                justify-content: ${justifyContent};
                flex-wrap: wrap;
                gap: 12px;
              ">
                ${
                  item.github_path
                    ? `<button 
                        class="view-file-btn" 
                        data-action="view-file" 
                        data-path="${item.github_path}"${commitShaAttribute}
                        style="
                          background: linear-gradient(135deg, #1976d2 0%, #4338ca 100%);
                          color: white;
                          border: none;
                          padding: 6px 12px;
                          border-radius: 8px;
                          cursor: pointer;
                          font-size: 0.9em;
                          font-weight: 500;
                          box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
                          transition: all 0.2s ease;
                        "
                        onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(79, 70, 229, 0.3)'"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(79, 70, 229, 0.2)'">
                        📄 ファイルを見る (${item.github_path.split("/").pop()})
                      </button>`
                    : ""
                }
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; max-width: 400px;">
                  <button 
                    class="action-btn-edit" 
                    data-action="edit" 
                    data-id="${item.id}"
                    style="
                      background-color: #e0e7ff;
                      color: #1976d2;
                      border: 1px solid #90caf9;
                      padding: 6px 12px;
                      border-radius: 8px;
                      cursor: pointer;
                      font-size: 0.9em;
                      font-weight: 500;
                      transition: all 0.2s ease;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      gap: 6px;
                      width: 100%;
                    "
                    onmouseover="this.style.backgroundColor='#bbdefb'; this.style.borderColor='#64b5f6'"
                    onmouseout="this.style.backgroundColor='#e0e7ff'; this.style.borderColor='#90caf9'">
                    ✏️ 編集
                  </button>
                  <button 
                    class="action-btn-delete" 
                    data-action="delete" 
                    data-id="${item.id}"
                    style="
                      background-color: #ffebee;
                      color: #c62828;
                      border: 1px solid #ef9a9a;
                      padding: 6px 12px;
                      border-radius: 8px;
                      cursor: pointer;
                      font-size: 0.9em;
                      font-weight: 500;
                      transition: all 0.2s ease;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      gap: 6px;
                      width: 100%;
                    "
                    onmouseover="this.style.backgroundColor='#ffcdd2'; this.style.borderColor='#e57373'"
                    onmouseout="this.style.backgroundColor='#ffebee'; this.style.borderColor='#ef9a9a'">
                    🗑️ 削除
                  </button>
                </div>
              </div>
              </div><!-- /details -->
            </div>
          `;
          // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
        })
        .join("");
    } else {
      resultText += "一致する学習記録は見つかりませんでした。";
    }

    setTimeout(() => {
      const searchResultMessage: Message = {
        id: Date.now() + 1,
        text: resultText,
        timestamp: new Date().toLocaleTimeString("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: "left",
        photoURL: "https://placehold.co/40x40/EFEFEF/AAAAAA?text=BOT",
        displayName: "システム",
      };
      setMessages((prev) => [...prev, searchResultMessage]);
    }, 500);
  };

  // 今日の復習：理解度が低い・しばらく見ていない記録を優先して振り返る
  const handleReview = () => {
    const userMessage: Message = {
      id: Date.now(),
      text: "今日の復習",
      timestamp: new Date().toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "right",
    };
    setMessages((prev) => [...prev, userMessage]);

    const toTime = (d?: string) => (d ? new Date(d).getTime() || 0 : 0);
    const candidates = [...learningData]
      .sort((a, b) => {
        // 理解度が低い順 → 同じなら古い順（久しく見ていないもの優先）
        const lv = (a.understanding_level ?? 3) - (b.understanding_level ?? 3);
        if (lv !== 0) return lv;
        return toTime(a.created_at) - toTime(b.created_at);
      })
      .slice(0, 5);

    const header =
      candidates.length > 0
        ? `<div style="font-weight: 700; color: #4338ca; margin-bottom: 10px; font-size: 0.9em;">📖 今日の復習（理解度が低め・振り返り優先の${candidates.length}件）</div>`
        : `<div style="font-weight: 700; color: #4338ca; margin-bottom: 10px; font-size: 0.9em;">📖 今日の復習</div>`;
    postResultCards(candidates, header);
  };

  // タグをタップして、そのタグが付いた学習記録だけをサッと絞り込み表示する
  const handleTagFilter = (tag: string) => {
    const userMessage: Message = {
      id: Date.now(),
      text: `#${tag}`,
      timestamp: new Date().toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "right",
    };
    setMessages((prev) => [...prev, userMessage]);

    const results = [...learningData]
      .filter((item) => item.tags.includes(tag))
      .sort((a, b) => a.title.localeCompare(b.title, "ja"));

    postResultCards(
      results,
      `<div style="font-weight: 700; color: #4338ca; margin-bottom: 10px; font-size: 0.9em;">🏷️ タグ「#${tag}」の学習記録: ${results.length}件</div>`
    );
  };

  // 未認証時の表示
  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #eef2ff 0%, #f6f7fb 60%)",
          px: 2,
        }}
      >
        <Box
          sx={{
            maxWidth: 440,
            width: "100%",
            textAlign: "center",
            bgcolor: "#fff",
            borderRadius: 4,
            boxShadow: "0 12px 40px rgba(79,70,229,0.15)",
            p: { xs: 4, sm: 6 },
          }}
        >
          <MenuBookIcon sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
            学習ログへようこそ
          </Typography>
          <Typography sx={{ mb: 3, color: "text.secondary" }}>
            学んだことを記録・振り返るには、
            <br />
            GitHubアカウントでのログインが必要です。
          </Typography>
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<GitHubIcon />}
            onClick={login}
          >
            GitHubでログイン
          </Button>
          <Typography
            variant="caption"
            sx={{ display: "block", mt: 2, color: "text.secondary", lineHeight: 1.7 }}
          >
            ※ 初回ログイン時、あなたのGitHubに保存先リポジトリ
            <br />
            <code>learning-site-&lt;ユーザー名&gt;</code>（非公開）が作成されます。
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{ width: `calc(100% - ${drawerWidth}px)`, ml: `${drawerWidth}px` }}
      >
        <Toolbar>
          <Avatar
            sx={{ bgcolor: "rgba(255,255,255,0.2)", width: 38, height: 38, mr: 1.5 }}
          >
            <SmartToyIcon fontSize="small" />
          </Avatar>
          <Box>
            <Typography variant="h6" noWrap component="div" sx={{ lineHeight: 1.2 }}>
              学習内容検索チャット
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
              タイトルやタグで、記録した学びを検索
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            color="inherit"
            size="small"
            startIcon={<MenuBookOutlinedIcon />}
            onClick={handleReview}
            sx={{
              mr: 0.5,
              border: "1px solid rgba(255,255,255,0.5)",
              display: { xs: "none", sm: "inline-flex" },
            }}
          >
            今日の復習
          </Button>
          <Tooltip title="今日の復習">
            <IconButton
              color="inherit"
              onClick={handleReview}
              sx={{ display: { xs: "inline-flex", sm: "none" } }}
            >
              <MenuBookOutlinedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip
            title={
              colorMode.mode === "dark"
                ? "ライトモードに切り替え"
                : "ダークモードに切り替え"
            }
          >
            <IconButton color="inherit" onClick={colorMode.toggle}>
              {colorMode.mode === "dark" ? (
                <Brightness7Icon />
              ) : (
                <Brightness4Icon />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip title="使い方・機能説明">
            <IconButton color="inherit" onClick={() => setHelpOpen(true)}>
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <LeftToolBar
        onAddNewLearning={() => {
          setEditingItem(null);
          setOpenNewDialog(true);
        }}
        onAddNewCategory={handleAddNewCategory}
        onFileSelect={handleFileSelect}
        onAddNewFolder={handleFolderSelect}
        files={githubFiles}
        loading={filesLoading}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: "background.default",
          p: { xs: 0, sm: 3 }, // スマホでは余白を削除
          height: { xs: "100vh", sm: "auto" }, // スマホでは全画面
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Toolbar sx={{ display: { xs: "none", sm: "flex" } }} /> {/* スマホでは非表示 */}
        
        <Paper
          elevation={3}
          sx={{
            width: { xs: "100vw", sm: "80vw" },
            height: { xs: "100vh", sm: "85vh" },
            maxWidth: { sm: "600px" },
            maxHeight: { sm: "900px" },
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
            margin: { xs: 0, sm: "auto" },
            marginTop: { xs: "56px" },
            borderRadius: { xs: 0, sm: 2 }, // スマホでは角丸なし
          }}
        >
          {/* メッセージ一覧 */}
          <Box
            id="style-1"
            component="div"
            sx={{
              flexGrow: 1,
              overflowY: "auto",
              p: { xs: 1.5, sm: 2.5 },
              bgcolor: "background.default",
            }}
          >
            {messages.map((msg) =>
              msg.type === "left" ? (
                <MessageLeft
                  key={msg.id}
                  message={msg.text}
                  timestamp={msg.timestamp}
                  photoURL={msg.photoURL}
                  displayName={msg.displayName}
                />
              ) : (
                <MessageRight
                  key={msg.id}
                  message={msg.text}
                  timestamp={msg.timestamp}
                />
              )
            )}
            <div ref={messageEndRef} />
          </Box>

          {/* 検索ダイアログ */}
          <SearchDialog
            open={openSearchDialog}
            onClose={() => setOpenSearchDialog(false)}
            onApply={handleApplyFilters}
            currentFilters={searchFilters}
          />

          {/* タグでサッと絞り込み（タップで、そのタグの記録だけ表示） */}
          {allTags.length > 0 && (
            <Box
              sx={{
                borderTop: 1,
                borderColor: "divider",
                bgcolor: "background.paper",
                px: { xs: 1, sm: 2 },
                pt: 0.75,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <LocalOfferOutlinedIcon sx={{ fontSize: 15 }} />
                タグでサッと絞り込み
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  gap: 0.75,
                  overflowX: "auto",
                  py: 0.75,
                  // スマホで片手スクロールしやすいよう、細めのスクロールバー
                  "&::-webkit-scrollbar": { height: 6 },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "rgba(128,128,128,0.4)",
                    borderRadius: 3,
                  },
                }}
              >
                {allTags.map((tag) => (
                  <Chip
                    key={tag.id}
                    label={`#${tag.name}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                    clickable
                    onClick={() => handleTagFilter(tag.name)}
                    sx={{ flexShrink: 0, fontWeight: 600 }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* 入力欄 */}
          <Box
            sx={{
              p: { xs: 1, sm: 2 },
              borderTop: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <TextInputLearning
              onSendMessage={handleSearch}
              onSearchMenuClick={() => setOpenSearchDialog(true)}
            />
          </Box>
        </Paper>
      </Box>

      <NewLearningDialog
        open={openNewDialog}
        onClose={() => setOpenNewDialog(false)}
        onSubmit={handleSubmitLearning} // ★ 汎用ハンドラを渡す
        allTags={allTags}
        allCategories={allCategories}
        editingData={editingItem} // ★ 編集データを渡す
        onFetchFile={fetchFileForDialog}
      />
      <GitHubFileViewerDialog
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        path={viewingContent.path}
        content={viewingContent.content}
        // ★★★ 編集可能フラグをpropsとして渡す ★★★
        isEditable={isViewerEditable}
        onUpdateFile={async (path, newContent) => {
          await handleUpdateFile(path, newContent, viewingContent.sha);
          return;
        }}
      />
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>削除の確認</DialogTitle>
        <DialogContent>
          <DialogContentText>
            この学習記録を本当に削除しますか？この操作は元に戻せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleDeleteLearning} color="error">
            削除
          </Button>
        </DialogActions>
      </Dialog>
      {/* ★ 新規カテゴリー追加ダイアログをレンダリング */}
      <NewCategoryDialog
        open={isCategoryDialogOpen}
        onClose={() => setIsCategoryDialogOpen(false)}
        onSubmit={handleCategorySubmit}
        existingCategories={allCategories.map((category) => category.name)}
      />
       <GitHubFolderSelector
        open={isFolderSelectorOpen}
        onClose={() => setIsFolderSelectorOpen(false)}
        onSelectFolder={(folderPath: string) => {
          setGithubPath(folderPath + "/"); // 選択結果を格納
          setIsFolderSelectorOpen(false);
        }}
        githubLogin={githubLoginSafe}
        repoName={repoNameSafe}
        accessToken={tokenSafe}
         setSelectedPath={setSelectedFolderPath}
      />

      {/* ヘルプ（各機能の説明） */}
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <HelpOutlineIcon color="primary" /> 使い方・機能の説明
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
            左のメニューと下の入力欄から、次のことができます。
          </Typography>
          <List>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40 }}><MenuBookOutlinedIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="新規学習内容"
                secondary="学んだことを記録します。タイトル・カテゴリ・タグ・理解度・参考リンク・GitHub上のコードを紐づけて保存できます。"
              />
            </ListItem>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40 }}><CategoryOutlinedIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="新規カテゴリー"
                secondary="学習内容を分類するためのカテゴリを追加します（例：Java、AI、ネットワークなど）。"
              />
            </ListItem>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40 }}><CreateNewFolderOutlinedIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="新規フォルダー"
                secondary="学習ファイルの保存先フォルダーを、あなたのGitHubリポジトリ内に作成・選択します。"
              />
            </ListItem>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40 }}><SearchOutlinedIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="ファイル名で検索（左メニュー）"
                secondary="保存済みのGitHubファイルを、ファイル名で探します。"
              />
            </ListItem>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40 }}><SmartToyIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="学習内容の検索（下の入力欄）"
                secondary="タイトルやキーワードを入力して送信すると、記録した学びをチャット形式で検索できます。結果は「詳細を見る」で1件ずつ開けます。"
              />
            </ListItem>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40 }}><FilterListOutlinedIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="絞り込み検索（入力欄の左のアイコン）"
                secondary="カテゴリ・ハッシュタグ・並び順を指定して、条件で絞り込んで検索できます。"
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpOpen(false)} variant="contained">
            とじる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
