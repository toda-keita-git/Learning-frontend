import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";

// 達成率の表示。nullは「未設定」であり0%とは区別する（仕様書「進捗集計ロジック」章）
//
// プランボードでは何十行も縦に並ぶため、すべて同じ色のバーだと
// 「どの枝が進んでいて、どこが止まっているか」がひと目では読み取れない。
// 完了・進行中・未着手で色を変えて、走査しただけで状態が分かるようにする。
// 色だけに意味を持たせると色覚特性によっては判別できないため、
// 数値（％）は常に併記したままにしている。
const colorOf = (rounded: number): "success" | "primary" | "warning" => {
  if (rounded >= 100) return "success";
  if (rounded > 0) return "primary";
  return "warning";
};

export default function ProgressBadge({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600 }}>
        未設定
      </Typography>
    );
  }
  const rounded = Math.round(value);
  const color = colorOf(rounded);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 120 }}>
      <LinearProgress
        variant="determinate"
        value={rounded}
        color={color}
        sx={{ flex: 1, height: 6, borderRadius: 3 }}
      />
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, minWidth: 32, textAlign: "right", color: `${color}.main` }}
      >
        {rounded}%
      </Typography>
    </Box>
  );
}
