import GitHubIcon from "@mui/icons-material/GitHub";
import CloudOutlinedIcon from "@mui/icons-material/CloudOutlined";
import type { NoteAttachment } from "./PlanTypes";

// 添付ファイルの実体がどこにあるか（GitHubリポジトリ / Googleドライブ）を表すアイコン。
// 以前はkind === "image"のときに画像アイコンを優先していたため、画像添付だけ
// 保存先が分からなくなっていた。ファイル種別によらず必ず保存先を示す
export default function AttachmentProviderIcon({ provider }: { provider: NoteAttachment["provider"] }) {
  return provider === "google" ? <CloudOutlinedIcon fontSize="small" /> : <GitHubIcon fontSize="small" />;
}
