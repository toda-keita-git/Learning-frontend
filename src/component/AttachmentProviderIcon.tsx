import GitHubIcon from "@mui/icons-material/GitHub";
import GoogleIcon from "@mui/icons-material/Google";
import type { NoteAttachment } from "./PlanTypes";

// 添付ファイルの実体がどこにあるか（GitHubリポジトリ / Googleドライブ）を表すアイコン。
// 以前はkind === "image"のときに画像アイコンを優先していたため、画像添付だけ
// 保存先が分からなくなっていた。ファイル種別によらず必ず保存先を示す。
//
// Google側は汎用のクラウドアイコンではなくGマークにする。ログインボタン
// （AuthenticatedGoalApp）でも同じGoogleIconを使っており、一目でGoogleだと分かるため
export default function AttachmentProviderIcon({ provider }: { provider: NoteAttachment["provider"] }) {
  return provider === "google" ? <GoogleIcon fontSize="small" /> : <GitHubIcon fontSize="small" />;
}
