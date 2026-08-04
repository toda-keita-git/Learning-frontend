import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";

// 達成率の表示。nullは「未設定」であり0%とは区別する（仕様書「進捗集計ロジック」章）
export default function ProgressBadge({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600 }}>
        未設定
      </Typography>
    );
  }
  const rounded = Math.round(value);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 120 }}>
      <LinearProgress
        variant="determinate"
        value={rounded}
        sx={{ flex: 1, height: 6, borderRadius: 3 }}
      />
      <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 32, textAlign: "right" }}>
        {rounded}%
      </Typography>
    </Box>
  );
}
