import { exportResponseSchema } from "@linkables/shared/export";
import { useRef } from "react";
import { toast } from "sonner";
import { api } from "../api/api";
import { exportBlob, exportFileName } from "./export-file";

export const REVOKE_AFTER_MS = 10_000;

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  // Some browsers read the blob only after click() returns, and slowly for a big file.
  setTimeout(() => { URL.revokeObjectURL(url); }, REVOKE_AFTER_MS);
}

// All export logic is the API's; the app only saves what GET /export returns.
// Resolves to whether this call downloaded the file.
export function useExportLinks() {
  const running = useRef(false);

  return async (): Promise<boolean> => {
    if (running.current) return false;
    running.current = true;
    const toastId = toast.loading("Preparing your export…");
    try {
      const data = await api.request("/export", exportResponseSchema);
      download(exportBlob(data), exportFileName(data.exportedAt));
      toast.success("Export downloaded", { id: toastId });
      return true;
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      toast.error("Couldn't export your links. Try again.", { id: toastId });
      return false;
    } finally {
      running.current = false;
    }
  };
}
