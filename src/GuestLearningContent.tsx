import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import GitHubIcon from "@mui/icons-material/GitHub";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ResponsiveAppBar from "./component/ResponsiveAppBar";
import { MessageLeft, MessageRight } from "./component/Message";
import LearningResultCards from "./component/LearningResultCards";
import NewLearningDialog from "./component/NewLearningDialog";
import { TextInputLearning } from "./component/TextInputLearning";
import { parseReferenceUrls } from "./component/referenceUrls";
import {
  type GuestLearningRecord,
  listGuestRecords,
  createGuestRecord,
  updateGuestRecord,
  deleteGuestRecord,
  extractGuestTags,
} from "./component/guestStorage";

type Message = {
  id: number;
  text: string;
  timestamp: string;
  type: "left" | "right";
  displayName?: string;
  cards?: GuestLearningRecord[];
  action?: { label: string; onClick: () => void };
};

const nowLabel = () =>
  new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

export default function GuestLearningContent() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<GuestLearningRecord[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<GuestLearningRecord | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const welcomeShownRef = useRef(false);

  const openNewLearningDialog = () => {
    setEditingItem(null);
    setOpenNewDialog(true);
  };

  useEffect(() => {
    setRecords(listGuestRecords());
  }, []);

  useEffect(() => {
    if (welcomeShownRef.current) return;
    welcomeShownRef.current = true;
    const hasRecords = listGuestRecords().length > 0;
    setMessages([
      {
        id: Date.now(),
        text: hasRecords
          ? "おかえりなさい。ゲストモードの記録はこの端末に保存されています。"
          : "ゲストモードへようこそ。GitHubログイン不要で、学習記録の登録・検索・編集をお試しいただけます。まずは1件、記録してみましょう。",
        timestamp: nowLabel(),
        type: "left",
        displayName: "システム",
        action: hasRecords ? undefined : { label: "学んだことを記録する", onClick: openNewLearningDialog },
      },
    ]);
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const postResultCards = (results: GuestLearningRecord[], header: string) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + 1, text: header, timestamp: nowLabel(), type: "left", displayName: "システム", cards: results },
    ]);
  };

  const handleSearch = (query: string) => {
    const trimmedQuery = query.trim();
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text: trimmedQuery, timestamp: nowLabel(), type: "right" },
    ]);

    let results = [...records];
    if (trimmedQuery) {
      const keywords = trimmedQuery.toLowerCase().split(/[\s\u3000]+/).filter((k) => k.length > 0);
      results = results.filter((item) => {
        const searchableText = [
          item.title,
          item.explanatory_text,
          parseReferenceUrls(item.reference_url).join(" "),
          item.tags.join(" "),
        ]
          .join("\n")
          .toLowerCase();
        return keywords.every((keyword) => searchableText.includes(keyword));
      });
    }
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    postResultCards(results, `🔎 検索結果: ${results.length}件`);
  };

  const openEditDialog = (id: number) => {
    const item = records.find((r) => r.id === id);
    if (item) {
      setEditingItem(item);
      setOpenNewDialog(true);
    }
  };

  const handleDelete = (id: number) => {
    const item = records.find((r) => r.id === id);
    if (!item) return;
    if (!window.confirm(`「${item.title}」を削除しますか？この操作は元に戻せません。`)) return;
    deleteGuestRecord(id);
    setRecords(listGuestRecords());
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: `「${item.title}」を削除しました。`,
        timestamp: nowLabel(),
        type: "left",
        displayName: "システム",
      },
    ]);
  };

  const handleSubmit = async (submissionData: any) => {
    const { learningData } = submissionData;
    const isEdit = !!learningData.id;

    if (isEdit) {
      updateGuestRecord(learningData.id, learningData);
    } else {
      const created = createGuestRecord(learningData);
      if (!created) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            text: "この端末に保存できませんでした。プライベートブラウジング中でないかご確認ください。",
            timestamp: nowLabel(),
            type: "left",
            displayName: "システム",
          },
        ]);
        return;
      }
    }
    setRecords(listGuestRecords());
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: isEdit ? `「${learningData.title}」を更新しました。` : `「${learningData.title}」を登録しました。`,
        timestamp: nowLabel(),
        type: "left",
        displayName: "システム",
      },
    ]);
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <ResponsiveAppBar />

      <Paper elevation={0} sx={{ bgcolor: "warning.main", color: "warning.contrastText" }}>
        <Container maxWidth="md">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
            sx={{ py: 1 }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <InfoOutlinedIcon fontSize="small" />
              <Typography variant="body2">
                ゲストモードで利用中です。記録はこの端末にのみ保存されます（他の端末とは共有されません）。
              </Typography>
            </Stack>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              startIcon={<GitHubIcon />}
              onClick={() => navigate("/LearningContent")}
              sx={{ flexShrink: 0 }}
            >
              GitHubでログインする
            </Button>
          </Stack>
        </Container>
      </Paper>

      <Container maxWidth="md" sx={{ flexGrow: 1, display: "flex", flexDirection: "column", py: 2, overflow: "hidden" }}>
        <Box sx={{ flexGrow: 1, overflowY: "auto", px: 0.5 }}>
          {messages.map((msg) =>
            msg.type === "left" ? (
              msg.cards ? (
                <LearningResultCards
                  key={msg.id}
                  header={msg.text}
                  timestamp={msg.timestamp}
                  items={msg.cards}
                  allItems={records}
                  onViewFile={() => {}}
                  onEdit={openEditDialog}
                  onDelete={handleDelete}
                  onOpenRelated={openEditDialog}
                />
              ) : (
                <MessageLeft
                  key={msg.id}
                  message={msg.text}
                  timestamp={msg.timestamp}
                  displayName={msg.displayName}
                  action={msg.action}
                />
              )
            ) : (
              <MessageRight key={msg.id} message={msg.text} timestamp={msg.timestamp} />
            )
          )}
          <div ref={messageEndRef} />
        </Box>

        <Box sx={{ mt: 1 }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={openNewLearningDialog}
            sx={{ mb: 1 }}
          >
            学んだことを記録する
          </Button>
          <TextInputLearning onSendMessage={handleSearch} onSearchMenuClick={() => {}} hideDetailedSearch />
        </Box>
      </Container>

      <NewLearningDialog
        open={openNewDialog}
        onClose={() => setOpenNewDialog(false)}
        onSubmit={handleSubmit}
        allTags={extractGuestTags(records).map((name) => ({ name }))}
        allCategories={[]}
        editingData={editingItem}
        onFetchFile={async () => null}
        hideAttachments
        requireCategory={false}
      />
    </Box>
  );
}
