import React, { useState, useEffect, useContext, useRef, useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { Button } from "@mui/material";
import Chip from "@mui/material/Chip";
import { MessageLeft, MessageRight } from "./component/Message";
import LearningResultCards from "./component/LearningResultCards";
import AdBanner from "./component/AdBanner";
import { TextInputLearning } from "./component/TextInputLearning";
import { SearchDialog } from "./component/SearchDialog";
import Toolbar from "@mui/material/Toolbar";
import LeftToolBar, {
  DRAWER_WIDTH_EXPANDED,
  DRAWER_WIDTH_COLLAPSED,
} from "./component/LeftToolBar";
import Typography from "@mui/material/Typography";
import CssBaseline from "@mui/material/CssBaseline";
import AppBar from "@mui/material/AppBar";
import LinearProgress from "@mui/material/LinearProgress";
import Skeleton from "@mui/material/Skeleton";
import CircularProgress from "@mui/material/CircularProgress";
import { alpha } from "@mui/material/styles";
import {
  learningApi,
  TagsApi,
  LearningTagApi,
  CategoriesApi,
  createLearningApi,
  updateLearningApi,
  deleteLearningApi,
} from "./component/Api";
import NewLearningDialog from "./component/NewLearningDialog";
import { AuthContext } from "./Context";
import GitHubFileViewerDialog from "./component/GitHubFileViewerDialog";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import ManageDialog from "./component/ManageDialog";
import LearningListDialog from "./component/LearningListDialog";
import LearningAnalyticsDialog from "./component/LearningAnalyticsDialog";
import RelatedGraphDialog from "./component/RelatedGraphDialog";
import ArticlePreviewDialog from "./component/ArticlePreviewDialog";
import PlanComparisonDialog from "./component/PlanComparisonDialog";
import InquiryManageDialog from "./component/InquiryManageDialog";
import { saveLearningCache, loadLearningCache } from "./component/offlineCache";
import { enqueueAction, flushQueue, queueLength } from "./component/offlineQueue";
import { getCard, isDue, reviewCard } from "./component/srs";
import { isDataSaverEnabled, setDataSaverEnabled, prefersSaveData } from "./settings";
import { decodeBase64Text } from "./component/decodeBase64";
import GitHubFolderSelector from "./component/GitHubFolderSelector";
import { useFullScreenDialog } from "./component/useFullScreenDialog";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import GitHubIcon from "@mui/icons-material/GitHub";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Badge from "@mui/material/Badge";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import TuneIcon from "@mui/icons-material/Tune";
import UpdateIcon from "@mui/icons-material/Update";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import TableRowsIcon from "@mui/icons-material/TableRows";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import CloudSyncIcon from "@mui/icons-material/CloudSync";
import DataSaverOnIcon from "@mui/icons-material/DataSaverOn";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { ColorModeContext } from "./ColorModeContext";
import StreakDialog from "./component/StreakDialog";
import { calculateStreakStats } from "./component/streakStats";
import { useToast } from "./ToastContext";
import ReviewFlashcards from "./component/ReviewFlashcards";
import {
  isNotificationSupported,
  isRemindersEnabled,
  requestAndEnableReminders,
  setRemindersEnabled,
  maybeNotifyReview,
  showTestReminder,
  updateAppBadge,
} from "./notifications";
import { getFileType, getMimeType } from "./component/getFileType";
import { parseAttachments, serializeAttachments } from "./component/attachments";
import { parseReferenceUrls } from "./component/referenceUrls";
import {
  listGuestRecords,
  clearGuestRecords,
  type GuestLearningRecord,
} from "./component/guestStorage";



const BOTTOM_NAV_HEIGHT = 56; // スマホ用ボトムナビの高さ(px)
const APPBAR_HEIGHT_XS = 56; // スマホ用AppBar（ヘッダー）の高さ(px)

// フリープランの登録上限（Proプランとの差別化のための制限。バックエンド側でも
// 同じ上限を強制しており、こちらは主に事前チェックとメッセージ表示のため）
const FREE_PLAN_LIMIT = 100;
// カテゴリー・タグも同様に、新規作成のみを上限でブロックする
const FREE_CATEGORY_LIMIT = 20;
const FREE_TAG_LIMIT = 50;

const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "m4v", "avi", "mkv", "ogv"];

const SORT_LABELS: Record<string, string> = {
  "name-asc": "タイトル (昇順)",
  "name-desc": "タイトル (降順)",
  "understanding-desc": "理解度が高い順",
  "understanding-asc": "理解度が低い順",
  "date-desc": "更新日が新しい順",
  "date-asc": "更新日が古い順",
};

// 検索の設定内容（カテゴリー・ハッシュタグ・ソート）を、チャット表示用のテキストにまとめる
const describeSearchFilters = (filters: {
  category: string;
  hashtags: string[];
  sort: string;
}) =>
  `カテゴリー: ${filters.category === "all" ? "すべて" : filters.category}\n` +
  `ハッシュタグ: ${
    filters.hashtags.length > 0 ? filters.hashtags.join(", ") : "指定なし"
  }\n` +
  `ソート: ${SORT_LABELS[filters.sort] ?? filters.sort}`;

// APIデータの型定義を実際のデータ構造に合わせる
interface LearningRecord {
  id: number;
  title: string;
  // 検索結果一覧のプレビューに表示する見出し（未設定ならexplanatory_textの先頭を代わりに表示）
  heading_text: string | null;
  explanatory_text: string;
  understanding_level: number | null;
  reference_url: string | null; // nullの可能性も考慮
  created_at: string;
  category_name: string;
  category_id?: number | string | null;
  tags: string[];
  github_path: string;
  commit_sha: string | null;
  // このカラムが追加される前に作られた記録はnull
  repo_name?: string | null;
  user_id: number;
}

// 記事化ダイアログに渡す最小限の型（LearningRecordのサブセットで満たせる）
type PublishableItem = {
  id: number;
  title: string;
  explanatory_text: string;
  understanding_level: number | null;
  category_name: string;
  tags: string[];
  reference_url: string | null;
  created_at: string;
  github_path: string;
};

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
  // 検索結果などをカード一覧として表示する場合に使用（textはヘッダー文言として使う）
  cards?: LearningRecord[];
  // 案内メッセージから直接次の行動に進めるための、任意のアクションボタン
  action?: { label: string; onClick: () => void };
  // 検索結果が0件だったときに表示する行動導線（cardsメッセージ専用）
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
};


export default function LearningContent() {
  const { octokit,isAuthenticated, login, logout, userId,repoName,setRepoName,githubLogin, isAuthenticating } = useContext(AuthContext);
  const fullScreenDialog = useFullScreenDialog();
  const { showToast } = useToast();
  // お問い合わせ管理は管理者（id=1）のみ開けるようにする
  const isAdmin = userId === 1;
  const [isLoggingIn, setIsLoggingIn] = useState(false); // GitHubログインボタン押下〜リダイレクトまでの表示用
  // APIから取得した学習記録データを保持するState
  const [learningData, setLearningData] = useState<LearningRecord[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(true); // 学習記録の初回取得中フラグ
  const emptyGuideShownRef = useRef(false); // 「まだ記録がありません」案内の二重表示防止
  // handleSubmitLearning内ではsubmissionDataのlearningDataに同名シャドーイングされるため、
  // 保存前の件数を別途refで保持し、「これが最初の1件か」の判定に使う
  const learningRecordCountRef = useRef(0);
  useEffect(() => {
    learningRecordCountRef.current = learningData.length;
  }, [learningData]);
  const planLimitNoticeShownRef = useRef(false); // フリープラン上限の案内の二重表示防止
  // ゲストモードで貯めた記録を、実際のログイン後にインポートするかどうかの確認
  const guestImportPromptShownRef = useRef(false);
  const [guestImportRecords, setGuestImportRecords] = useState<GuestLearningRecord[]>([]);
  const [guestImportOpen, setGuestImportOpen] = useState(false);
  const [guestImportBusy, setGuestImportBusy] = useState(false);
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
  const isVideoFile = VIDEO_EXTENSIONS.includes(ext);

  let content = "";
  // ✅ Base64が空（1MB超などでContents APIがcontentを省略する場合。画像・動画に
  // 限らずExcel/PDF/Word/PowerPoint/ZIPでも起こりうる）は、認証付きでblobを取得する
  let base64Content =
    data.content && data.content.trim() !== "" ? data.content.replace(/\r?\n/g, "") : "";
  if (!base64Content) {
    try {
      const blob = await octokit.request(
        "GET /repos/{owner}/{repo}/git/blobs/{file_sha}",
        { owner: githubLogin, repo: repoName, file_sha: data.sha }
      );
      base64Content = ((blob.data as any).content || "").replace(/\r?\n/g, "");
    } catch (e) {
      console.error("ファイルの取得に失敗:", e);
    }
  }

  if (isImageFile || isVideoFile) {
    const mimeType = getMimeType(path);
    content = base64Content ? `data:${mimeType};base64,${base64Content}` : "";
  } else if (base64Content) {
    // ✅ テキストの場合：Base64デコード
    try {
      const decoded = decodeURIComponent(
        Array.prototype.map
          .call(atob(base64Content), (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
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
    base64Content,
  };
  } catch (error: any) {
    console.error("Error fetching file for dialog:", error);
    return null;
  }
};


  const [githubFiles, setGithubFiles] = useState<GitHubFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(
    () => !(isDataSaverEnabled() || prefersSaveData())
  );
  const [hasFetchedFiles, setHasFetchedFiles] = useState(false); // 省データモードで未取得かどうかの判定用

  // ★ GitHubからファイルリストを取得する関数 (旧fetchRepoFiles)
 const fetchGitHubFiles = async () => {
  setFilesLoading(true);

  if (!octokit || !githubLogin || !repoName) {
    console.error("Octokitまたはリポジトリ情報がありません");
    setFilesLoading(false);
    setHasFetchedFiles(true);
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
    setHasFetchedFiles(true);
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
    showToast("ファイルを更新しました。", "success");

    return response.data.commit.sha;
  } catch (error: any) {
    console.error("Failed to update file:", error);
    showToast(`ファイルの更新に失敗しました。${error.message || error}`, "error");
    return null;
  }
};

  // 記事化したMarkdownを、ユーザーのlearning-siteリポジトリに保存する（新規作成/上書き両対応）
  const handlePublishArticle = async (
    markdown: string,
    path: string
  ): Promise<string | null> => {
    if (!octokit || !githubLogin || !repoName) {
      showToast("GitHub連携情報が見つかりません。", "error");
      return null;
    }

    try {
      let sha: string | undefined;
      try {
        const existing = await octokit.repos.getContent({
          owner: githubLogin,
          repo: repoName,
          path,
        });
        if (!Array.isArray(existing.data) && "sha" in existing.data) {
          sha = existing.data.sha;
        }
      } catch {
        // ファイルがまだ存在しない場合（404）は新規作成として続行
      }

      const contentBase64 = btoa(unescape(encodeURIComponent(markdown)));
      const response = await octokit.repos.createOrUpdateFileContents({
        owner: githubLogin,
        repo: repoName,
        path,
        message: sha ? `Update article: ${path}` : `Add article: ${path}`,
        content: contentBase64,
        sha,
        branch: "main",
      });

      showToast("記事をGitHubリポジトリに保存しました。", "success");
      setPublishingItem(null);
      return response.data.content?.html_url ?? null;
    } catch (error: any) {
      console.error("Failed to publish article:", error);
      showToast(`記事の保存に失敗しました。${error.message || error}`, "error");
      return null;
    }
  };

  const [viewerOpen, setViewerOpen] = useState<boolean>(false);
  const [viewingContent, setViewingContent] = useState({
    path: "",
    content: "",
    sha: "",
    base64Content: "",
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
    const ext = (path.split(".").pop() || "").toLowerCase();
    const isImageFile = ["png","jpg","jpeg","gif","bmp","svg","ico","webp"].includes(ext);
    const isVideoFile = VIDEO_EXTENSIONS.includes(ext);
    const isHistorical = !!commitSha;
    // Excel/PDF/Word/PowerPoint/ZIPなどはテキストとして安全にデコード・編集できない
    // （UTF-8として強制デコードすると内容が壊れ、そのまま保存すると埋め込み図表などが消える）。
    // NewLearningDialogの取り扱いと同じ分類基準で、テキスト編集の対象外とする
    const fileType = getFileType(path);
    const isPreviewUnsupported = ["excel", "pdf", "docx", "doc", "pptx", "zip-archive", "binary"].includes(fileType);

    let content = "";
    let base64Content = "";

    if (isImageFile || isVideoFile) {
      const mimeType = getMimeType(path);
      if (response.data.content && response.data.content.trim() !== "") {
        // ✅ Base64データがある通常パターン
        base64Content = response.data.content.replace(/\r?\n/g, "");
        content = `data:${mimeType};base64,${base64Content}`;
      } else {
        // ⚠️ LFSや大容量ファイルなど（動画で特に多い）：認証付きで blob を取得（プライベートリポジトリ対応）
        try {
          const blob = await octokit.request(
            "GET /repos/{owner}/{repo}/git/blobs/{file_sha}",
            { owner: githubLogin, repo: repoName, file_sha: response.data.sha }
          );
          const b64 = ((blob.data as any).content || "").replace(/\r?\n/g, "");
          content = b64 ? `data:${mimeType};base64,${b64}` : "";
        } catch (e) {
          console.error("メディアファイルの取得に失敗:", e);
          content = "";
        }
      }
    } else if (isPreviewUnsupported) {
      // バイナリ形式はテキストとしてデコードしない（内容が壊れて表示・保存されるのを防ぐ）。
      // Excel/PDF等をそれぞれの見た目で表示するため、Base64はそのまま保持しておく
      content = "";
      if (response.data.content && response.data.content.trim() !== "") {
        base64Content = response.data.content.replace(/\r?\n/g, "");
      } else {
        // ⚠️ 1MB超などでcontentが省略される場合：認証付きでblobを取得
        try {
          const blob = await octokit.request(
            "GET /repos/{owner}/{repo}/git/blobs/{file_sha}",
            { owner: githubLogin, repo: repoName, file_sha: response.data.sha }
          );
          base64Content = ((blob.data as any).content || "").replace(/\r?\n/g, "");
        } catch (e) {
          console.error("ファイルの取得に失敗:", e);
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
      base64Content,
    });

    // 過去のコミット、およびExcel/PDF/Word/PowerPoint/ZIPなどのバイナリ形式は編集不可
    setIsViewerEditable(editable && !isHistorical && !isPreviewUnsupported);
    setViewerOpen(true);
  } catch (error: any) {
    console.error("Failed to fetch file:", error);
    showToast(`ファイルの取得に失敗しました。${error.message || error}`, "error");
  }
};

  // ★ LeftToolBarでファイルが選択されたときの処理を定義
  const handleFileSelect = (path: string) => {
    // LeftToolBarから呼ばれた場合は「編集可能」としてビューアを開く
    handleViewFile(path, true);
  };

  // ダイアログの開閉を管理するStateを追加
  const [openNewDialog, setOpenNewDialog] = React.useState(false);
  // ヘルプ（機能説明）ダイアログ
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [streakOpen, setStreakOpen] = useState<boolean>(false); // 学習の記録（連続日数）
  // AppBarの炎アイコンに常時バッジ表示するための、現在の連続記録日数
  const currentStreak = useMemo(
    () => calculateStreakStats(learningData.map((l) => l.created_at)).current,
    [learningData]
  );
  const [reviewOpen, setReviewOpen] = useState<boolean>(false); // 今日の復習（フラッシュカード）
  const [reviewItems, setReviewItems] = useState<LearningRecord[]>([]);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false); // スマホの左メニュー開閉
  // 共有(Web Share Target)から渡された新規登録の初期値
  const [sharePrefill, setSharePrefill] = useState<{
    title?: string;
    explanatory_text?: string;
    reference_url?: string;
  } | null>(null);
  // 復習リマインド通知の状態（ヘルプのトグル表示用）
  const [remindersOn, setRemindersOn] = useState<boolean>(
    isNotificationSupported() && isRemindersEnabled()
  );
  const [isManageOpen, setIsManageOpen] = useState<boolean>(false); // カテゴリー・タグの管理
  const [listDialogOpen, setListDialogOpen] = useState<boolean>(false); // 一覧(テーブル)表示
  const [analyticsOpen, setAnalyticsOpen] = useState<boolean>(false); // 学習分析ダッシュボード
  const [graphOpen, setGraphOpen] = useState<boolean>(false); // 学びのつながり（グラフビュー）
  const [planDialogOpen, setPlanDialogOpen] = useState<boolean>(false); // プラン比較
  const [inquiryManageOpen, setInquiryManageOpen] = useState<boolean>(false); // お問い合わせ管理（管理者のみ）
  const [publishingItem, setPublishingItem] = useState<PublishableItem | null>(null); // 記事化プレビュー
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [syncQueueCount, setSyncQueueCount] = useState<number>(0); // オフライン中に保留した変更の件数
  const [dataSaverOn, setDataSaverOn] = useState<boolean>(
    () => isDataSaverEnabled() || prefersSaveData()
  ); // 省データモード
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false); // PCでの左メニュー折りたたみ
  const drawerWidth = sidebarCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED;

  // iOSのSafariは、body{overflow:hidden}だけではタッチ操作による
  // ページ本体のスクロール（ラバーバンド/バウンス）を防ぎきれないことが
  // 知られている（overflow:hiddenが効くのはプログラムやホイールでの
  // スクロールに対してだけで、指でのドラッグには効かない場合がある）。
  // 実際、録画で確認したところチャット部分の内部スクロールではなく
  // ページ全体（body）がスクロールしてしまっており、それがURLバーの
  // 出入り・隙間の原因になっていた。
  // 確実に止めるには、bodyそのものをposition:fixedにして通常の文書の
  // 流れから外してしまう（多くのモーダル/ドロワーライブラリで使われる、
  // iOS向けのbodyスクロールロックの定番手法）。
  useEffect(() => {
    const { body, documentElement: html } = document;
    const scrollY = window.scrollY;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyLeft = body.style.left;
    const prevBodyRight = body.style.right;
    const prevBodyWidth = body.style.width;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverscroll = body.style.overscrollBehaviorY;
    const prevHtmlOverscroll = html.style.overscrollBehaviorY;

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    body.style.overscrollBehaviorY = "none";
    html.style.overscrollBehaviorY = "none";

    return () => {
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.left = prevBodyLeft;
      body.style.right = prevBodyRight;
      body.style.width = prevBodyWidth;
      body.style.overflow = prevBodyOverflow;
      html.style.overflow = prevHtmlOverflow;
      body.style.overscrollBehaviorY = prevBodyOverscroll;
      html.style.overscrollBehaviorY = prevHtmlOverscroll;
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    if (userId) {
      refetchData();
    }
  }, [userId]);

  // データを再取得するための関数
  const refetchData = async () => {
    try {
      const [learnings, tags, learningTags, categories] = await Promise.all([
        learningApi(),
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
        // オフライン表示用にキャッシュへ保存
        saveLearningCache(userId, {
          learnings: processedLearnings,
          tags,
          categories,
        });
      } else {
        // 取得失敗（オフライン等）：キャッシュがあればそれを表示に使う
        console.error("Failed to fetch some of the required data.");
        const cache = loadLearningCache(userId);
        if (cache) {
          setLearningData(cache.learnings);
          setAllTags(cache.tags);
          setAllCategories(cache.categories);
        }
      }
    } catch (error) {
      console.error("An error occurred during refetchData:", error);
      // 例外時もキャッシュがあれば維持
      const cache = loadLearningCache(userId);
      if (cache && learningData.length === 0) {
        setLearningData(cache.learnings);
        setAllTags(cache.tags);
        setAllCategories(cache.categories);
      }
    }
  };

  // オフライン中に保留した変更（追加・更新・削除）を、オンライン復帰時にまとめて送信する
  const handleFlushQueue = async () => {
    if (!userId || queueLength(userId) === 0) return;
    const { succeeded, failed } = await flushQueue(userId);
    setSyncQueueCount(queueLength(userId));
    if (succeeded > 0) {
      await refetchData();
      showToast(`オフライン中の変更を${succeeded}件同期しました。`, "success");
    }
    if (failed > 0) {
      showToast(`${failed}件の同期に失敗しました。次回オンライン時に再試行します。`, "error");
    }
  };

  // オンライン/オフラインの切り替えを監視し、復帰時に自動同期する
  useEffect(() => {
    if (userId) {
      setSyncQueueCount(queueLength(userId));
      if (navigator.onLine) {
        handleFlushQueue();
      }
    }

    const handleOnline = () => {
      setIsOnline(true);
      handleFlushQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [userId]);

  const messageEndRef = React.useRef<HTMLDivElement>(null);

  const [openSearchDialog, setOpenSearchDialog] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    hashtags: [] as string[],
    category: "all",
    sort: "name-asc",
  });

  // コンポーネントが最初に描画された時にAPIからデータを取得する
  useEffect(() => {
    // 認証復元中はuserIdがまだnullのため、確定するまで待つ
    // （ここでuserId=0として取得してしまうと「0件」がdataLoading完了として確定し、
    //   実際のデータが届く前に「まだ学習記録がありません」の案内が誤表示されてしまう）
    if (!userId) return;

    // まずキャッシュがあれば即表示（オフライン／コールドスタート中でも過去の記録を閲覧できる）
    const cache = loadLearningCache(userId);
    if (cache) {
      setLearningData(cache.learnings);
      setAllTags(cache.tags);
      setAllCategories(cache.categories);
    }

    const fetchData = async () => {
      try {
      // 4つのAPIを並行して呼び出し、すべてのデータが揃うのを待つ
      const [learnings, tags, learningTags, categories] = await Promise.all([
        learningApi(),
        TagsApi(),
        LearningTagApi(),
        CategoriesApi(),
      ]);
      // ★ APIからの戻り値が配列であることを保証してから.mapを呼ぶ
      //   （エラー時にHTML文字列等の非配列値が返ってきて例外になるのを防ぐ）
      if (
        Array.isArray(learnings) &&
        Array.isArray(tags) &&
        Array.isArray(learningTags) &&
        Array.isArray(categories)
      ) {
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
        // オフライン表示用にキャッシュへ保存
        saveLearningCache(userId, {
          learnings: processedLearnings,
          tags,
          categories,
        });
      } else {
        console.error("Failed to fetch some of the required data.");
      }
      } catch (error) {
        console.error("An error occurred during initial data fetch:", error);
      }
    };
    fetchData().finally(() => setDataLoading(false));
    // 省データモード中は、使うまでGitHubファイル一覧を自動取得しない
    if (!dataSaverOn) {
      fetchGitHubFiles();
    }
  }, [userId]); // 空の依存配列[]を指定することで、初回レンダリング時に一度だけ実行される

  // 初回取得が完了して学習記録が0件だった場合、最初の記録作成を促す案内を表示する
  useEffect(() => {
    if (!dataLoading && learningData.length === 0 && !emptyGuideShownRef.current) {
      emptyGuideShownRef.current = true;
      const guideMessage: Message = {
        id: Date.now() + 2,
        text: "まだ学習記録がありません。まずは1件、記録してみましょう。タイトルとメモを書くだけでOKです。",
        timestamp: new Date().toLocaleTimeString("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: "left",
        displayName: "システム",
        action: { label: "学んだことを記録する", onClick: openNewLearningDialog },
      };
      setMessages((prev) => [...prev, guideMessage]);
    }
  }, [dataLoading, learningData]);

  // フリープランの上限に近づいている・達している場合に、1セッションにつき1回だけ案内する
  useEffect(() => {
    if (dataLoading || planLimitNoticeShownRef.current || learningData.length === 0) return;
    const remaining = FREE_PLAN_LIMIT - learningData.length;
    if (remaining > 10) return;

    planLimitNoticeShownRef.current = true;
    const noticeMessage: Message = {
      id: Date.now() + 3,
      text:
        remaining <= 0
          ? `学習記録がフリープランの上限（${FREE_PLAN_LIMIT}件）に達しています。新しく記録するには、不要な記録を削除するか、Proプランをご検討ください。`
          : `学習記録が${learningData.length}件になりました。フリープランでは${FREE_PLAN_LIMIT}件までとなっています。`,
      timestamp: new Date().toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "left",
      displayName: "システム",
      action: { label: "プランを見る", onClick: () => setPlanDialogOpen(true) },
    };
    setMessages((prev) => [...prev, noticeMessage]);
  }, [dataLoading, learningData]);

  // 初回取得が完了し、かつゲストモードで貯めた記録がこの端末に残っていれば、
  // 本アカウントへのインポートを提案する（1セッションにつき1回だけ）
  useEffect(() => {
    if (!dataLoading && userId && !guestImportPromptShownRef.current) {
      const guestRecords = listGuestRecords();
      if (guestRecords.length > 0) {
        guestImportPromptShownRef.current = true;
        setGuestImportRecords(guestRecords);
        setGuestImportOpen(true);
      }
    }
  }, [dataLoading, userId]);

  const handleImportGuestRecords = async () => {
    setGuestImportBusy(true);
    try {
      let succeeded = 0;
      for (const record of guestImportRecords) {
        try {
          await createLearningApi({
            title: record.title,
            heading_text: record.heading_text,
            explanatory_text: record.explanatory_text,
            understanding_level: record.understanding_level,
            reference_url: record.reference_url,
            category_id: null,
            tags: record.tags,
            github_path: "",
            commit_sha: "",
            created_at: record.created_at,
            user_id: userId,
          });
          succeeded++;
        } catch (error) {
          console.error("Failed to import a guest record:", error);
        }
      }
      clearGuestRecords();
      await refetchData();
      setGuestImportOpen(false);
      if (succeeded === guestImportRecords.length) {
        showToast(`ゲストモードの記録を${succeeded}件インポートしました。`, "success");
      } else {
        showToast(
          `${succeeded}/${guestImportRecords.length}件をインポートしました。一部失敗した記録があります。`,
          "warning"
        );
      }
    } finally {
      setGuestImportBusy(false);
    }
  };

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleApplyFilters = (filters: {
    hashtags: string[];
    category: string;
    sort: string;
  }) => {
    setSearchFilters(filters);

    const filterSummary = `検索条件が更新されました\n${describeSearchFilters(filters)}`;

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

  // ★ 編集対象のデータを保持するState
  const [editingItem, setEditingItem] = useState<LearningRecord | null>(null);

  // ★「元に戻す」猶予中の削除を保持する（タイマーが切れたら実際に削除を確定する）
  const pendingDeleteRef = useRef<{
    item: LearningRecord;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  // ★ 猶予時間経過後（または連続削除時）に実際の削除を確定する関数
  const commitDelete = async (item: LearningRecord) => {
    if (!navigator.onLine) {
      // オフライン時は削除を保留する（表示からはすでに消えている）
      enqueueAction(userId, { kind: "delete", id: item.id, label: "" });
      setSyncQueueCount(queueLength(userId));
      return;
    }
    try {
      await deleteLearningApi(item.id);
      refetchData(); // データを再取得して表示を更新
    } catch (error) {
      console.error("Failed to delete learning record:", error);
      showToast("削除に失敗しました。表示を元に戻します。", "error");
      setLearningData((prev) => [...prev, item]);
    }
  };

  // ★ 削除ボタンがクリックされたときに、即座に削除して「元に戻す」トーストを出す関数
  const handleDeleteWithUndo = (id: number) => {
    const item = learningData.find((l) => l.id === id);
    if (!item) return;

    // 直前に猶予中の削除があれば先に確定させる
    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timer);
      commitDelete(pendingDeleteRef.current.item);
    }

    setLearningData((prev) => prev.filter((l) => l.id !== id));

    const timer = setTimeout(() => {
      commitDelete(item);
      pendingDeleteRef.current = null;
    }, 6000);
    pendingDeleteRef.current = { item, timer };

    showToast(`「${item.title}」を削除しました。`, "info", {
      action: {
        label: "元に戻す",
        onClick: () => {
          if (pendingDeleteRef.current?.item.id === item.id) {
            clearTimeout(pendingDeleteRef.current.timer);
            pendingDeleteRef.current = null;
            setLearningData((prev) => [item, ...prev]);
          }
        },
      },
      durationMs: 6000,
    });
  };

  // フリープランの上限に達しているか（新規登録をブロックする判定に使う。
  // 編集は件数を増やさないので対象外）
  const isAtFreePlanLimit = learningData.length >= FREE_PLAN_LIMIT;

  // ★ 新規・更新の両方を処理するハンドラ
  const handleSubmitLearning = async (submissionData: any) => {
    // submissionDataから learningData と editedFiles（複数の添付ファイル）を取り出す
    const { learningData, editedFiles = [] } = submissionData;

    if (!learningData.id && isAtFreePlanLimit) {
      showToast(
        `フリープランでは学習記録は${FREE_PLAN_LIMIT}件までとなっています。Proプランのご案内をご確認ください。`,
        "warning",
        { action: { label: "プランを見る", onClick: () => setPlanDialogOpen(true) } }
      );
      throw new Error("free plan limit reached");
    }

    if (!navigator.onLine) {
      // GitHub上のファイル添付・編集はネットワークが必須のため、オフラインでは保留できない
      if (editedFiles.length > 0) {
        showToast(
          "オフラインではファイル添付を伴う保存はできません。オンライン復帰後にもう一度お試しください。",
          "error"
        );
        throw new Error("offline: file attachment requires network");
      }

      const finalLearningData = { ...learningData, user_id: userId };
      if (finalLearningData.category_id === "") {
        finalLearningData.category_id = null;
      }
      const label = finalLearningData.title || "無題の学習記録";

      if (finalLearningData.id) {
        enqueueAction(userId, {
          kind: "update",
          id: finalLearningData.id,
          payload: finalLearningData,
          userId: userId ?? 0,
          label,
        });
      } else {
        enqueueAction(userId, {
          kind: "create",
          payload: finalLearningData,
          userId: userId ?? 0,
          label,
        });
      }
      setSyncQueueCount(queueLength(userId));
      showToast(
        `オフラインのため保存を保留しました。「${label}」はオンライン復帰時に自動送信します。`,
        "warning"
      );
      return;
    }

    try {
      let finalLearningData = { ...learningData };

      finalLearningData.user_id = userId;
      // 添付ファイルがどのリポジトリのものかを記録しておく。後で使用リポジトリを
      // 切り替えても、この記録の添付が指すリポジトリが分かるようにするため
      finalLearningData.repo_name = repoName;

      // 添付ファイルのうち、アップロード・作成・編集が必要なものをすべて反映する。
      // 1件でも失敗したら全体を中断する（一部だけ保存されて添付情報とズレるのを防ぐため）
      if (editedFiles.length > 0) {
        const uploadedShaByPath = new Map<string, string>();
        for (const editedFile of editedFiles) {
          const newCommitSha = await handleUpdateFile(
            editedFile.path,
            editedFile.content,
            editedFile.sha,
            { contentIsBase64: editedFile.contentIsBase64 }
          );
          if (!newCommitSha) {
            throw new Error("File update failed, aborting learning record save.");
          }
          uploadedShaByPath.set(editedFile.path, newCommitSha);
        }

        // ダイアログ側では、アップロード予定のファイルをsha:nullのプレースホルダーとして
        // github_pathに含めている。ここで実際のcommit shaに差し替える
        const attachments = parseAttachments(
          finalLearningData.github_path,
          finalLearningData.commit_sha
        ).map((a) => ({ path: a.path, sha: uploadedShaByPath.get(a.path) ?? a.sha }));
        const serialized = serializeAttachments(attachments);
        finalLearningData.github_path = serialized.github_path;
        finalLearningData.commit_sha = serialized.commit_sha;
      }

      // 1. category_idが空文字列ならnullに変換する
      if (finalLearningData.category_id === "") {
        finalLearningData.category_id = null;
      }

      let systemMessageText = "";

      if (finalLearningData.id) {
        // IDがあれば更新
        await updateLearningApi(finalLearningData.id, finalLearningData);
        systemMessageText = `「${finalLearningData.title}」を更新しました。`;
      } else {
        // IDがなければ新規作成。保存前の件数が0件なら、初めての記録として
        // 少し特別なメッセージにし、継続（連続記録）への動機づけにする
        const isFirstEverRecord = learningRecordCountRef.current === 0;
        await createLearningApi(finalLearningData);
        systemMessageText = isFirstEverRecord
          ? `🎉「${finalLearningData.title}」を最初の記録として登録しました！これで連続記録がスタートです。明日も記録して続けてみましょう。`
          : `「${finalLearningData.title}」を登録しました。`;
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
      // 他端末での登録などにより、クライアント側の件数チェックをすり抜けて
      // サーバー側の上限チェックに引っかかった場合の案内
      const apiError = error as { response?: { status?: number; data?: string } };
      if (!learningData.id && apiError?.response?.status === 403) {
        showToast(
          apiError.response?.data ||
            `フリープランでは学習記録は${FREE_PLAN_LIMIT}件までとなっています。`,
          "warning",
          { action: { label: "プランを見る", onClick: () => setPlanDialogOpen(true) } }
        );
      } else {
        showToast(`登録またはファイルの更新に失敗しました: ${error}`, "error");
      }
      throw error;
    }
  };

  // 検索欄にタイトルだけ入力して「⚡」を押したとき、ダイアログを開かずその場で
  // 最小限の記録を作る（カテゴリー・メモなどは後から編集で追加できる）
  const handleQuickAdd = async (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    await handleSubmitLearning({
      learningData: {
        title: trimmed,
        heading_text: "",
        explanatory_text: "",
        understanding_level: null,
        reference_url: "",
        category_id: null,
        tags: [],
        github_path: "",
        commit_sha: null,
        created_at: new Date().toISOString(),
      },
      editedFiles: [],
    });
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

  // 検索結果・タグ絞り込み結果を、選択中のソート条件で並べ替える共通処理
  const sortLearningRecords = (
    records: LearningRecord[],
    sort: string
  ): LearningRecord[] => {
    const toTime = (d?: string) => (d ? new Date(d).getTime() || 0 : 0);
    const sorted = [...records];
    switch (sort) {
      case "name-desc":
        sorted.sort((a, b) => b.title.localeCompare(a.title, "ja"));
        break;
      case "understanding-desc":
        // 未設定（メモのみ）は最後尾に回す
        sorted.sort(
          (a, b) => (b.understanding_level ?? -1) - (a.understanding_level ?? -1)
        );
        break;
      case "understanding-asc":
        sorted.sort(
          (a, b) => (a.understanding_level ?? 6) - (b.understanding_level ?? 6)
        );
        break;
      case "date-desc":
        sorted.sort((a, b) => toTime(b.created_at) - toTime(a.created_at));
        break;
      case "date-asc":
        sorted.sort((a, b) => toTime(a.created_at) - toTime(b.created_at));
        break;
      case "name-asc":
      default:
        sorted.sort((a, b) => a.title.localeCompare(b.title, "ja"));
        break;
    }
    return sorted;
  };

  const handleSearch = (query: string) => {
    const trimmedQuery = query.trim();

    const userMessage: Message = {
      id: Date.now(),
      text: trimmedQuery || `詳細検索\n${describeSearchFilters(searchFilters)}`,
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
        (item) => item.category_name?.toString() === searchFilters.category
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

    // 3. テキストクエリでフィルタリング
    // メモとして使いやすいよう、タイトル・本文だけでなく参考URL/カテゴリ/タグも対象にし、
    // スペース区切りの複数キーワードはAND検索にする
    if (trimmedQuery) {
      const keywords = trimmedQuery
        .toLowerCase()
        .split(/[\s\u3000]+/) // 半角・全角スペース区切り
        .filter((k) => k.length > 0);

      results = results.filter((item) => {
        const searchableText = [
          item.title,
          item.explanatory_text,
          parseReferenceUrls(item.reference_url).join(" "),
          item.category_name,
          item.tags.join(" "),
        ]
          .join("\n")
          .toLowerCase();

        return keywords.every((keyword) => searchableText.includes(keyword));
      });
    }

    // 4. 結果をソート
    results = sortLearningRecords(results, searchFilters.sort);

    // 5. 結果メッセージを生成（カード描画は共通関数へ）。
    // フリーワード検索で0件だった場合は、そのキーワードをタイトルにして
    // その場で新しく記録できる導線を出す（行き止まりにしない）
    postResultCards(
      results,
      `🔎 検索結果: ${results.length}件`,
      trimmedQuery
        ? {
            emptyActionLabel: `「${trimmedQuery}」で新しく記録する`,
            onEmptyAction: () => openNewLearningDialogWithTitle(trimmedQuery),
          }
        : undefined
    );
  };

  // 学習記録の配列を、検索結果カードとしてチャットに投稿する共通処理
  const postResultCards = (
    results: LearningRecord[],
    header: string,
    emptyAction?: { emptyActionLabel: string; onEmptyAction: () => void }
  ) => {
    setTimeout(() => {
      const searchResultMessage: Message = {
        id: Date.now() + 1,
        text: header,
        timestamp: new Date().toLocaleTimeString("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: "left",
        displayName: "システム",
        cards: results,
        emptyActionLabel: emptyAction?.emptyActionLabel,
        onEmptyAction: emptyAction?.onEmptyAction,
      };
      setMessages((prev) => [...prev, searchResultMessage]);
    }, 500);
  };

  // 理解度0（全く理解できていない）または5（完璧に理解済み）の記録は復習対象から除外する
  const isReviewable = (item: LearningRecord) =>
    item.understanding_level !== 0 && item.understanding_level !== 5;

  // 今日の復習：間隔反復(SRS)で復習期日が来た記録を優先し、フラッシュカードで振り返る
  const handleReview = () => {
    const reviewableItems = learningData.filter(isReviewable);
    // 間隔反復(SRS)で本日が期日の記録を優先。期日のものが無ければ、全体から先取り学習として出す
    const dueItems = reviewableItems.filter((item) => isDue(userId, item.id));
    const pool = dueItems.length > 0 ? dueItems : reviewableItems;

    // 件数は絞らず並べ替えだけ行い、実際に何件・どのカテゴリー/タグをやるかは
    // ReviewFlashcards側の絞り込み・スキマ時間の選択に委ねる
    const candidates = pool
      .map((item) => ({ item, card: getCard(userId, item.id) }))
      .sort((a, b) => {
        // 期日が早い順（＝より前から待たされているもの優先） → 同じなら理解度が低い順
        const dateCompare = a.card.nextReviewDate.localeCompare(b.card.nextReviewDate);
        if (dateCompare !== 0) return dateCompare;
        return (a.item.understanding_level ?? 3) - (b.item.understanding_level ?? 3);
      })
      .map((x) => x.item);
    setReviewItems(candidates);
    setReviewOpen(true);
  };

  // 通知の「今すぐ復習」や、ホーム画面ショートカットの「クイック記録」から開かれた場合、
  // データ読み込み後に該当の画面を自動で開く
  useEffect(() => {
    if (dataLoading) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("review") === "1") {
      handleReview();
      window.history.replaceState({}, "", "/LearningContent");
    } else if (params.get("quickadd") === "1") {
      openNewLearningDialog();
      window.history.replaceState({}, "", "/LearningContent");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoading]);

  // フラッシュカードの「わかった/まだ」で理解度を更新する
  const handleRateReview = async (
    item: LearningRecord,
    newLevel: number,
    understood: boolean
  ) => {
    // 間隔反復のスケジュールを更新（次回復習日を計算）
    const card = reviewCard(userId, item.id, understood);

    // 理解度が実際に変わる場合のみAPIを呼ぶ（無駄な通信を避ける）
    if (newLevel !== item.understanding_level) {
      // category_name から category_id を解決（更新APIはidが必要）
      const category = allCategories.find((c) => c.name === item.category_name);
      const payload = {
        id: item.id,
        title: item.title,
        explanatory_text: item.explanatory_text,
        understanding_level: newLevel,
        reference_url: item.reference_url,
        created_at: item.created_at,
        category_id: category ? category.id : null,
        tags: item.tags,
        github_path: item.github_path,
        commit_sha: item.commit_sha,
      };

      if (!navigator.onLine) {
        // オフライン時は他の編集操作と同様に保留し、オンライン復帰時に自動送信する
        enqueueAction(userId, {
          kind: "update",
          id: item.id,
          payload,
          userId: userId ?? 0,
          label: item.title,
        });
        setSyncQueueCount(queueLength(userId));
      } else {
        await updateLearningApi(item.id, payload);
        await refetchData();
      }
    }

    showToast(
      understood
        ? `わかった！次回の復習は${card.intervalDays}日後です。`
        : "まだ、ですね。明日また復習しましょう。",
      "info"
    );
  };

  // 検索結果カードの星を直接クリックして理解度を更新する（編集ダイアログを開かずに済む）
  const handleRateChange = async (id: number, newValue: number | null) => {
    const item = learningData.find((l) => l.id === id);
    if (!item || newValue === item.understanding_level) return;

    const previousLevel = item.understanding_level;
    setLearningData((prev) =>
      prev.map((l) => (l.id === id ? { ...l, understanding_level: newValue } : l))
    );

    // category_name から category_id を解決（更新APIはidが必要）
    const category = allCategories.find((c) => c.name === item.category_name);
    const payload = {
      id: item.id,
      title: item.title,
      heading_text: item.heading_text,
      explanatory_text: item.explanatory_text,
      understanding_level: newValue,
      reference_url: item.reference_url,
      created_at: item.created_at,
      category_id: category ? category.id : null,
      tags: item.tags,
      github_path: item.github_path,
      commit_sha: item.commit_sha,
      user_id: userId,
    };

    if (!navigator.onLine) {
      enqueueAction(userId, {
        kind: "update",
        id: item.id,
        payload,
        userId: userId ?? 0,
        label: item.title,
      });
      setSyncQueueCount(queueLength(userId));
      return;
    }

    try {
      await updateLearningApi(item.id, payload);
    } catch (error) {
      console.error("Failed to update rating:", error);
      showToast("評価の更新に失敗しました。", "error");
      setLearningData((prev) =>
        prev.map((l) => (l.id === id ? { ...l, understanding_level: previousLevel } : l))
      );
    }
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

    const filtered = learningData.filter((item) => item.tags.includes(tag));
    const results = sortLearningRecords(filtered, searchFilters.sort);

    postResultCards(results, `🏷️ タグ「#${tag}」の学習記録: ${results.length}件`);
  };

  // 新規学習記録ダイアログを開く（左メニュー・下部ナビ両方から使う共通処理）
  const openNewLearningDialog = () => {
    setEditingItem(null);
    setSharePrefill(null); // 共有の初期値が残らないようにする
    localStorage.removeItem("sharePrefillPending");
    setOpenNewDialog(true);
  };

  // 検索結果が0件だったときの「この内容で新しく記録する」導線用に、
  // タイトルだけ入力済みの状態でダイアログを開く
  const openNewLearningDialogWithTitle = (title: string) => {
    setEditingItem(null);
    setSharePrefill({ title });
    localStorage.removeItem("sharePrefillPending");
    setOpenNewDialog(true);
  };

  // 復習候補（間隔反復で本日が期日）の件数
  const reviewCount = learningData.filter((l) => isReviewable(l) && isDue(userId, l.id)).length;

  // アプリアイコンに未読の復習件数バッジを表示（対応ブラウザ・PWAインストール時のみ）
  useEffect(() => {
    updateAppBadge(reviewCount);
  }, [reviewCount]);

  // 共有(Web Share Target)で開かれたら、共有内容を新規登録フォームに反映する。
  // 未ログインだとGitHubログインのリダイレクトを挟むため、共有内容は一旦
  // localStorageへ退避し、ログイン往復後の再マウントで復元してフォームを開く。
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const title = params.get("title") || "";
    const text = params.get("text") || "";
    const url = params.get("url") || "";

    let prefill: {
      title?: string;
      explanatory_text?: string;
      reference_url?: string;
    } | null = null;

    if (title || text || url) {
      const urlFromText = /https?:\/\/\S+/.exec(text)?.[0] || "";
      const refUrl = url || urlFromText;
      prefill = {
        title: title || (text && !refUrl ? text.slice(0, 60) : ""),
        reference_url: refUrl,
        explanatory_text: text && text !== refUrl ? text : "",
      };
      // ログインのリダイレクトを挟んでも復元できるよう退避
      localStorage.setItem(
        "sharePrefillPending",
        JSON.stringify({ prefill, ts: Date.now() })
      );
      // URLから共有パラメータを消して、リロードでの再発火を防ぐ
      window.history.replaceState({}, "", "/LearningContent");
    } else {
      // URLに無ければ、退避済みの共有内容（ログイン往復後など）を復元
      const saved = localStorage.getItem("sharePrefillPending");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // 10分以内のものだけ有効（古い残骸で誤爆しない）
          if (parsed?.ts && Date.now() - parsed.ts < 10 * 60 * 1000) {
            prefill = parsed.prefill;
          } else {
            localStorage.removeItem("sharePrefillPending");
          }
        } catch {
          localStorage.removeItem("sharePrefillPending");
        }
      }
    }

    if (prefill) {
      setSharePrefill(prefill);
      setEditingItem(null);
      setOpenNewDialog(true);
    }
  }, []);

  // データが揃ったら、条件を満たせば復習リマインドを通知する（1日1回）
  useEffect(() => {
    if (learningData.length > 0) {
      maybeNotifyReview(reviewCount);
    }
    // reviewCount は learningData から算出されるため依存はlearningDataで十分
  }, [learningData]);

  // 復習リマインド通知のオン/オフ
  const handleToggleReminders = async () => {
    if (remindersOn) {
      setRemindersEnabled(false);
      setRemindersOn(false);
      return;
    }
    const perm = await requestAndEnableReminders();
    if (perm === "granted") {
      setRemindersOn(true);
      showTestReminder(reviewCount);
    } else if (perm === "denied") {
      showToast(
        "通知がブロックされています。ブラウザの設定から本サイトの通知を許可してください。",
        "warning"
      );
    } else if (perm === "unsupported") {
      showToast("お使いのブラウザは通知に対応していません。", "warning");
    }
  };

  // 省データモードのON/OFF切り替え
  const handleToggleDataSaver = () => {
    const next = !dataSaverOn;
    setDataSaverOn(next);
    setDataSaverEnabled(next);
    if (!next && !hasFetchedFiles) {
      // OFFに戻したら、まだ取得していなければすぐ取りに行く
      fetchGitHubFiles();
    }
    showToast(
      next
        ? "省データモードをONにしました。画像やファイル一覧は必要な時だけ読み込みます。"
        : "省データモードをOFFにしました。",
      "info"
    );
  };

  // 未認証時の表示
  if (!isAuthenticated) {
    const showGuide = !isAuthenticating && !isLoggingIn;
    return (
      <Box
        sx={{
          minHeight: "100vh",
          background: (theme) =>
            `linear-gradient(135deg, ${alpha(
              theme.palette.primary.main,
              theme.palette.mode === "dark" ? 0.18 : 0.08
            )} 0%, ${theme.palette.background.default} 60%)`,
        }}
      >
        {/* ログインカード */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            px: 2,
            pt: { xs: 6, sm: 9 },
            pb: showGuide ? 5 : 6,
          }}
        >
          <Box
            sx={{
              maxWidth: 440,
              width: "100%",
              textAlign: "center",
              bgcolor: "background.paper",
              borderRadius: 4,
              boxShadow: (theme) =>
                `0 12px 40px ${alpha(theme.palette.primary.main, 0.15)}`,
              p: { xs: 4, sm: 6 },
            }}
          >
            {isAuthenticating || isLoggingIn ? (
              <>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  接続中です…
                </Typography>
                <Typography sx={{ mt: 1, color: "text.secondary" }}>
                  {isAuthenticating
                    ? "GitHubアカウントを確認しています。バックエンドが起動中の場合、数十秒かかることがあります。"
                    : "GitHubのログイン画面に移動します。"}
                </Typography>
              </>
            ) : (
              <>
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
                  onClick={() => {
                    setIsLoggingIn(true);
                    login();
                  }}
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
              </>
            )}
          </Box>
        </Box>

        {/* 使い方の詳しい説明はトップページに集約し、ここでは重複させない */}
        {showGuide && (
          <Box sx={{ textAlign: "center", pb: 6 }}>
            <Button component={RouterLink} to="/" startIcon={<ArrowBackIcon />}>
              使い方の説明はトップページをご覧ください
            </Button>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          // スマホでは全幅、PCでは左メニュー分（折りたたみ時は縮小分）だけ右に寄せる
          width: { xs: "100%", sm: `calc(100% - ${drawerWidth}px)` },
          ml: { xs: 0, sm: `${drawerWidth}px` },
          transition: (theme) =>
            theme.transitions.create(["width", "margin"], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
        }}
      >
        <Toolbar sx={{ gap: 0.5 }}>
          {/* スマホ用のメニューは下部ナビの「メニュー」に統一（重複を避けるためハンバーガーは非表示） */}
          <Avatar
            sx={{
              bgcolor: "rgba(255,255,255,0.2)",
              width: 38,
              height: 38,
              mr: 1.5,
              display: { xs: "none", sm: "flex" }, // スマホでは省スペースのため非表示
            }}
          >
            <SmartToyIcon fontSize="small" />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{ lineHeight: 1.2, fontSize: { xs: "1rem", sm: "1.25rem" } }}
            >
              学習ログ
            </Typography>
            <Typography
              variant="caption"
              noWrap
              sx={{
                color: "rgba(255,255,255,0.8)",
                display: { xs: "none", sm: "block" }, // スマホでは非表示
              }}
            >
              タイトルやタグで、記録した学びを検索
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          {!isOnline && (
            <Tooltip title="オフラインです。変更はオンライン復帰時に自動送信します">
              <Chip
                icon={<WifiOffIcon />}
                label="オフライン"
                size="small"
                color="warning"
                sx={{ mr: 1, color: "#fff", "& .MuiChip-icon": { color: "#fff" } }}
              />
            </Tooltip>
          )}
          {syncQueueCount > 0 && (
            <Tooltip title="オンライン復帰時に自動で同期されます">
              <Chip
                icon={<CloudSyncIcon />}
                label={`${syncQueueCount}件 同期待ち`}
                size="small"
                onClick={handleFlushQueue}
                sx={{
                  mr: 1,
                  bgcolor: "rgba(255,255,255,0.15)",
                  color: "#fff",
                  "& .MuiChip-icon": { color: "#fff" },
                }}
              />
            </Tooltip>
          )}
          {/* 「記録する」はスマホでは下部ナビ中央の丸ボタンと重複するため、PCのみここに大きめのボタンで表示する */}
          <Button
            color="secondary"
            variant="contained"
            size="small"
            startIcon={<AddCircleOutlineIcon />}
            onClick={openNewLearningDialog}
            sx={{
              mr: 0.5,
              display: { xs: "none", sm: "inline-flex" },
            }}
          >
            記録する
          </Button>
          {/* 「今日の復習」はスマホでは下部ナビと重複するため、PCのみボタンで表示する */}
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
          <Tooltip title={`学習の記録（現在${currentStreak}日連続）`}>
            <IconButton
              color="inherit"
              size="small"
              onClick={() => setStreakOpen(true)}
              sx={{ mr: 0.5 }}
            >
              <Badge
                badgeContent={currentStreak}
                max={999}
                invisible={currentStreak <= 0}
                sx={{
                  "& .MuiBadge-badge": {
                    bgcolor: "#f97316",
                    color: "#fff",
                    fontWeight: 700,
                  },
                }}
              >
                <LocalFireDepartmentIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          {/* 「一覧表示」「学習分析ダッシュボード」は左メニューと重複するため、AppBarには置かない */}
          <Tooltip
            title={
              colorMode.mode === "dark"
                ? "ライトモードに切り替え"
                : "ダークモードに切り替え"
            }
          >
            <IconButton color="inherit" size="small" onClick={colorMode.toggle}>
              {colorMode.mode === "dark" ? (
                <Brightness7Icon />
              ) : (
                <Brightness4Icon />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip title="使い方・機能説明">
            <IconButton
              color="inherit"
              size="small"
              onClick={() => setHelpOpen(true)}
            >
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
        {dataLoading && (
          <LinearProgress
            color="secondary"
            sx={{ height: 2, position: "absolute", bottom: 0, left: 0, right: 0 }}
          />
        )}
      </AppBar>
      <LeftToolBar
        onFileSelect={(path) => {
          handleFileSelect(path);
          setMobileNavOpen(false);
        }}
        onManageFiles={() => {
          handleFolderSelect();
          setMobileNavOpen(false);
        }}
        onManage={() => {
          setIsManageOpen(true);
          setMobileNavOpen(false);
        }}
        onOpenList={() => {
          setListDialogOpen(true);
          setMobileNavOpen(false);
        }}
        onOpenAnalytics={() => {
          setAnalyticsOpen(true);
          setMobileNavOpen(false);
        }}
        onOpenGraph={() => {
          setGraphOpen(true);
          setMobileNavOpen(false);
        }}
        onOpenPlans={() => {
          setPlanDialogOpen(true);
          setMobileNavOpen(false);
        }}
        onOpenInquiries={
          isAdmin
            ? () => {
                setInquiryManageOpen(true);
                setMobileNavOpen(false);
              }
            : undefined
        }
        onLogout={() => {
          logout();
          setMobileNavOpen(false);
        }}
        files={githubFiles}
        loading={filesLoading}
        filesNotFetched={!hasFetchedFiles}
        onRequestFiles={fetchGitHubFiles}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: "background.default",
          p: { xs: 0, sm: 3 }, // スマホでは余白を削除
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Toolbar sx={{ display: { xs: "none", sm: "flex" } }} /> {/* スマホでは非表示 */}

        <Paper
          elevation={3}
          sx={{
            width: { xs: "100%", sm: "80vw" },
            // xs（スマホ）: vh/dvh/svhなどビューポート単位の計算に頼ると、
            // スクロールでブラウザのURLバーが出入りするたびに値がズレて
            // 隙間や重なりが再発していた。position:fixed + top/bottomなら
            // ブラウザが「実際に見えている範囲」にその都度直接合わせてくれるため、
            // 高さを自前で計算する必要が無くなり、ズレが起きようがない
            // 下部ナビもこのPaperの中に含め、メッセージ一覧・タグ絞り込み・
            // 入力欄・下部ナビをすべて同じ1本のflex columnで管理する。
            // 別々にposition:fixedさせて双方のtop/bottomの数値を
            // 一致させ続けるより、こちらの方がズレようがなく確実
            position: { xs: "fixed", sm: "relative" },
            top: { xs: `${APPBAR_HEIGHT_XS}px`, sm: "auto" },
            bottom: { xs: 0, sm: "auto" },
            left: { xs: 0, sm: "auto" },
            right: { xs: 0, sm: "auto" },
            height: { xs: "auto", sm: "85vh" },
            maxWidth: { sm: "600px" },
            maxHeight: { sm: "900px" },
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            margin: { xs: 0, sm: "auto" },
            borderRadius: { xs: 0, sm: 2 }, // スマホでは角丸なし
          }}
        >
          {/* メッセージ一覧（タグ絞り込み・入力欄より上の範囲だけをスクロールさせる） */}
          <Box
            id="style-1"
            component="div"
            sx={{
              flexGrow: 1,
              minHeight: 0,
              overflowY: "auto",
              // iOSのSafariは、この内部スクロールが上端/下端に達した後も
              // 指を動かし続けると、その勢い(momentum)がページ本体の
              // バウンス/URLバー表示アニメーションに伝播してしまうことがある
              // （body側でoverflow:hiddenにしていても、これはCSSのoverflowと
              // は別のタッチイベント層の挙動のため止まらない）。
              // overscroll-behaviorでスクロールの伝播そのものを断つ
              overscrollBehavior: "contain",
              p: { xs: 1.5, sm: 2.5 },
              bgcolor: "background.default",
            }}
          >
            {messages.map((msg) =>
              msg.type === "left" ? (
                msg.cards ? (
                  <LearningResultCards
                    key={msg.id}
                    header={msg.text}
                    timestamp={msg.timestamp}
                    items={msg.cards}
                    allItems={learningData}
                    onViewFile={(path, commitSha) =>
                      handleViewFile(path, false, commitSha ?? undefined)
                    }
                    onEdit={openEditDialog}
                    onDelete={handleDeleteWithUndo}
                    onRateChange={handleRateChange}
                    onOpenRelated={openEditDialog}
                    onPublish={setPublishingItem}
                    emptyActionLabel={msg.emptyActionLabel}
                    onEmptyAction={msg.onEmptyAction}
                  />
                ) : (
                  <MessageLeft
                    key={msg.id}
                    message={msg.text}
                    timestamp={msg.timestamp}
                    photoURL={msg.photoURL}
                    displayName={msg.displayName}
                    action={msg.action}
                  />
                )
              ) : (
                <MessageRight
                  key={msg.id}
                  message={msg.text}
                  timestamp={msg.timestamp}
                />
              )
            )}
            {dataLoading && (
              <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1, mb: 1.75 }}>
                <Skeleton variant="circular" width={36} height={36} />
                <Box sx={{ width: "60%", maxWidth: 240 }}>
                  <Skeleton variant="rounded" height={18} width="40%" sx={{ mb: 0.5 }} />
                  <Skeleton variant="rounded" height={48} />
                </Box>
              </Box>
            )}
            <div ref={messageEndRef} />
          </Box>

          {/* フリープラン向けの広告枠（Proプランを実装したら isPro で非表示にする） */}
          <AdBanner />

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
              onQuickAdd={handleQuickAdd}
            />
          </Box>

          {/* スマホ用ボトムナビ：片手操作で主要な導線に届くように画面下部へ集約。
              メッセージ一覧・タグ絞り込み・入力欄と同じPaperの中でflex columnの
              最後の要素にすることで、独自にposition:fixedする必要がなくなる。
              「記録」は最も押す頻度が高いため中央に、バーの上に少しはみ出す
              大きめの丸ボタンとして目立たせる */}
          <Box
            sx={{
              display: { xs: "flex", sm: "none" },
              position: "relative",
              flexShrink: 0,
              height: BOTTOM_NAV_HEIGHT,
              borderTop: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Box sx={{ display: "flex", width: "100%", justifyContent: "space-around", alignItems: "stretch" }}>
              {[
                { label: "検索", icon: <SearchOutlinedIcon />, onClick: () => setOpenSearchDialog(true) },
                { label: "復習", icon: <MenuBookOutlinedIcon />, onClick: handleReview },
              ].map((item) => (
                <Box
                  key={item.label}
                  component="button"
                  onClick={item.onClick}
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.25,
                    border: "none",
                    background: "none",
                    color: "text.secondary",
                    cursor: "pointer",
                    font: "inherit",
                    "& svg": { fontSize: 22 },
                  }}
                >
                  {item.icon}
                  <Box component="span" sx={{ fontSize: "0.65rem", lineHeight: 1 }}>
                    {item.label}
                  </Box>
                </Box>
              ))}

              {/* 中央の丸ボタン用スペース */}
              <Box sx={{ flex: 1 }} />

              {[
                { label: "一覧", icon: <TableRowsIcon />, onClick: () => setListDialogOpen(true) },
                { label: "メニュー", icon: <MenuIcon />, onClick: () => setMobileNavOpen(true) },
              ].map((item) => (
                <Box
                  key={item.label}
                  component="button"
                  onClick={item.onClick}
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.25,
                    border: "none",
                    background: "none",
                    color: "text.secondary",
                    cursor: "pointer",
                    font: "inherit",
                    "& svg": { fontSize: 22 },
                  }}
                >
                  {item.icon}
                  <Box component="span" sx={{ fontSize: "0.65rem", lineHeight: 1 }}>
                    {item.label}
                  </Box>
                </Box>
              ))}
            </Box>

            <Box
              component="button"
              onClick={openNewLearningDialog}
              aria-label="記録する"
              sx={{
                position: "absolute",
                left: "50%",
                top: -18,
                transform: "translateX(-50%)",
                width: 58,
                height: 58,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                bgcolor: "primary.main",
                color: "primary.contrastText",
                boxShadow: 3,
                cursor: "pointer",
                "& svg": { fontSize: 30 },
              }}
            >
              <AddCircleOutlineIcon />
            </Box>
          </Box>
        </Paper>
      </Box>

      <NewLearningDialog
        open={openNewDialog}
        onClose={() => {
          setOpenNewDialog(false);
          setSharePrefill(null); // 閉じたら共有の初期値をクリア
          localStorage.removeItem("sharePrefillPending"); // 退避した共有内容も消費済みに
        }}
        onSubmit={handleSubmitLearning} // ★ 汎用ハンドラを渡す
        allTags={allTags}
        allCategories={allCategories}
        editingData={editingItem} // ★ 編集データを渡す
        prefillData={sharePrefill} // ★ 共有からの初期値
        onFetchFile={fetchFileForDialog}
      />

      {/* ゲストモードの記録インポート確認 */}
      <Dialog open={guestImportOpen} onClose={() => !guestImportBusy && setGuestImportOpen(false)} maxWidth="xs" fullWidth fullScreen={fullScreenDialog}>
        <DialogTitle>ゲストモードの記録をインポートしますか？</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1.5 }}>
            この端末にゲストモードで記録した学習記録が{guestImportRecords.length}件あります。あなたのアカウントに取り込みますか？
          </DialogContentText>
          <List dense sx={{ maxHeight: 200, overflow: "auto", border: 1, borderColor: "divider", borderRadius: 1 }}>
            {guestImportRecords.map((r) => (
              <ListItem key={r.id}>
                <ListItemText primary={r.title} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button disabled={guestImportBusy} onClick={() => setGuestImportOpen(false)}>
            スキップ
          </Button>
          <Button variant="contained" disabled={guestImportBusy} onClick={handleImportGuestRecords}>
            {guestImportBusy ? "インポート中…" : "インポートする"}
          </Button>
        </DialogActions>
      </Dialog>

      <GitHubFileViewerDialog
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        path={viewingContent.path}
        content={viewingContent.content}
        base64Content={viewingContent.base64Content}
        // ★★★ 編集可能フラグをpropsとして渡す ★★★
        isEditable={isViewerEditable}
        onUpdateFile={async (path, newContent) => {
          await handleUpdateFile(path, newContent, viewingContent.sha);
          return;
        }}
        dataSaverOn={dataSaverOn}
      />
      {/* カテゴリー・タグの管理（追加・編集・削除）ダイアログ */}
      <ManageDialog
        open={isManageOpen}
        onClose={() => setIsManageOpen(false)}
        categories={allCategories}
        tags={allTags}
        categoryLimit={FREE_CATEGORY_LIMIT}
        tagLimit={FREE_TAG_LIMIT}
        onChanged={refetchData}
      />
       <GitHubFolderSelector
        open={isFolderSelectorOpen}
        onClose={() => setIsFolderSelectorOpen(false)}
        onSelectFolder={() => setIsFolderSelectorOpen(false)}
        githubLogin={githubLoginSafe}
        repoName={repoNameSafe}
        accessToken={tokenSafe}
        setSelectedPath={() => {}}
        standalone
        onRepoChanged={setRepoName}
      />

      {/* 学習の記録（連続日数・草グラフ） */}
      <StreakDialog
        open={streakOpen}
        onClose={() => setStreakOpen(false)}
        dates={learningData.map((l) => l.created_at)}
      />

      {/* 一覧(テーブル)表示：まとめて見比べたいとき用 */}
      <LearningListDialog
        open={listDialogOpen}
        onClose={() => setListDialogOpen(false)}
        items={learningData}
        categories={allCategories}
        onViewFile={(path, commitSha) =>
          handleViewFile(path, false, commitSha ?? undefined)
        }
        onEdit={(id) => {
          setListDialogOpen(false);
          openEditDialog(id);
        }}
        onDelete={(id) => {
          setListDialogOpen(false);
          handleDeleteWithUndo(id);
        }}
        onPublish={setPublishingItem}
        onAddNew={() => {
          setListDialogOpen(false);
          openNewLearningDialog();
        }}
      />

      {/* 学習分析ダッシュボード */}
      <LearningAnalyticsDialog
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        items={learningData}
      />

      {/* 学びのつながり（グラフビュー） */}
      <RelatedGraphDialog
        open={graphOpen}
        onClose={() => setGraphOpen(false)}
        items={learningData}
        onOpenItem={(id) => {
          setGraphOpen(false);
          openEditDialog(id);
        }}
      />

      {/* プラン比較（課金ロジックなし） */}
      <PlanComparisonDialog
        open={planDialogOpen}
        onClose={() => setPlanDialogOpen(false)}
        userId={userId}
        githubLogin={githubLogin}
        usage={{
          records: learningData.length,
          recordLimit: FREE_PLAN_LIMIT,
          categories: allCategories.length,
          categoryLimit: FREE_CATEGORY_LIMIT,
          tags: allTags.length,
          tagLimit: FREE_TAG_LIMIT,
        }}
      />

      {/* お問い合わせ管理（管理者のみ） */}
      {isAdmin && (
        <InquiryManageDialog
          open={inquiryManageOpen}
          onClose={() => setInquiryManageOpen(false)}
        />
      )}

      {/* 記事化プレビュー */}
      <ArticlePreviewDialog
        open={publishingItem !== null}
        onClose={() => setPublishingItem(null)}
        item={publishingItem}
        githubConnected={!!octokit}
        onSaveToGitHub={handlePublishArticle}
      />

      {/* 今日の復習（フラッシュカード） */}
      <ReviewFlashcards
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        items={reviewItems.map((it) => ({
          id: it.id,
          title: it.title,
          explanatory_text: it.explanatory_text,
          understanding_level: it.understanding_level,
          category_name: it.category_name,
          tags: it.tags,
          reference_url: it.reference_url,
        }))}
        onRate={(fi, newLevel, understood) => {
          const rec = reviewItems.find((r) => r.id === fi.id);
          return rec ? handleRateReview(rec, newLevel, understood) : Promise.resolve();
        }}
      />

      {/* ヘルプ（各機能の説明） */}
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} fullWidth maxWidth="sm" fullScreen={fullScreenDialog}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <HelpOutlineIcon color="primary" /> 使い方・機能の説明
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
            左のメニューと下の入力欄から、次のことができます。
          </Typography>
          <List>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40 }}><AddCircleOutlineIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="学んだことを記録する（ヘッダーの「記録する」／スマホ下部ナビ中央の丸ボタン）"
                secondary="タイトル・カテゴリ・タグ・理解度・参考リンク・GitHub上のコードを紐づけて保存できます。ファイル添付は、ボタンからの選択のほか、その場にドラッグ&ドロップしても添付できます。"
              />
            </ListItem>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40 }}><SmartToyIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="学習内容の検索（下の入力欄）"
                secondary="タイトルやキーワードを入力して送信すると、記録した学びをチャット形式で検索できます。結果は「詳細を見る」で1件ずつ開けます。0件のときは、その場で新しく記録するボタンが出ます。"
              />
            </ListItem>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40 }}><FilterListOutlinedIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="詳細検索（入力欄左のつまみアイコン／スマホ下部ナビ「検索」）"
                secondary="カテゴリ・ハッシュタグ・並び順を指定して、条件で絞り込んで検索できます。"
              />
            </ListItem>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40 }}><LocalOfferOutlinedIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="タグでサッと絞り込み（入力欄の上）"
                secondary="登録済みのタグをタップするだけで、そのタグが付いた学習記録だけを表示します。片手でサッと絞り込めます。"
              />
            </ListItem>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40 }}><HubOutlinedIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="関連する過去の記録（詳細を見る）"
                secondary="記録の「詳細を見る」を開くと、タグ・カテゴリー・タイトルが似ている過去の記録を自動でピックアップして表示します。タップするとその記録を開けます。"
              />
            </ListItem>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40 }}><TableRowsIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="一覧表示（左メニュー／スマホ下部ナビ「一覧」）"
                secondary="記録をまとめて見比べられます。PCではテーブル表示のほか、カテゴリーごとに列を分けたボード（カンバン）表示にも切り替えられます。"
              />
            </ListItem>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40 }}><HubOutlinedIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="学びのつながり（左メニュー）"
                secondary="タグ・カテゴリー・タイトルの共通点をもとに、記録同士のつながりをネットワーク図として可視化します。丸をクリックするとその記録を開けます。"
              />
            </ListItem>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40 }}><InsightsOutlinedIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="学習分析ダッシュボード（左メニュー）"
                secondary="カテゴリーや理解度の傾向など、記録全体の統計をグラフで振り返れます。"
              />
            </ListItem>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40 }}><FolderOpenIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="ファイル・フォルダーの管理（左メニュー）"
                secondary="GitHubリポジトリ内のフォルダー作成や、ファイルのアップロード・新規作成・削除をまとめて行えます。"
              />
            </ListItem>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40 }}><TuneIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="カテゴリー・タグの管理（左メニュー）"
                secondary="学習内容を分類するカテゴリーやタグを追加・編集・削除します。"
              />
            </ListItem>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40 }}><UpdateIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="最新データ編集（左メニュー）"
                secondary="GitHubリポジトリ内のファイルを、ファイル名で検索して開けます。左側のアイコンをタップすると一覧を最新の状態に更新します。"
              />
            </ListItem>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40 }}><WorkspacePremiumOutlinedIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="プラン（左メニュー）"
                secondary="フリープランとProプランの違いを確認できます。"
              />
            </ListItem>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40 }}><MenuBookOutlinedIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="今日の復習（ヘッダーの「今日の復習」／スマホ下部ナビ「復習」）"
                secondary="「わかった/まだ」の回答に応じて、次に復習すべき日を自動計算します（Ankiなどと同じ考え方）。わかった内容は次回までの間隔が伸び、まだの内容は翌日にまた出てきます。メモの中で覚えたい語句を[[ ]]で囲むと、復習時にその箇所だけを隠して穴埋めクイズのように確認できます。カテゴリー・タグで復習内容を絞り込んでから、スキマ時間に合わせた件数で始められます。"
              />
            </ListItem>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40 }}><LocalFireDepartmentIcon sx={{ color: "#f97316" }} /></ListItemIcon>
              <ListItemText
                primary="学習の記録（ヘッダーの炎アイコン）"
                secondary="連続で記録した日数（ストリーク）は、ヘッダーの炎アイコンに常にバッジで表示されます。アイコンをタップすると、合計や最長記録をGitHubの「草」のようなグラフで振り返れます。"
              />
            </ListItem>
            <ListItem alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40 }}><DarkModeOutlinedIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="ダークモード（ヘッダーの月／太陽アイコン）"
                secondary="画面を暗い配色に切り替えられます。夜間のスマホ学習に優しく、設定は次回も保持されます。"
              />
            </ListItem>
          </List>

          {/* オンライン・オフラインの違い */}
          <Box
            sx={{
              mt: 1,
              p: 2,
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 1.25 }}
            >
              <WifiOffIcon color="primary" fontSize="small" />
              オンライン・オフラインの違い
            </Typography>
            <Typography variant="caption" sx={{ color: "success.main", fontWeight: 700, display: "block" }}>
              オフラインでもできること
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
              記録の閲覧・タイトル検索・タグ絞り込み・今日の復習・学習分析ダッシュボード。
              記録の登録・編集・削除も一旦保留され、次にオンラインに戻った瞬間（アプリを開き直したときも含む）に自動で送信されます。
            </Typography>
            <Typography variant="caption" sx={{ color: "warning.main", fontWeight: 700, display: "block" }}>
              オンラインが必要なこと
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              初回ログイン、GitHubファイルの添付・プレビュー・編集、カテゴリー・タグの作成・編集・削除。
            </Typography>
          </Box>

          {/* 復習リマインド通知の設定 */}
          {isNotificationSupported() && (
            <Box
              sx={{
                mt: 1,
                p: 2,
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                flexWrap: "wrap",
              }}
            >
              <NotificationsActiveOutlinedIcon color="primary" />
              <Box sx={{ flex: 1, minWidth: 180 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  復習リマインド通知
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  オンにすると、復習がたまっているときに、次にアプリを開いた際に通知でお知らせします。
                  （※アプリを閉じている間に届くサーバー通知ではありません）
                </Typography>
              </Box>
              <Button
                variant={remindersOn ? "outlined" : "contained"}
                size="small"
                onClick={handleToggleReminders}
              >
                {remindersOn ? "オフにする" : "オンにする"}
              </Button>
            </Box>
          )}

          {/* 省データモードの設定 */}
          <Box
            sx={{
              mt: 1.5,
              p: 2,
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexWrap: "wrap",
            }}
          >
            <DataSaverOnIcon color="primary" />
            <Box sx={{ flex: 1, minWidth: 180 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                省データモード
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                外出先のモバイル回線向け。GitHubファイル一覧の自動取得や画像の自動表示を止め、必要な時だけ読み込みます。
              </Typography>
            </Box>
            <Button
              variant={dataSaverOn ? "outlined" : "contained"}
              size="small"
              onClick={handleToggleDataSaver}
            >
              {dataSaverOn ? "オフにする" : "オンにする"}
            </Button>
          </Box>
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
