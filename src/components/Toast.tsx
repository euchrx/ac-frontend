import { useEffect } from "react";
import { createPortal } from "react-dom";

export function Toast({ message, kind, onClose }: {
  message: string;
  kind: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 7000);
    return () => window.clearTimeout(timer);
  }, [onClose]);
  return createPortal(
    <div className={`app-toast app-toast-${kind}`} role={kind === "error" ? "alert" : "status"} aria-atomic="true">
      <span className="app-toast-icon" aria-hidden="true">{kind === "error" ? "!" : "✓"}</span>
      <p>{message}</p>
      <button type="button" onClick={onClose} aria-label="Fechar notificação">×</button>
      <div className="app-toast-progress" aria-hidden="true" />
    </div>, document.body,
  );
}
