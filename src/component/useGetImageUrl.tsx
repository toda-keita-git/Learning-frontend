import { useState, useEffect } from "react";

/**
 * 画像ファイルからプレビューURLを生成するカスタムフック
 * 
 * @param file - 選択された File オブジェクト
 * @returns {string | null} 生成された画像URL（プレビュー用）
 */
export const useGetImageUrl = (file: File | null): string | null => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setImageUrl(url);

    // メモリリーク防止
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return imageUrl;
};
