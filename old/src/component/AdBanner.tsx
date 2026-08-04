import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";

// Google AdSenseの発行者ID・広告ユニットIDは、審査通過後に環境変数で設定する
// （未設定の間はレイアウトに影響を与えないよう何も描画しない）
const AD_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT_ID as string | undefined;
const AD_SLOT = import.meta.env.VITE_ADSENSE_AD_SLOT as string | undefined;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

let scriptLoadPromise: Promise<void> | null = null;

// AdSenseのローダースクリプトはページ全体で1回だけ読み込めばよいため、
// 複数のAdBannerが同時にマウントされても二重読み込みしないようにする
function loadAdSenseScript(clientId: string): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-adsbygoogle-loader]"
    );
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
    script.crossOrigin = "anonymous";
    script.dataset.adsbygoogleLoader = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load AdSense script"));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

type AdBannerProps = {
  // Proプラン等、広告を出したくない場合にtrueを渡す
  // （課金プラン機能が未実装の間は常にfalseのままでよい）
  hidden?: boolean;
};

/** ゲストモード・フリープラン向けの広告枠（Google AdSense）。Proプランでは非表示にする */
export default function AdBanner({ hidden = false }: AdBannerProps) {
  const insRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (hidden || !AD_CLIENT || !AD_SLOT) return;
    loadAdSenseScript(AD_CLIENT)
      .then(() => {
        // StrictModeでのeffect二重実行や再マウントでも、同じins要素には
        // 一度しかpushしない（"already have ads in them"エラーを避けるため）
        if (pushedRef.current) return;
        pushedRef.current = true;
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (err) {
          console.error("AdSense広告の読み込みに失敗しました:", err);
        }
      })
      .catch((err) => console.error("AdSenseスクリプトの読み込みに失敗しました:", err));
  }, [hidden]);

  // 発行者ID・広告ユニットIDが未設定の間（AdSense審査が下りるまでなど）は何も表示しない
  if (hidden || !AD_CLIENT || !AD_SLOT) return null;

  return (
    <Box sx={{ my: 1, textAlign: "center", overflow: "hidden" }}>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={AD_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </Box>
  );
}
