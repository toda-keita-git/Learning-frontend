import Button from "@mui/material/Button";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import { useNavigate } from "react-router-dom";

interface BackButtonProps {
  // スマホのドロワー内から使う場合、遷移前にドロワーを閉じておく処理。
  // 開いたままページ遷移すると、ドロワー(MUI Modal)のスクロールロックが
  // 解除されないまま残り、遷移後のページがスクロールできなくなることがあるため
  onBeforeNavigate?: () => void;
}

export default function BackButton({ onBeforeNavigate }: BackButtonProps) {
  const navigate = useNavigate();

  // ホームへ戻るボタン押下時処理
  const clickBack = () => {
    onBeforeNavigate?.();
    navigate("/");
  };

  return (
    <Button
      sx={{
        margin: "10px",
      }}
      variant="contained"
      startIcon={<HomeOutlinedIcon />}
      onClick={clickBack}
    >
      ホーム
    </Button>
  );
}
