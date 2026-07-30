import React, { useState, useRef, useEffect,useContext } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Rating from "@mui/material/Rating";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import Autocomplete from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { format } from "date-fns";
import GitHubFileSelector from "./GitHubFileSelector";
import UploadFileIcon from "@mui/icons-material/UploadFile";
// Prism（全言語を同梱、数百kB）ではなく PrismAsyncLight
// （言語ごとに動的import、初回表示に必要な分だけ読み込む）を使う
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getFileType, getMimeType } from "./getFileType";
import CircularProgress from "@mui/material/CircularProgress";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import CloseIcon from "@mui/icons-material/Close";
// import FindInPageIcon from "@mui/icons-material/FindInPage";
import * as XLSX from "xlsx";
import Spreadsheet from "react-spreadsheet"; // ★ react-spreadsheet をインポート
import Tabs from "@mui/material/Tabs"; // ★ MUI Tabsをインポート
import Tab from "@mui/material/Tab"; // ★ MUI Tabをインポート
import GitHubFolderSelector from "./GitHubFolderSelector";
import { AuthContext } from "../Context";
import { renderPdfPagesToImages } from "./pdfPreview";
import { extractPptxText, type PptxSlide } from "./pptxPreview";
import { extractDocxText } from "./docxPreview";
import { listZipEntries, type ZipEntry } from "./zipPreview";


// Base64エンコードを行うヘルパー関数
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = (error) => reject(error);
  });

// "src/components/Foo.tsx" のようなフルパスを、フォルダ部分とファイル名部分に分割する
const splitPath = (path: string): { folder: string; file: string } => {
  const trimmed = (path || "").replace(/^\/+/, "");
  const idx = trimmed.lastIndexOf("/");
  if (idx === -1) return { folder: "", file: trimmed };
  return { folder: trimmed.slice(0, idx), file: trimmed.slice(idx + 1) };
};

// 親から受け取るPropsの型定義
interface NewLearningDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  allTags: { name: string }[];
  allCategories: { id: number; name: string }[];
  editingData?: any | null;
  // 共有(Web Share Target)などから、新規登録の初期値を差し込む用
  prefillData?: {
    title?: string;
    explanatory_text?: string;
    reference_url?: string;
  } | null;
  onFetchFile: (
    path: string
  ) => Promise<{ content: string; sha: string; base64Content: string } | null>;
}

export default function NewLearningDialog({
  open,
  onClose,
  onSubmit,
  allTags = [],
  allCategories = [],
  editingData = null,
  prefillData = null,
  onFetchFile,
}: NewLearningDialogProps) {
  // フォーム項目のためのState
  const [title, setTitle] = useState("");
  const [explanatoryText, setExplanatoryText] = useState("");
  const [understandingLevel, setUnderstandingLevel] = useState<number | null>(null);
  const [referenceUrl, setReferenceUrl] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  // 添付ファイルの保存先は「フォルダ」と「ファイル名」を別々のStateで持つ。
  // 1本の文字列(github_path)をパースして扱うと、片方だけ更新したつもりが
  // もう片方の内容を巻き込んで消してしまうバグの温床になるため。
  const [folderPath, setFolderPath] = useState(""); // 例: "src/components"（末尾スラッシュなし、リポジトリ直下なら""）
  const [fileName, setFileName] = useState(""); // 例: "Foo.tsx"
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // フォルダとファイル名を結合した完全パス（前後の余分なスラッシュは除去）。
  // ファイル名が空でフォルダだけ決まっている場合は末尾スラッシュ付きになる。
  const cleanFolderPath = folderPath.replace(/^\/+/, "").replace(/\/+$/, "");
  const github_path = cleanFolderPath ? `${cleanFolderPath}/${fileName}` : fileName;
  const hasAttachment = !!(folderPath || fileName || localFile);

  // ファイルプレビュー用のState
  const [fileContent, setFileContent] = useState("");
  const [fileSha, setFileSha] = useState<string | null>(null);
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [pdfPages, setPdfPages] = useState<string[]>([]); // PDF各ページの画像（閲覧専用）
  const [pptxSlides, setPptxSlides] = useState<PptxSlide[]>([]); // PPTX各スライドのテキスト（閲覧専用）
  const [activeSlideIndex, setActiveSlideIndex] = useState(0); // 表示中のスライド番号
  const [zipEntries, setZipEntries] = useState<ZipEntry[]>([]); // ZIP内のファイル一覧（閲覧専用）

  // ← AuthContext から値を取得（これらは string | null の可能性がある想定）
  const auth = useContext(AuthContext);

  // --- 重要：AuthContext の値が null の可能性があるため、安全なフォールバック変数を作る ---
  const githubLoginSafe: string = (auth && auth.githubLogin) ?? "";
  const repoNameSafe: string = (auth && auth.repoName) ?? "";
  const tokenSafe: string = (auth.token) ?? "";
  // 上の tokenSafe は Context に 'token' ではなく 'accessToken' で入っている場合を念のためカバー


  // ★ スプレッドシートのセルを表す型
  type SpreadsheetCell = {
    value: string | number | null;
    readOnly?: boolean;
  };

  // ★ スプレッドシート用のデータState
  const [spreadsheetData, setSpreadsheetData] = useState<
    SpreadsheetCell[][] | null
  >(null);

  // ★ SheetJSの出力をreact-spreadsheetの形式に変換するヘルパー関数
  // Excelは図・グラフ・画像などを含むことがあり、xlsxライブラリでの
  // 書き出しではそれらが失われてしまう。編集・保存はできないよう、
  // 全セルをreadOnlyにして閲覧専用として表示する
  const convertSheetToSpreadsheetData = (
    worksheet: XLSX.WorkSheet
  ): SpreadsheetCell[][] => {
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
    });
    return data.map((row) =>
      row.map((cell) => {
        let cellValue: string | number | null = cell;
        // セルの値がstring, number, null/undefined以外（例: Dateオブジェクトなど）の場合、文字列に変換する
        if (
          cell !== null &&
          typeof cell !== "undefined" &&
          typeof cell !== "string" &&
          typeof cell !== "number"
        ) {
          cellValue = String(cell);
        }
        return { value: cellValue, readOnly: true };
      })
    );
  };

  const [isFolderSelectorOpen, setIsFolderSelectorOpen] = useState(false);
  const [_selectedFolderPath, setSelectedFolderPath] = useState("");

  const date = new Date();
  const created_at = format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSX");

  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null); // Excelブック全体
  const [activeSheetIndex, setActiveSheetIndex] = useState(0); // 表示するシートの番号

  // workbookか表示シートが変更されたら、表示用データを再計算する
  useEffect(() => {
    if (workbook) {
      try {
        const sheetName = workbook.SheetNames[activeSheetIndex];
        if (!sheetName) throw new Error("Invalid sheet index.");

        const worksheet = workbook.Sheets[sheetName];
        const data = convertSheetToSpreadsheetData(worksheet);
        setSpreadsheetData(data);
      } catch (e) {
        setPreviewError("シートの読み込みに失敗しました。");
        setSpreadsheetData(null);
      }
    }
  }, [workbook, activeSheetIndex]);

  useEffect(() => {
    if (open) {
      if (editingData) {
        setTitle(editingData.title || "");
        setExplanatoryText(editingData.explanatory_text || "");
        setUnderstandingLevel(editingData.understanding_level ?? null);
        setReferenceUrl(editingData.reference_url || "");
        setSelectedCategory(editingData.category_id || "");
        setSelectedTags(editingData.tags || []);
        const { folder, file } = splitPath(editingData.github_path || "");
        setFolderPath(folder);
        setFileName(file);
        setLocalFile(null);
        if (editingData.github_path) {
          handlePreviewFile(editingData.github_path);
        }
      } else if (prefillData) {
        // 共有などからの新規登録：一度リセットしてから初期値を差し込む
        handleClose(true);
        setTitle(prefillData.title || "");
        setExplanatoryText(prefillData.explanatory_text || "");
        setReferenceUrl(prefillData.reference_url || "");
      } else {
        // 新規作成モードの時はフォームをリセット
        handleClose(true);
      }
    }
  }, [editingData, prefillData, open]);

  // GitHub上のファイルのプレビュー処理
  const handlePreviewFile = async (path: string) => {
    const pathToFetch = typeof path === "string" ? path : github_path;
    if (!pathToFetch) {
      setPreviewError("ファイルパスを入力してください。");
      return;
    }
    setIsLoadingFile(true);
    setPreviewError(null);
    setFileContent("");
    setSpreadsheetData(null); // ★ リセット
    setWorkbook(null); // workbookもリセット
    setActiveSheetIndex(0);
    setPdfPages([]);
    setPptxSlides([]);
    setActiveSlideIndex(0);
    setZipEntries([]);

    const result = await onFetchFile(pathToFetch);

    if (result) {
      const fileType = getFileType(pathToFetch);
      if (fileType === "excel" && result.base64Content) {
        try {
          const wb = XLSX.read(result.base64Content, { type: "base64" });
          setWorkbook(wb);
          setFileSha(result.sha);
        } catch (e) {
          setPreviewError("Excelファイルの解析に失敗しました。");
        }
      } else if (fileType === "pdf" && result.base64Content) {
        try {
          const pages = await renderPdfPagesToImages(result.base64Content);
          setPdfPages(pages);
          setFileSha(result.sha);
        } catch (e) {
          setPreviewError("PDFファイルの解析に失敗しました。");
        }
      } else if (fileType === "pptx" && result.base64Content) {
        try {
          const slides = await extractPptxText(result.base64Content);
          setPptxSlides(slides);
          setFileSha(result.sha);
        } catch (e) {
          setPreviewError("PowerPointファイルの解析に失敗しました。");
        }
      } else if (fileType === "docx" && result.base64Content) {
        try {
          const text = await extractDocxText(result.base64Content);
          setFileContent(text);
          setFileSha(result.sha);
        } catch (e) {
          setPreviewError("Wordファイルの解析に失敗しました。");
        }
      } else if (fileType === "zip-archive" && result.base64Content) {
        try {
          const entries = await listZipEntries(result.base64Content);
          setZipEntries(entries);
          setFileSha(result.sha);
        } catch (e) {
          setPreviewError("ZIPファイルの解析に失敗しました。");
        }
      } else {
        const mimeType = getMimeType(pathToFetch);

        if ((fileType === "image" || fileType === "video") && result.base64Content) {
          // GitHubから取得したBase64をそのまま画像/動画SRCにする
          setFileContent(`data:${mimeType};base64,${result.base64Content}`);
        } else {
          // 通常テキスト
          setFileContent(result.content);
        }
        setFileSha(result.sha);
      }
      setIsEditingFile(false);
    } else {
      setPreviewError("ファイルの取得に失敗しました。パスを確認してください。");
      setFileSha(null);
    }
    setIsLoadingFile(false);
  };

  // ローカルファイルのプレビュー処理
  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    setLocalFile(file);
    // ファイル名だけ更新し、既に選んでいる保存先フォルダはそのまま維持する
    setFileName(file.name);

    setIsLoadingFile(true);
    setPreviewError(null);
    setFileContent("");
    setSpreadsheetData(null);
    setFileSha(null);
    setWorkbook(null);
    setActiveSheetIndex(0);
    setPdfPages([]);
    setPptxSlides([]);
    setActiveSlideIndex(0);
    setZipEntries([]);

    const reader = new FileReader();
    const fileType = getFileType(file.name);

    reader.onload = async (event) => {
      try {
        const fileData = event.target?.result;
        if (!fileData) throw new Error("ファイルの読み込みに失敗しました。");

        if (fileType === "excel") {
          const wb = XLSX.read(fileData, { type: "array" });
          setWorkbook(wb);
        } else if (fileType === "image" || fileType === "video") {
          // ✅ 画像・動画ファイルの場合：data URL をそのまま src に使う
          setFileContent(fileData as string);
        } else if (fileType === "pdf") {
          const base64 = (fileData as string).split(",")[1];
          setPdfPages(await renderPdfPagesToImages(base64));
        } else if (fileType === "pptx") {
          const base64 = (fileData as string).split(",")[1];
          setPptxSlides(await extractPptxText(base64));
        } else if (fileType === "docx") {
          const base64 = (fileData as string).split(",")[1];
          setFileContent(await extractDocxText(base64));
        } else if (fileType === "zip-archive") {
          const base64 = (fileData as string).split(",")[1];
          setZipEntries(await listZipEntries(base64));
        } else if (fileType === "binary") {
          setPreviewError("このバイナリファイル形式はプレビューできません。");
        } else {
          // ✅ テキスト系
          setFileContent(fileData as string);
        }
      } catch (err) {
        setPreviewError("ファイルのプレビューに失敗しました。");
      } finally {
        setIsLoadingFile(false);
      }
    };

    reader.onerror = () => {
      setPreviewError("ファイルの読み込み中にエラーが発生しました。");
      setIsLoadingFile(false);
    };

    if (fileType === "excel") {
      reader.readAsArrayBuffer(file);
    } else if (
      fileType === "image" ||
      fileType === "video" ||
      fileType === "pdf" ||
      fileType === "pptx" ||
      fileType === "docx" ||
      fileType === "zip-archive"
    ) {
      // 画像・動画・PDF・PowerPoint・Word・ZIPはbase64 data URL形式で読み込み
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  }
};


  const handleFileSelectFromGitHub = (path: string) => {
    // GitHub上の既存ファイルを選んだ場合は、そのファイルのフォルダ・ファイル名で両方とも上書きする
    const { folder, file } = splitPath(path);
    setFolderPath(folder);
    setFileName(file);
    setLocalFile(null);
    setIsSelectorOpen(false);
    handlePreviewFile(path);
  };

  const handleSubmit = async () => {
    let editedFileData = null;

    // Excelは閲覧専用（図・グラフがxlsx書き出しで失われるため編集・保存は行わない）。
    // spreadsheetDataは表示専用で、ここでの再アップロードは対象外
    // 1. ローカルファイルが選択された場合の処理
    if (localFile) {
      const content = await toBase64(localFile);
      editedFileData = {
        path: github_path,
        content: content,
        sha: null, // 新規ファイルなのでSHAはnull
        contentIsBase64: true, // ★ Base64形式であるフラグ
      };
    }
    // 2. GitHub上のテキストファイルが編集された場合の処理
    //    （Word .docxは閲覧専用のため、ここでは編集対象にならない）
    else if (isEditingFile && fileSha && fileType !== "docx") {
      editedFileData = {
        path: github_path,
        content: fileContent,
        sha: fileSha,
        contentIsBase64: false, // テキストなのでフラグはfalse
      };
    }

    const learningData = {
      title,
      explanatory_text: explanatoryText,
      understanding_level: understandingLevel,
      reference_url: referenceUrl,
      category_id: selectedCategory,
      tags: selectedTags,
      github_path: github_path,
      // commit_shaは親コンポーネントで設定される
    };

    const submissionData = {
      learningData: editingData
        ? { ...learningData, id: editingData.id }
        : { ...learningData, created_at: created_at },
      editedFile: editedFileData,
    };

    try {
      await onSubmit(submissionData);
      onClose();
    } catch (error) {
      console.error("Submission failed:", error);
    }
  };

  const handleClose = (isOpening = false) => {
    if (!isOpening) {
      onClose();
    }
    setWorkbook(null);
    setActiveSheetIndex(0);
    setSpreadsheetData(null);
    setTitle("");
    setExplanatoryText("");
    setUnderstandingLevel(null);
    setReferenceUrl("");
    setSelectedCategory("");
    setSelectedTags([]);
    setFolderPath("");
    setFileName("");
    setLocalFile(null);
    setFileContent("");
    setFileSha(null);
    setIsEditingFile(false);
    setPreviewError(null);
    setIsLoadingFile(false);
    setSpreadsheetData(null); // ★ スプレッドシートデータもリセット
    setPdfPages([]);
    setPptxSlides([]);
    setActiveSlideIndex(0);
    setZipEntries([]);
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 添付ファイルの選択内容をすべてクリアする
  const handleClearAttachment = () => {
    setFolderPath("");
    setFileName("");
    setLocalFile(null);
    setFileContent("");
    setFileSha(null);
    setIsEditingFile(false);
    setPreviewError(null);
    setWorkbook(null);
    setActiveSheetIndex(0);
    setSpreadsheetData(null);
    setPdfPages([]);
    setPptxSlides([]);
    setActiveSlideIndex(0);
    setZipEntries([]);
  };

  const fileType = getFileType(github_path);
  // fileContent が Base64 っぽいならそのまま使う。既にデコード済みの場合はエンコードし直す
  const mediaSrc = fileContent.startsWith("data:")
    ? fileContent
    : fileContent.match(/^[A-Za-z0-9+/=]+$/)
    ? `data:${getMimeType(github_path)};base64,${fileContent}`
    : `data:${getMimeType(github_path)};base64,${btoa(fileContent)}`;


  return (
    <>
      <Dialog open={open} onClose={() => handleClose()} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MenuBookOutlinedIcon color="primary" />
          {editingData ? "学習内容の編集" : "学んだことを記録する"}
        </DialogTitle>
        <DialogContent dividers>
          {/* === 基本情報 === */}
          <Typography
            variant="subtitle2"
            sx={{ mt: 1, mb: 1, fontWeight: 700, color: "primary.main" }}
          >
            基本情報
          </Typography>

          {/* タイトル（必須） */}
          <TextField
            autoFocus
            margin="normal"
            label="タイトル"
            required
            type="text"
            fullWidth
            variant="outlined"
            placeholder="例: XLOOKUP関数の使い方"
            helperText="何について学んだかを短く書きます（必須）"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* 内容・メモ */}
          <TextField
            margin="normal"
            label="内容・メモ"
            type="text"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            placeholder="学んだこと・ポイント・つまずいた点などを自由に書きます"
            helperText="[[ ]] で囲んだ部分は、復習時にその箇所だけ隠されます（例: useEffectは[[副作用]]を扱うためのフック）"
            value={explanatoryText}
            onChange={(e) => setExplanatoryText(e.target.value)}
          />

          {/* 参考URL（任意） */}
          <TextField
            margin="normal"
            label="参考URL（任意）"
            type="url"
            fullWidth
            variant="outlined"
            placeholder="https://..."
            helperText="参考にした記事やドキュメントのURL"
            value={referenceUrl}
            onChange={(e) => setReferenceUrl(e.target.value)}
          />

          {/* === 分類 === */}
          <Typography variant="subtitle2" sx={{ mt: 3, mb: 1, fontWeight: 700, color: "primary.main" }}>
            分類
          </Typography>

          {/* カテゴリー（単一選択・検索可） */}
          <Autocomplete
            options={allCategories}
            getOptionLabel={(option: any) => option.name || ""}
            isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
            value={allCategories.find((c: any) => c.id === selectedCategory) || null}
            onChange={(_event, newValue: any) => {
              setSelectedCategory(newValue ? newValue.id : "");
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                label="カテゴリー"
                placeholder="入力して検索"
                helperText="学習内容を分類するカテゴリを選びます。見つからない場合は「カテゴリー・タグの管理」から新規作成できます"
              />
            )}
            sx={{ mt: 2 }}
          />

          {/* ハッシュタグ（複数選択・自由入力可） */}
          <Autocomplete
            multiple
            options={allTags.map((tag: any) => tag.name)}
            value={selectedTags}
            onChange={(_event, newValue) => {
              setSelectedTags(newValue);
            }}
            freeSolo // 選択肢にない新しいタグも入力可能にする
            renderTags={(value: readonly string[], getTagProps) =>
              value.map((option: string, index: number) => (
                <Chip
                  variant="outlined"
                  label={option}
                  {...getTagProps({ index })}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                label="ハッシュタグ（任意）"
                placeholder="入力してEnterで追加"
                helperText="複数OK。一覧にない言葉も新しく追加できます"
              />
            )}
            sx={{ mt: 2 }}
          />

          {/* === 理解度 === */}
          <Box sx={{ mt: 3 }}>
            <Typography component="legend" sx={{ fontWeight: 600 }}>
              理解度（任意）
            </Typography>
            <Rating
              value={understandingLevel}
              onChange={(_event, newValue: any) => {
                setUnderstandingLevel(newValue);
              }}
            />
            <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
              ★が多いほど「よく理解できた」。未設定のまま検索用のメモとしてだけ残すこともできます。
            </Typography>
          </Box>
          {/* === ファイル添付 === */}
          <Box sx={{ mt: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                mb: 0.5,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.main" }}>
                ファイルを添付する（任意）
              </Typography>
              {hasAttachment && (
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<CloseIcon fontSize="small" />}
                  onClick={handleClearAttachment}
                >
                  添付を解除
                </Button>
              )}
            </Box>
            <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 1.5 }}>
              学んだコードやファイルをGitHubリポジトリに保存して紐づけられます。使わなくても登録できます。
            </Typography>

            {/* --- 保存先フォルダ --- */}
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-end",
                gap: 1,
                mb: 1.5,
              }}
            >
              <TextField
                label="保存先フォルダ"
                type="text"
                variant="outlined"
                size="small"
                fullWidth
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value.replace(/^\/+/, "").replace(/\/+$/, ""))}
                placeholder="未入力ならリポジトリ直下"
                helperText="例: src/components"
              />
              <IconButton
                onClick={() => setIsFolderSelectorOpen(true)}
                color="primary"
                title="GitHubのフォルダから選ぶ"
              >
                <FolderOpenIcon />
              </IconButton>
            </Box>

            {/* --- ファイル名（新規作成 or アップロード or 既存ファイル選択） --- */}
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-end",
                gap: 1,
              }}
            >
              <TextField
                label="ファイル名"
                type="text"
                variant="outlined"
                size="small"
                fullWidth
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="例: index.tsx"
              />

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLocalFileSelect}
                style={{ display: "none" }}
              />
              <IconButton
                onClick={handleUploadButtonClick}
                color="primary"
                title="PCからファイルをアップロード"
              >
                <UploadFileIcon />
              </IconButton>
              <IconButton
                onClick={() => setIsSelectorOpen(true)}
                color="primary"
                title="GitHub上の既存ファイルを選ぶ"
              >
                <InsertDriveFileOutlinedIcon />
              </IconButton>
            </Box>
          </Box>
          <Box
            sx={{
              mt: 2,
              p: 1,
              border: "1px solid #ddd",
              borderRadius: 1,
              minHeight: 150,
              maxHeight: "50vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              bgcolor: "#fff",
            }}
          >
            {isLoadingFile ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexGrow: 1,
                }}
              >
                <CircularProgress />
              </Box>
            ) : previewError ? (
              <Box sx={{ p: 2 }}>
                <Typography color="error">{previewError}</Typography>
              </Box>
            ) : workbook ? (
              <>
                <Box sx={{ borderBottom: 1, borderColor: "divider", flexShrink: 0 }}>
                  <Tabs
                    value={activeSheetIndex}
                    onChange={(_event, newValue) => setActiveSheetIndex(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label="Excel sheets"
                  >
                    {workbook.SheetNames.map((sheetName, index) => (
                      <Tab label={sheetName} key={sheetName} id={`sheet-tab-${index}`} />
                    ))}
                  </Tabs>
                </Box>
                {spreadsheetData && (
                  <div style={{ width: "100%", height: "100%", overflow: "auto" }}>
                    <Spreadsheet data={spreadsheetData} />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", p: 1 }}
                    >
                      ※ Excelは閲覧専用です（図・グラフが失われるため編集・保存はできません）
                    </Typography>
                  </div>
                )}
              </>
            ) : pdfPages.length > 0 ? (
              // PDFは閲覧専用（ページごとに画像として表示）
              <Box sx={{ flexGrow: 1, overflow: "auto", p: 1, bgcolor: "#525659" }}>
                <Stack spacing={1} alignItems="center">
                  {pdfPages.map((pageSrc, index) => (
                    <img
                      key={index}
                      src={pageSrc}
                      alt={`${index + 1}ページ目`}
                      style={{ maxWidth: "100%", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }}
                    />
                  ))}
                </Stack>
              </Box>
            ) : pptxSlides.length > 0 ? (
              // PowerPointは閲覧専用。1枚ずつスライドのような見た目で表示する
              // （テキストのみの再現で、実際のレイアウト・画像・デザインは反映されない）
              <>
                <Box sx={{ borderBottom: 1, borderColor: "divider", flexShrink: 0 }}>
                  <Tabs
                    value={activeSlideIndex}
                    onChange={(_event, newValue) => setActiveSlideIndex(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label="PowerPoint slides"
                  >
                    {pptxSlides.map((slide, index) => (
                      <Tab
                        label={`${slide.slideNumber}`}
                        key={slide.slideNumber}
                        id={`slide-tab-${index}`}
                      />
                    ))}
                  </Tabs>
                </Box>
                <Box
                  sx={{
                    flexGrow: 1,
                    overflow: "auto",
                    p: 2,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    bgcolor: "#e8e8e8",
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                    ※ テキストのみのプレビューです（レイアウト・画像は表示されません）
                  </Typography>
                  {pptxSlides[activeSlideIndex] && (
                    <Box
                      sx={{
                        width: "100%",
                        maxWidth: 480,
                        aspectRatio: "16 / 9",
                        bgcolor: "#fff",
                        border: "1px solid #ddd",
                        borderRadius: 1,
                        boxShadow: 1,
                        p: 3,
                        overflow: "auto",
                      }}
                    >
                      {pptxSlides[activeSlideIndex].title && (
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5, color: "#000" }}>
                          {pptxSlides[activeSlideIndex].title}
                        </Typography>
                      )}
                      {pptxSlides[activeSlideIndex].bodyLines.length > 0 ? (
                        <Stack spacing={0.5}>
                          {pptxSlides[activeSlideIndex].bodyLines.map((line, i) => (
                            <Typography key={i} variant="body2" sx={{ color: "#333" }}>
                              ・{line}
                            </Typography>
                          ))}
                        </Stack>
                      ) : !pptxSlides[activeSlideIndex].title ? (
                        <Typography variant="body2" color="text.secondary">
                          （テキストなし）
                        </Typography>
                      ) : null}
                    </Box>
                  )}
                </Box>
              </>
            ) : zipEntries.length > 0 ? (
              // ZIPは閲覧専用（中身のファイル一覧のみ。展開・編集はできない）
              <Box sx={{ flexGrow: 1, overflow: "auto", p: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                  ※ ZIP内のファイル一覧です（{zipEntries.length}件）。展開・編集はできません
                </Typography>
                <List dense>
                  {zipEntries.map((entry) => (
                    <ListItem key={entry.name} disableGutters>
                      <ListItemText
                        primary={entry.name}
                        sx={{ opacity: entry.dir ? 0.6 : 1 }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            ) : fileContent ? (
              // ★ JSX 直接条件分岐で返す
              fileType === "image" || fileType === "video" ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexGrow: 1,
                }}
              >
                {fileType === "image" ? (
                  <img
                    src={mediaSrc}
                    alt={github_path}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "60vh",
                      objectFit: "contain",
                      borderRadius: "8px",
                    }}
                  />
                ) : (
                  <video
                    src={mediaSrc}
                    controls
                    style={{
                      maxWidth: "100%",
                      maxHeight: "60vh",
                      borderRadius: "8px",
                    }}
                  />
                )}
              </Box>
            ) : (
                <div
                  style={{
                    flexGrow: 1,
                    overflow: "auto",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Box sx={{ flexGrow: 1 }}>
                    {isEditingFile ? (
                      <TextField
                        autoFocus
                        multiline
                        fullWidth
                        minRows={8}
                        value={fileContent}
                        onChange={(e) => setFileContent(e.target.value)}
                        sx={{
                          "& .MuiInputBase-root": {
                            fontFamily: "monospace",
                            fontSize: "0.875rem",
                          },
                        }}
                      />
                    ) : (
                      <SyntaxHighlighter
                        language={fileType === "docx" ? "plaintext" : fileType}
                        style={vscDarkPlus}
                        showLineNumbers
                        customStyle={{ margin: 0, height: "100%" }}
                      >
                        {fileContent}
                      </SyntaxHighlighter>
                    )}
                  </Box>
                  {fileType !== "binary" && fileType !== "docx" && (
                    <Box sx={{ mt: 1, textAlign: "right" }}>
                      <Button size="small" onClick={() => setIsEditingFile(!isEditingFile)}>
                        {isEditingFile ? "プレビューに戻る" : "編集"}
                      </Button>
                    </Box>
                  )}
                  {fileType === "docx" && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      ※ Wordは閲覧専用です（文章のみ抽出して表示。元の書式・画像・表は再現されません）
                    </Typography>
                  )}
                </div>
              )
            ) : (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexGrow: 1,
                }}
              >
                <Typography color="textSecondary">
                  ファイル選択するとプレビュー表示されます。
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => handleClose()} color="inherit">
            キャンセル
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!title.trim()}>
            {editingData ? "変更を保存" : "この内容で登録"}
          </Button>
        </DialogActions>
      </Dialog>
      <GitHubFileSelector
        open={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onFileSelect={handleFileSelectFromGitHub}
      />
      <GitHubFolderSelector
        open={isFolderSelectorOpen}
        onClose={() => setIsFolderSelectorOpen(false)}
        onSelectFolder={(selectedFolder) => {
          // フォルダだけ更新し、既に入力済みのファイル名はそのまま維持する
          setFolderPath(selectedFolder);
          setIsFolderSelectorOpen(false);
        }}
        githubLogin={githubLoginSafe}
        repoName={repoNameSafe}
        accessToken={tokenSafe}
        setSelectedPath={setSelectedFolderPath}
      />
    </>
  );
}
