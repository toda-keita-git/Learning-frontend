import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import CodeOutlinedIcon from "@mui/icons-material/CodeOutlined";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import type { ReactNode } from "react";

export interface GoalTemplate {
  id: string;
  title: string;
  description: string;
  steps: string[];
}

const templates: Array<GoalTemplate & { icon: ReactNode }> = [
  {
    id: "qualification",
    title: "資格試験に合格する",
    description: "試験日までの学習計画を作りたい人向け",
    steps: ["試験範囲と現在地を確認する", "毎週の学習計画を作る", "問題演習と弱点復習を進める"],
    icon: <SchoolOutlinedIcon color="primary" />,
  },
  {
    id: "programming",
    title: "プログラミングを習得する",
    description: "技術学習と制作物を一緒に管理したい人向け",
    steps: ["基礎教材を完了する", "小さな制作物を完成させる", "公開して改善する"],
    icon: <CodeOutlinedIcon color="primary" />,
  },
  {
    id: "sidework",
    title: "副業で最初の収益を作る",
    description: "準備から販売・応募まで行動に分けたい人向け",
    steps: ["提供する価値を決める", "実績になる成果物を作る", "販売または応募を始める"],
    icon: <WorkOutlineIcon color="primary" />,
  },
];

interface GoalTemplatesProps {
  applyingId: string | null;
  onApply: (template: GoalTemplate) => void;
  onCreateBlank: () => void;
}

export default function GoalTemplates({ applyingId, onApply, onCreateBlank }: GoalTemplatesProps) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, borderStyle: "dashed" }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
            まず、達成したいことを選びましょう
          </Typography>
          <Typography variant="body2" color="text.secondary">
            テンプレートは後から自由に編集できます。空の状態から作ることもできます。
          </Typography>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1.25 }}>
          {templates.map((template) => (
            <Paper key={template.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack spacing={1.25} height="100%">
                {template.icon}
                <Typography sx={{ fontWeight: 700 }}>{template.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                  {template.description}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={applyingId !== null}
                  onClick={() => onApply(template)}
                >
                  {applyingId === template.id ? "作成中…" : "この例を使う"}
                </Button>
              </Stack>
            </Paper>
          ))}
        </Box>
        <Button onClick={onCreateBlank} disabled={applyingId !== null} sx={{ alignSelf: "center" }}>
          自分で最初から作る
        </Button>
      </Stack>
    </Paper>
  );
}
