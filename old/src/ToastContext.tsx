import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import type { AlertColor } from "@mui/material/Alert";

type ToastAction = {
  label: string;
  onClick: () => void;
};

type ToastState = {
  key: number;
  message: string;
  severity: AlertColor;
  action?: ToastAction;
  durationMs: number;
};

type ToastContextValue = {
  showToast: (
    message: string,
    severity?: AlertColor,
    options?: { action?: ToastAction; durationMs?: number }
  ) => void;
};

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

// alert() の代わりに使う、画面を止めないトースト通知。
// 「元に戻す」のようなアクション付きトーストも出せる
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [open, setOpen] = useState(false);

  const showToast = useCallback(
    (
      message: string,
      severity: AlertColor = "info",
      options?: { action?: ToastAction; durationMs?: number }
    ) => {
      setToast({
        key: Date.now(),
        message,
        severity,
        action: options?.action,
        durationMs: options?.durationMs ?? 4000,
      });
      setOpen(true);
    },
    []
  );

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") return;
    setOpen(false);
  };

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        key={toast?.key}
        open={open}
        autoHideDuration={toast?.durationMs ?? 4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ mb: { xs: 7, sm: 0 } }} // スマホ用ボトムナビ(56px)に隠れないよう底上げ
      >
        <Alert
          onClose={handleClose}
          severity={toast?.severity ?? "info"}
          variant="filled"
          sx={{ width: "100%" }}
          action={
            toast?.action ? (
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  toast.action!.onClick();
                  handleClose();
                }}
              >
                {toast.action.label}
              </Button>
            ) : undefined
          }
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
