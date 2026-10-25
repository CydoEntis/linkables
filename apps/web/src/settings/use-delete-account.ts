import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { api } from "../api/api";
import { signOut, signOutEverywhere } from "../auth/supabase";
import { ACCOUNT_DELETED_PATH } from "./path";

export const CONFIRM_WORD = "DELETE";

// Only the dialog asks for the word; DELETE /me takes no body.
export const deleteAccountFormSchema = z.object({
  confirm: z.string().refine((value) => value.trim() === CONFIRM_WORD, { error: `Type ${CONFIRM_WORD} exactly as shown` }),
});

export type DeleteAccountForm = z.infer<typeof deleteAccountFormSchema>;

// The data is gone once the API answers, so the sessions end with it. Signing out
// runs apart from the mutation: a sign-out problem must never read as a failed delete.
// The goodbye page is public, so it stays once the sign-out lands.
export function useDeleteAccount() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => api.request("/me", z.null(), { method: "DELETE" }),
    onSuccess: async () => {
      await navigate({ to: ACCOUNT_DELETED_PATH, replace: true });
      void signOutEverywhere().catch(signOut);
    },
  });
}
