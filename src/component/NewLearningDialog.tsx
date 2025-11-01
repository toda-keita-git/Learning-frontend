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
import * as XLSX from "xlsx";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

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

// Props型
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

  const [fileContent, setFileContent] = useState("");
  const [fileSha, setFileSha] = useState<string | null>(null);
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [spreadsheetData, setSpreadsheetData] = useState<any[][] | null>(null);

  const date = new Date();
  const created_at = format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSX");

  // Excelをreact用データに変換
  const convertSheetToSpreadsheetData = (worksheet: XLSX.WorkSheet) => {
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
    });
    return data.map((row) => row.map((cell) => (cell ?? "").toString()));
  };

  useEffect(() => {
    if (workbook) {
      try {
        const sheetName = workbook.SheetNames[activeSheetIndex];
        if (!sheetName) throw new Error("Invalid sheet index.");
        const worksheet = workbook.Sheets[sheetName];
        const data = convertSheetToSpreadsheetData(worksheet);
        setSpreadsheetData(data);
      } catch {
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
        handleClose(true);
      }
    }
  }, [editingData, open]);

  const handlePreviewFile = async (path: string) => {
    const pathToFetch = typeof path === "string" ? path : github_path;
    if (!pathToFetch) {
      setPreviewError("ファイルパスを入力してください。");
      return;
    }
    setIsLoadingFile(true);
    setPreviewError(null);
    setFileContent("");
    setSpreadsheetData(null);
    setWorkbook(null);
    setActiveSheetIndex(0);

    const result = await onFetchFile(pathToFetch);
    if (result) {
      const fileType = getFileType(pathToFetch);
      if (fileType === "excel" && result.base64Content) {
        try {
          const wb = XLSX.read(result.base64Content, { type: "base64" });
          setWorkbook(wb);
          setFileSha(result.sha);
        } catch {
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

  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setLocalFile(file);
    setGithub_path(file.name);

    setIsLoadingFile(true);
    setPreviewError(null);
    setFileContent("");
    setSpreadsheetData(null);
    setFileSha(null);
    setWorkbook(null);
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
          setPreviewError(`このファイル形式 (.${fileType}) のプレビューはサポートされていません。`);
        } else {
          setFileContent(fileData as string);
        }
      } catch {
        setPreviewError("ファイルのプレビューに失敗しました。");
      } finally {
        setIsLoadingFile(false);
      }
    };

    if (fileType === "excel") reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  };

  const handleFileSelectFromGitHub = (path: string) => {
    setGithub_path(path);
    setLocalFile(null);
    setIsSelectorOpen(false);
    handlePreviewFile(path);
  };

  const handleSubmit = async () => {
    let editedFileData = null;

    if (spreadsheetData) {
      const newWorksheet = XLSX.utils.aoa_to_sheet(spreadsheetData);
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Sheet1");
      const newBase64Content = XLSX.write(newWorkbook, {
        bookType: "xlsx",
        type: "base64",
      });
      editedFileData = {
        path: github_path,
        content: newBase64Content,
        sha: fileSha,
        contentIsBase64: true,
      };
    } else if (localFile) {
      const content = await toBase64(localFile);
      editedFileData = {
        path: github_path,
        content,
        sha: null,
        contentIsBase64: true,
      };
    } else if (isEditingFile && fileSha) {
      editedFileData = {
        path: github_path,
        content: fileContent,
        sha: fileSha,
        contentIsBase64: false,
      };
    }

    const learningData = {
      title,
      explanatory_text: explanatoryText,
      understanding_level: understandingLevel,
      reference_url: referenceUrl,
      category_id: selectedCategory,
      tags: selectedTags,
      github_path,
    };

    const submissionData = {
      learningData: editingData
        ? { ...learningData, id: editingData.id }
        : { ...learningData, created_at },
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
    if (!isOpening) onClose();
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
  };

  const handleUploadButtonClick = () => fileInputRef.current?.click();
  const fileType = getFileType(github_path);

  return (
    <>
      <Dialog open={open} onClose={() => handleClose()} fullWidth maxWidth="md">
        <DialogTitle>{editingData ? "学習内容の編集" : "新しい学習内容の追加"}</DialogTitle>
        <DialogContent>
          <TextField label="タイトル" fullWidth variant="standard" margin="dense"
            value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextField label="内容" fullWidth multiline rows={4} variant="standard" margin="dense"
            value={explanatoryText} onChange={(e) => setExplanatoryText(e.target.value)} />
          <TextField label="参考URL" type="url" fullWidth variant="standard" margin="dense"
            value={referenceUrl} onChange={(e) => setReferenceUrl(e.target.value)} />
          <FormControl variant="standard" fullWidth margin="dense">
            <InputLabel>カテゴリー</InputLabel>
            <Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              {allCategories.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Autocomplete multiple options={allTags.map((t) => t.name)} value={selectedTags}
            onChange={(_, v) => setSelectedTags(v)} freeSolo
            renderTags={(v, getTagProps) =>
              v.map((option, i) => <Chip variant="outlined" label={option} {...getTagProps({ index: i })} />)}
            renderInput={(params) => (
              <TextField {...params} variant="standard" label="ハッシュタグ" placeholder="タグを追加" />
            )}
            sx={{ mt: 2 }} />
          <Box sx={{ mt: 2 }}>
            <Typography component="legend">理解度</Typography>
            <Rating value={understandingLevel} onChange={(_, v) => setUnderstandingLevel(v)} />
          </Box>

          {/* === GitHub連携 === */}
          <Box sx={{ display: "flex", alignItems: "flex-end", mt: 2, gap: 1 }}>
            <TextField
              label="GitHub連携ファイル"
              fullWidth variant="standard"
              value={github_path}
              onChange={(e) => setGithub_path(e.target.value)}
              placeholder={localFile ? "コミット先のファイル名" : "ファイルを選択またはパスを入力"}
            />
            <input type="file" ref={fileInputRef} onChange={handleLocalFileSelect} style={{ display: "none" }} />
            <IconButton onClick={handleUploadButtonClick} color="primary" title="PCからアップロード">
              <UploadFileIcon />
            </IconButton>
            <IconButton onClick={() => setIsSelectorOpen(true)} color="primary" title="GitHubから選択">
              <FolderOpenIcon />
            </IconButton>
          </Box>

          {/* === プレビュー === */}
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
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexGrow: 1 }}>
                <CircularProgress />
              </Box>
            ) : previewError ? (
              <Box sx={{ p: 2 }}>
                <Typography color="error">{previewError}</Typography>
              </Box>
            ) : workbook ? (
              <>
                <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                  <Tabs
                    value={activeSheetIndex}
                    onChange={(_, v) => setActiveSheetIndex(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                  >
                    {workbook.SheetNames.map((name, idx) => (
                      <Tab label={name} key={name} id={`sheet-tab-${idx}`} />
                    ))}
                  </Tabs>
                </Box>
                {spreadsheetData && (
                  <div style={{ width: "100%", height: "100%", overflow: "auto" }}>
                    <pre>{JSON.stringify(spreadsheetData, null, 2)}</pre>
                  </div>
                )}
              </>
            ) : fileContent ? (
              fileType === "image" ? (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexGrow: 1 }}>
                  <img
                    src={fileContent}
                    alt={github_path}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "50vh",
                      objectFit: "contain",
                      borderRadius: "8px",
                    }}
                  />
                </Box>
              ) : (
                <Box sx={{ flexGrow: 1, overflow: "auto" }}>
                  <SyntaxHighlighter
                    language={fileType}
                    style={vscDarkPlus}
                    showLineNumbers
                    customStyle={{ margin: 0 }}
                  >
                    {fileContent}
                  </SyntaxHighlighter>
                  {fileType !== "binary" && (
                    <Box sx={{ mt: 1, textAlign: "right" }}>
                      <Button size="small" onClick={() => setIsEditingFile(!isEditingFile)}>
                        {isEditingFile ? "プレビューに戻る" : "編集"}
                      </Button>
                    </Box>
                  )}
                </Box>
              )
            ) : (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexGrow: 1 }}>
                <Typography color="textSecondary">
                  ファイルを選択するとプレビュー表示されます。
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => handleClose()}>キャンセル</Button>
          <Button onClick={handleSubmit}>{editingData ? "更新" : "登録"}</Button>
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
