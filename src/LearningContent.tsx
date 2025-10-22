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

const drawerWidth = 240;

// Base64をデコードするヘルパー関数
const decodeBase64 = (base64String: string) => {
  try {
    // atobはASCII文字しか扱えないため、Unicode文字化けを防ぐための処理
    const decoded = decodeURIComponent(
      Array.prototype.map
        .call(
          atob(base64String),
          (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
        )
        .join("")
    );
    return decoded;
  } catch (e) {
    console.error("Failed to decode base64 string", e);
    return "コンテンツのデコードに失敗しました。";
  }
};

// APIデータの型定義を実際のデータ構造に合わせる
interface LearningRecord {
  id: number;
  title: string;
  explanatory_text: string;
  understanding_level: number;
  reference_url: string | null; // nullの可能性も考慮
  created_at: string;
  category_name: string;
  category_id?: number | string;
  tags: string[];
  github_path: string;
  commit_sha: string | null;
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
  const { isAuthenticated, login } = useContext(AuthContext);
  // APIから取得した学習記録データを保持するState
  const [learningData, setLearningData] = useState<LearningRecord[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]); // SearchDialogに渡すための全タグリスト
  const [allCategories, setAllCategories] = useState<Categories[]>([]);
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

  const fetchFileForDialog = async (
    path: string
  ): Promise<{
    content: string;
    sha: string;
    base64Content: string;
  } | null> => {
    const owner = import.meta.env.VITE_REPO_OWNER;
    const repo = import.meta.env.VITE_REPO_NAME;
    const token = import.meta.env.VITE_ONLY_TOKEN;

    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            Authorization: `token ${token}`,
          },
        }
      );

      if (!response.ok) {
        // ファイルが見つからない場合などもここに含まれる
        return null;
      }

      const data = await response.json();
      return {
        content: decodeBase64(data.content),
        sha: data.sha,
        base64Content: data.content,
      };
    } catch (error) {
      console.error("Error fetching file for dialog:", error);
      return null;
    }
  };

  const [githubFiles, setGithubFiles] = useState<GitHubFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);

  // ★ GitHubからファイルリストを取得する関数 (旧fetchRepoFiles)
  const fetchGitHubFiles = async () => {
    setFilesLoading(true);
    const owner = import.meta.env.VITE_REPO_OWNER;
    const repo = import.meta.env.VITE_REPO_NAME;
    const token = import.meta.env.VITE_ONLY_TOKEN;
    const branch = "main";

    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            Authorization: `token ${token}`,
          },
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch repository tree from GitHub.");
      }
      const data = await response.json();
      const fileList = data.tree
        .filter((item: any) => item.type === "blob")
        .map((item: any) => ({ path: item.path }));

      setGithubFiles(fileList);
    } catch (error) {
      console.error(error);
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
    // .envからの変数読み込み
    const owner = import.meta.env.VITE_REPO_OWNER;
    const repo = import.meta.env.VITE_REPO_NAME;
    const token = import.meta.env.VITE_ONLY_TOKEN;

    try {
      // ★ ファイル内容をUTF-8対応でBase64にエンコード
      const contentBase64 = options.contentIsBase64
        ? content // 既にBase64なのでそのまま使用
        : btoa(unescape(encodeURIComponent(content)));

      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/vnd.github.v3+json",
            Authorization: `token ${token}`,
          },
          body: JSON.stringify({
            message: `Update ${path}`, // コミットメッセージ
            content: contentBase64, // Base64エンコードされた新しいファイル内容
            sha: sha, // ★ 更新対象のファイルの現在のSHA
            branch: "main", // 対象ブランチ
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`GitHub API Error: ${errorData.message}`);
      }

      const responseData = await response.json();
      // ★ 成功した場合、新しいコミットIDを返す
      return responseData.commit.sha;
      // 成功したらダイアログを閉じる
      setViewerOpen(false);
      alert("ファイルを更新しました。");
      // 必要であれば、サイドバーのファイルリストも再取得
      // fetchGitHubFiles();
    } catch (error) {
      console.error("Failed to update file:", error);
      alert(`ファイルの更新に失敗しました。\n${error}`);
      // ★ 失敗した場合、nullを返す
      return null;
    }
  };

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewingContent, setViewingContent] = useState({
    path: "",
    content: "",
    sha: "",
  });
  // ★★★ ビューアが編集可能かどうかを管理するStateを追加 ★★★
  const [isViewerEditable, setIsViewerEditable] = useState(false);

  // ★ GitHubファイルの内容を取得する関数を修正
  const handleViewFile = async (
    path: string,
    editable: boolean,
    commitSha?: string
  ) => {
    const owner = import.meta.env.VITE_REPO_OWNER;
    const repo = import.meta.env.VITE_REPO_NAME;
    const token = import.meta.env.VITE_ONLY_TOKEN;
    // ★ コミットIDがあれば、それをクエリパラメータに追加
    const refQuery = commitSha ? `?ref=${commitSha}` : "";
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}${refQuery}`;
    try {
      const response = await fetch(apiUrl, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `token ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch repository tree from GitHub.");
      }
      const data = await response.json();
      const content = decodeBase64(data.content);
      // ★ 過去のバージョンのファイルは編集不可にする
      const isHistorical = !!commitSha;
      setIsViewerEditable(editable && !isHistorical);

      setViewingContent({ path: data.path, content, sha: data.sha });
      // ★★★ 編集可能フラグをセット ★★★
      setIsViewerEditable(editable);
      setViewerOpen(true);
    } catch (error) {
      console.error(error);
      alert("ファイルの取得に失敗しました。");
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

        if (action === "view-file" && path) {
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
  // ★ カテゴリー追加ダイアログ用のStateを追加
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

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
        learningApi(),
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
  }, []); // 空の依存配列[]を指定することで、初回レンダリング時に一度だけ実行される

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
        await updateLearningApi(finalLearningData.id, finalLearningData);
        systemMessageText = `「${finalLearningData.title}」を更新しました。`;
      } else {
        // IDがなければ新規作成
        await createLearningApi(finalLearningData);
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
      const category_id = category ? category.id : ""; // 見つからなければ空文字

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
      text: trimmedQuery || "(詳細条件のみで検索)",
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

    // 5. 結果メッセージを生成
    let resultText = `<div style="font-weight: bold; margin-bottom: 10px;">検索結果: ${results.length}件</div>`;
    if (results.length > 0) {
      resultText += results
        .map((item) => {
          // タグを装飾するHTMLを生成
          const tagsHtml =
            item.tags.length > 0
              ? item.tags
                  .map(
                    (tag) =>
                      `<span style="background-color: #e0e0e0; color: #333; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; margin-right: 4px; display: inline-block;">${tag}</span>`
                  )
                  .join("")
              : "<span>タグなし</span>";

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
          const justifyContent = item.github_path
            ? "space-between"
            : "flex-end";

          // カード形式のHTMLを返す
          return `
            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 16px; background-color: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
              <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 1.1em; color: #1976d2;">${
                item.title
              }</h3>
              
              <div style="font-size: 0.9em; color: #555; margin-bottom: 12px;">
                <div style="margin-bottom: 6px;">
                  <span style="font-weight: bold;">カテゴリ:</span> ${
                    item.category_name
                  }
                </div>
                <div style="display: flex; align-items: flex-start;">
                  <span style="font-weight: bold; white-space: nowrap; margin-right: 4px;">タグ:</span>
                  <div>${tagsHtml}</div>
                </div>
              </div>

              <p style="font-size: 0.95em; color: #333; line-height: 1.5; margin-top: 0; margin-bottom: 12px; white-space: pre-wrap; word-wrap: break-word;">${
                item.explanatory_text
              }</p>
              
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; border-top: 1px solid #eee; padding-top: 12px;">
                <div>
                  <span style="font-weight: bold;">理解度:</span> ${understandingHtml}
                </div>
                ${
                  item.reference_url
                    ? `<a href="${item.reference_url}" target="_blank" rel="noopener noreferrer" style="color: #1976d2; text-decoration: none; font-weight: bold;">参考リンク 🔗</a>`
                    : ""
                }
              </div>
              
              <div style="display: flex; align-items: center; justify-content: ${justifyContent}; flex-wrap: wrap; gap: 10px;">
                ${
                  item.github_path
                    ? `<div>
                        <button class="view-file-btn" data-action="view-file" data-path="${
                          item.github_path
                        }"${commitShaAttribute} 
                                style="background-color: #1976d2; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                          ファイルを見る (${item.github_path.split("/").pop()})
                        </button>
                      </div>`
                    : "<div></div>"
                }
                <div style="display: flex; gap: 8px; justifyContent: center;">
                  <button class="action-btn-edit" data-action="edit" data-id="${
                    item.id
                  }"
                          style="background-color: #e3f2fd; color: #1976d2; border: 1px solid #bbdefb; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                    編集
                  </button>
                  <button class="action-btn-delete" data-action="delete" data-id="${
                    item.id
                  }"
                          style="background-color: #fbe9e7; color: #c62828; border: 1px solid #ffcdd2; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                    削除
                  </button>
                </div>
              </div>
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

  // 未認証時の表示
  if (!isAuthenticated) {
    return (
      <Container sx={{ textAlign: "center", mt: 10 }}>
        <Typography variant="h4" gutterBottom>
          学習管理アプリへようこそ
        </Typography>
        <Typography sx={{ mb: 4 }}>
          機能を利用するにはGitHubアカウントでの認証が必要です。
        </Typography>
        <Button variant="contained" size="large" onClick={login}>
          GitHubでログイン
        </Button>
      </Container>
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
          <Typography variant="h6" noWrap component="div">
            学習内容検索チャット
          </Typography>
        </Toolbar>
      </AppBar>
      <LeftToolBar
        onAddNewLearning={() => {
          setEditingItem(null);
          setOpenNewDialog(true);
        }}
        onAddNewCategory={handleAddNewCategory}
        onFileSelect={handleFileSelect}
        files={githubFiles}
        loading={filesLoading}
      />
      <Box
        component="main"
        sx={{ flexGrow: 1, bgcolor: "background.default", p: 3 }}
      >
        <Toolbar />
        <Paper
          elevation={3}
          sx={{
            width: "80vw",
            height: "85vh",
            maxWidth: "600px",
            maxHeight: "900px",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
            margin: "auto",
          }}
        >
          <Box
            id="style-1"
            component="div"
            sx={{
              flexGrow: 1,
              overflowY: "auto",
              p: 2,
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
          <SearchDialog
            open={openSearchDialog}
            onClose={() => setOpenSearchDialog(false)}
            onApply={handleApplyFilters}
            currentFilters={searchFilters}
          />
          <TextInputLearning
            onSendMessage={handleSearch}
            onSearchMenuClick={() => setOpenSearchDialog(true)}
          />
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
        onUpdateFile={(path, newContent) =>
          handleUpdateFile(path, newContent, viewingContent.sha)
        }
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
    </Box>
  );
}
