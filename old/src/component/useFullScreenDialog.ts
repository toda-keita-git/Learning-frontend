import useMediaQuery from "@mui/material/useMediaQuery";

// スマホ幅では、フォームや一覧などの中身が窮屈になりやすいダイアログを
// 画面いっぱいに広げる。600px はMUIの既定breakpoint（sm）に合わせている
export const useFullScreenDialog = (): boolean =>
  useMediaQuery("(max-width:600px)");
