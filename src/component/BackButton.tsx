import Button from "@mui/material/Button";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { useNavigate } from "react-router-dom";

export default function BackButton() {
  const navigate = useNavigate();

  // 戻るボタン押下時処理
  const clickBack = () => {
    navigate("/");
  };

  return (
    <Button
      sx={{
        margin: "10px",
      }}
      variant="contained"
      endIcon={<ArrowBackIosNewIcon />}
      onClick={clickBack}
    >
      戻る
    </Button>
  );
}
