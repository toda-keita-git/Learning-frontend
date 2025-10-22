import { useState, useRef } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { MessageLeft, MessageRight } from "./component/Message";
import { TextInput } from "./component/TextInput";
import BackButton from "./component/BackButton";

export default function FileSearch() {
  type Message = {
    id: number;
    text: string;
    timestamp: string;
    type: "left" | "right";
    photoURL?: string;
    displayName?: string;
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "こんにちは！これはチャットUIのサンプルです。",
      timestamp: new Date().toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "left",
      photoURL:
        "https://lh3.googleusercontent.com/a-/AOh14Gi4vkKYlfrbJ0QLJTg_DLjcYyyK7fYoWRpz2r4s=s96-c",
      displayName: "テストユーザー",
    },
  ]);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [folderPaths, setFolderPaths] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileList = Array.from(files);
      setSelectedFiles(fileList);

      const folderPathSet = new Set<string>();
      for (const file of fileList) {
        // 'webkitRelativePath' は標準ではないため 'any' を使用
        const path = (file as any).webkitRelativePath || "";
        const lastSlashIndex = path.lastIndexOf("/");
        if (lastSlashIndex > -1) {
          const dirPath = path.substring(0, lastSlashIndex);
          const parts = dirPath.split("/");
          let currentPath = "";
          for (const part of parts) {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            folderPathSet.add(currentPath);
          }
        }
      }
      setFolderPaths(Array.from(folderPathSet).sort());

      const newSystemMessage: Message = {
        id: Date.now(),
        text: `フォルダが選択され、${fileList.length}個のファイルが読み込まれました。ファイル名またはフォルダ名で検索できます。`,
        timestamp: new Date().toLocaleTimeString("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: "left",
        photoURL: "https://placehold.co/40x40/EFEFEF/AAAAAA?text=BOT",
        displayName: "システム",
      };
      setMessages((prev) => [...prev, newSystemMessage]);
    }
  };

  const handleSearch = (query: string) => {
    const userMessage: Message = {
      id: Date.now(),
      text: query,
      timestamp: new Date().toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "right",
    };

    setMessages((prev) => [...prev, userMessage]);

    if (selectedFiles.length === 0) {
      const noFileMessage: Message = {
        id: Date.now(),
        text: "フォルダが選択されていません。フォルダアイコンからフォルダを選択してください。",
        timestamp: new Date().toLocaleTimeString("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: "left",
        photoURL: "https://placehold.co/40x40/EFEFEF/AAAAAA?text=BOT",
        displayName: "システム",
      };
      setMessages((prev) => [...prev, noFileMessage]);
      return;
    }

    const lowerCaseQuery = query.toLowerCase();
    const matchingFolders = folderPaths.filter((path) =>
      path.toLowerCase().includes(lowerCaseQuery)
    );
    const matchingFiles = selectedFiles.filter((file) =>
      file.name.toLowerCase().includes(lowerCaseQuery)
    );

    let resultText = `<b>検索結果:「${query}」</b><br>`;
    if (matchingFolders.length > 0) {
      resultText +=
        "<br><b>一致したフォルダ:</b><br>" + matchingFolders.join("<br>");
    }
    if (matchingFiles.length > 0) {
      resultText +=
        "<br><br><b>一致したファイル:</b><br>" +
        matchingFiles.map((f) => f.name).join("<br>");
    }
    if (matchingFolders.length === 0 && matchingFiles.length === 0) {
      resultText +=
        "<br>一致するファイルまたはフォルダは見つかりませんでした。";
    }

    setTimeout(() => {
      const searchResultMessage: Message = {
        id: Date.now(),
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
    }, 500); // 0.5秒後に表示
  };

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        flexFlow: "column",
        backgroundColor: "#f5f5f5",
      }}
    >
      <input
        type="file"
        multiple
        // 'webkitdirectory' は標準ではないため、TypeScriptの型定義には含まれない
        {...{ webkitdirectory: "" }}
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />
      <BackButton></BackButton>
      <Paper
        elevation={3}
        sx={{
          width: "90vw",
          height: "90vh",
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
        </Box>
        <TextInput
          onSendMessage={handleSearch}
          onAttachClick={() => fileInputRef.current?.click()}
        />
      </Paper>
    </Box>
  );
}
