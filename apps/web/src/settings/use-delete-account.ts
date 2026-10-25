import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { api } from "../api/api";
import { signOut, signOutEverywhere } from "../auth/supabase";

export const CONFIRM_WORD = "DELETE";

// Only the dialog asks for the word; DELETE /me takes no body.
export const deleteAccountFormSchema = z.object({
  confirm: z.string().refine((value) => value.trim() === CONFIRM_WORD, { error: `Type ${CONFIRM_WORD} exactly as shown` }),
});

export type DeleteAccountForm = z.infer<typeof deleteAccountFormSchema>;

// The data is gone once the API answers, so the sessions end with it. Signing out
// runs apart from the mutation: a sign-out problem must never read as a failed delete.
export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => api.request("/me", z.null(), { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Your account is deleted", {
        description: "Your links, notes and collections are gone. Your sign-in is removed within 30 days.",
        duration: Infinity,
        closeButton: true,
      });
      void signOutEverywhere().catch(signOut);
    },
  });
}
