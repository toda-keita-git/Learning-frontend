import { useState, useEffect } from "react";

/**
 * FileReaderを使って画像ファイルからBase64 URLを生成
 */
export const useGetImageUrl = (file: File | null): string | null => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImageUrl(e.target.result as string); // Base64データURL
      }
    };
    reader.readAsDataURL(file);

    return () => {
      reader.abort();
    };
  }, [file]);

  return imageUrl;
};
