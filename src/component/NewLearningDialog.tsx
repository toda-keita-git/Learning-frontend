import React, { useState, useRef, useEffect } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Rating from "@mui/material/Rating";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Autocomplete from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { format } from "date-fns";
import GitHubFileSelector from "./GitHubFileSelector";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getFileType } from "./getFileType";
import CircularProgress from "@mui/material/CircularProgress";
import FindInPageIcon from "@mui/icons-material/FindInPage";
import * as XLSX from "xlsx";
import Spreadsheet from "react-spreadsheet"; // ★ react-spreadsheet をインポート
import type { CellBase, Matrix } from "react-spreadsheet";
import Tabs from "@mui/material/Tabs"; // ★ MUI Tabsをインポート
import Tab from "@mui/material/Tab"; // ★ MUI Tabをインポート

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

// 親から受け取るPropsの型定義
interface NewLearningDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  allTags: { name: string }[];
  allCategories: { id: number; name: string }[];
  editingData?: any | null;
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
  onFetchFile,
}: NewLearningDialogProps) {
  // フォーム項目のためのState
  const [title, setTitle] = useState("");
  const [explanatoryText, setExplanatoryText] = useState("");
  const [understandingLevel, setUnderstandingLevel] = useState(3);
  const [referenceUrl, setReferenceUrl] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [github_path, setGithub_path] = useState("");
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ファイルプレビュー用のState
  const [fileContent, setFileContent] = useState("");
  const [fileSha, setFileSha] = useState<string | null>(null);
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

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
        return { value: cellValue };
      })
    );
  };

  const handleSpreadsheetChange = (data: Matrix<CellBase<any>>) => {
    // ライブラリから渡されるデータ型 (Matrix<CellBase<any>>) を
    // Stateが期待する型 (SpreadsheetCell[][]) に変換する
    const newData: SpreadsheetCell[][] = data.map((row) =>
      row.map((cell) => ({
        // cellがundefinedの場合も考慮し、その場合はvalueをnullにする
        value: cell ? cell.value : null,
      }))
    );
    setSpreadsheetData(newData);
  };

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
        setUnderstandingLevel(editingData.understanding_level || 3);
        setReferenceUrl(editingData.reference_url || "");
        setSelectedCategory(editingData.category_id || "");
        setSelectedTags(editingData.tags || []);
        setGithub_path(editingData.github_path || "");
        setLocalFile(null);
        if (editingData.github_path) {
          handlePreviewFile(editingData.github_path);
        }
      } else {
        // 新規作成モードの時はフォームをリセット
        handleClose(true);
      }
    }
  }, [editingData, open]);

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
      } else {
        setFileContent(result.content);
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
      setGithub_path(file.name);

      setIsLoadingFile(true);
      setPreviewError(null);
      setFileContent("");
      setSpreadsheetData(null); // ★ リセット
      setFileSha(null);
      setWorkbook(null); // workbookもリセット
      setActiveSheetIndex(0);

      const reader = new FileReader();
      const fileType = getFileType(file.name);

      reader.onload = (event) => {
        try {
          const fileData = event.target?.result;
          if (!fileData) throw new Error("ファイルの読み込みに失敗しました。");

          if (fileType === "excel") {
            const wb = XLSX.read(fileData, { type: "array" });
            setWorkbook(wb);
          } else if (
            fileType === "binary" ||
            fileType === "image" ||
            fileType === "pdf"
          ) {
            setPreviewError(
              `このファイル形式 (.${fileType}) のプレビューはサポートされていません。`
            );
          } else {
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
        fileType === "binary" ||
        fileType === "image" ||
        fileType === "pdf"
      ) {
        setIsLoadingFile(false);
        setPreviewError(
          `このファイル形式 (.${fileType}) のプレビューはサポートされていません。`
        );
      } else {
        reader.readAsText(file);
      }
    }
  };

  const handleFileSelectFromGitHub = (path: string) => {
    setGithub_path(path);
    setLocalFile(null);
    setIsSelectorOpen(false);
    handlePreviewFile(path);
  };

  const handleSubmit = async () => {
    let editedFileData = null;

    // 1. スプレッドシートが編集された場合の処理
    if (spreadsheetData) {
      // spreadsheetData (オブジェクトの配列) を値の配列に戻す
      const aoa = spreadsheetData.map((row) => row.map((cell) => cell.value));
      // 新しいワークシートを作成
      const newWorksheet = XLSX.utils.aoa_to_sheet(aoa);
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Sheet1");

      // Excelファイル(xlsx)のBase64文字列を生成
      const newBase64Content = XLSX.write(newWorkbook, {
        bookType: "xlsx",
        type: "base64",
      });

      editedFileData = {
        path: github_path,
        content: newBase64Content,
        sha: fileSha, // 既存ファイル更新時はSHAが必要
        contentIsBase64: true, // ★ Base64形式であるフラグ
      };
    }
    // 2. ローカルファイルが選択された場合（Excel以外）の処理
    else if (localFile) {
      const content = await toBase64(localFile);
      editedFileData = {
        path: github_path,
        content: content,
        sha: null, // 新規ファイルなのでSHAはnull
        contentIsBase64: true, // ★ Base64形式であるフラグ
      };
    }
    // 3. GitHub上のテキストファイルが編集された場合の処理
    else if (isEditingFile && fileSha) {
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
    setUnderstandingLevel(3);
    setReferenceUrl("");
    setSelectedCategory("");
    setSelectedTags([]);
    setGithub_path("");
    setLocalFile(null);
    setFileContent("");
    setFileSha(null);
    setIsEditingFile(false);
    setPreviewError(null);
    setIsLoadingFile(false);
    setSpreadsheetData(null); // ★ スプレッドシートデータもリセット
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  const fileType = getFileType(github_path);

  return (
    <>
      <Dialog open={open} onClose={() => handleClose()} fullWidth maxWidth="md">
        <DialogTitle>
          {editingData ? "学習内容の編集" : "新しい学習内容の追加"}
        </DialogTitle>
        <DialogContent>
          {/* === タイトル === */}
          <TextField
            autoFocus
            margin="dense"
            label="タイトル"
            type="text"
            fullWidth
            variant="standard"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* === 内容 === */}
          <TextField
            margin="dense"
            label="内容"
            type="text"
            fullWidth
            multiline
            rows={4}
            variant="standard"
            value={explanatoryText}
            onChange={(e) => setExplanatoryText(e.target.value)}
          />

          {/* === 参考URL === */}
          <TextField
            margin="dense"
            label="参考URL"
            type="url"
            fullWidth
            variant="standard"
            value={referenceUrl}
            onChange={(e) => setReferenceUrl(e.target.value)}
          />

          {/* === カテゴリー (単一選択) === */}
          <FormControl variant="standard" fullWidth margin="dense">
            <InputLabel>カテゴリー</InputLabel>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {allCategories.map((category: any) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* === ハッシュタグ (複数選択) === */}
          <Autocomplete
            multiple
            options={allTags.map((tag: any) => tag.name)}
            value={selectedTags}
            onChange={(event, newValue) => {
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
                variant="standard"
                label="ハッシュタグ"
                placeholder="タグを追加"
              />
            )}
            sx={{ mt: 2 }}
          />

          {/* === 理解度 === */}
          <Box sx={{ mt: 2 }}>
            <Typography component="legend">理解度</Typography>
            <Rating
              value={understandingLevel}
              onChange={(event, newValue: any) => {
                setUnderstandingLevel(newValue);
              }}
            />
          </Box>
          {/* === GitHub連携 === */}
          <Box sx={{ display: "flex", alignItems: "flex-end", mt: 2, gap: 1 }}>
            <TextField
              label="GitHub連携ファイルパス"
              type="text"
              fullWidth
              variant="standard"
              value={github_path}
              // ★ ローカルファイル選択時はパスを編集可能にする
              onChange={(e) => setGithub_path(e.target.value)}
              placeholder={
                localFile
                  ? "コミット先のパス/ファイル名"
                  : "ファイルを選択またはパスを入力"
              }
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
              title="PCからアップロード"
            >
              <UploadFileIcon />
            </IconButton>
            <IconButton
              onClick={() => setIsSelectorOpen(true)}
              color="primary"
              title="GitHubから選択"
            >
              <FolderOpenIcon />
            </IconButton>
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
            ) : workbook ? ( // ★ workbookが存在する場合、シート表示エリアをレンダリング
              <>
                <Box
                  sx={{
                    borderBottom: 1,
                    borderColor: "divider",
                    flexShrink: 0,
                  }}
                >
                  <Tabs
                    value={activeSheetIndex}
                    onChange={(event, newValue) =>
                      setActiveSheetIndex(newValue)
                    }
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label="Excel sheets"
                  >
                    {workbook.SheetNames.map((sheetName, index) => (
                      <Tab
                        label={sheetName}
                        key={sheetName}
                        id={`sheet-tab-${index}`}
                      />
                    ))}
                  </Tabs>
                </Box>
                {spreadsheetData && (
                  // ★ spreadsheetDataがあればSpreadsheetコンポーネントを表示
                  <div
                    style={{ width: "100%", height: "100%", overflow: "auto" }}
                  >
                    <Spreadsheet
                      data={spreadsheetData}
                      onChange={handleSpreadsheetChange}
                    />
                  </div>
                )}
              </>
            ) : fileContent ? (
              // ★ fileContentがあれば従来の表示 (テキストファイル用)
              <div
                style={{
                  flexGrow: 1,
                  overflow: "auto",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box sx={{ flexGrow: 1 }}>
                  <SyntaxHighlighter
                    language={fileType}
                    style={vscDarkPlus}
                    showLineNumbers
                    customStyle={{ margin: 0, height: "100%" }}
                  >
                    {fileContent}
                  </SyntaxHighlighter>
                </Box>
                {/* 編集ボタンはテキストファイルの場合のみ表示 */}
                <Box sx={{ mt: 1, textAlign: "right" }}>
                  {fileType !== "binary" && (
                    <Button
                      size="small"
                      onClick={() => setIsEditingFile(!isEditingFile)}
                    >
                      {isEditingFile ? "プレビューに戻る" : "編集"}
                    </Button>
                  )}
                </Box>
              </div>
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
                  ファイルパスを入力・選択してプレビューボタンを押してください。
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleClose()}>キャンセル</Button>
          <Button onClick={handleSubmit}>
            {editingData ? "更新" : "登録"}
          </Button>
        </DialogActions>
      </Dialog>
      <GitHubFileSelector
        open={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onFileSelect={handleFileSelectFromGitHub}
      />
    </>
  );
}
