import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Radio from "@mui/material/Radio";
import Typography from "@mui/material/Typography";
import ButtonBase from "@mui/material/ButtonBase";

export interface PlanOption {
  id: number;
  label: string; // 検索・表示用（例: "React の状態管理を体系的に理解する / 公式ドキュメントを読む"）
}

interface PlanPickerProps {
  options: PlanOption[];
  linkedIds: number[];
  onToggle: (planId: number) => void;
}

// メモカード内に展開するプラン検索パネル（図3）。行をタップするたびに即座にリンクON/OFFが切り替わる
export default function PlanPicker({ options, linkedIds, onToggle }: PlanPickerProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
      <TextField
        size="small"
        fullWidth
        placeholder="プランを検索…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 1 }}
      />
      <Stack sx={{ maxHeight: 200, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            見つかりませんでした。
          </Typography>
        ) : (
          filtered.map((opt) => {
            const linked = linkedIds.includes(opt.id);
            return (
              <ButtonBase
                key={opt.id}
                onClick={() => onToggle(opt.id)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  py: 0.5,
                  px: 0.5,
                  borderRadius: 1,
                  textAlign: "left",
                  justifyContent: "flex-start",
                }}
              >
                <Radio checked={linked} size="small" sx={{ p: 0.5 }} />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {opt.label}
                </Typography>
              </ButtonBase>
            );
          })
        )}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
        タップするたびに即座に切り替わります（保存操作なし）
      </Typography>
    </Box>
  );
}
