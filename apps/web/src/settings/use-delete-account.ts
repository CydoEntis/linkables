import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { api } from "../api/api";
import { forgetSession } from "../auth/session";
import { markAccountDeleted } from "./account-deleted";
import { ACCOUNT_DELETED_PATH } from "./path";

export const CONFIRM_WORD = "DELETE";

// Only the dialog asks for the word; DELETE /me takes no body.
export const deleteAccountFormSchema = z.object({
  confirm: z.string().refine((value) => value.trim() === CONFIRM_WORD, { error: `Type ${CONFIRM_WORD} exactly as shown` }),
});

export type DeleteAccountForm = z.infer<typeof deleteAccountFormSchema>;

// Every session, then this browser's alone if the revoke fails. supabase-js serialises
// sign-outs, so a second call while one runs finds no session and does nothing.
export function endSessions(): Promise<void> {
  return forgetSession();
}

// The data is gone once the API answers, so the sessions end with it. Signing out
// runs apart from the mutation: a sign-out problem must never read as a failed delete.
// It starts once the public goodbye page is showing, so the gate never sends it to sign-in,
// and starts even if that navigation fails.
export function useDeleteAccount() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => api.request("/me", z.null(), { method: "DELETE" }),
    onSuccess: () => {
      markAccountDeleted();
      void navigate({ to: ACCOUNT_DELETED_PATH, replace: true }).finally(() => void endSessions());
    },
  });
}

