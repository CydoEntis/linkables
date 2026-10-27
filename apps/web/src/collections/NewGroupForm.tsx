import { COLLECTION_GROUPS_MAX } from "@linkables/shared/groups";
import { useId } from "react";
import { useCollectionsUi } from "./collections-ui-store";
import { useGroupNameForm } from "./use-group-name-form";
import { useCreateGroup } from "./use-groups";

type NewGroupFormProps = { collectionId: string; groupCount: number };

// Enter creates, Esc cancels; a name that is taken or over the cap stays in the field with the reason.
export function NewGroupForm({ collectionId, groupCount }: NewGroupFormProps) {
  const setCreatingGroupIn = useCollectionsUi((state) => state.setCreatingGroupIn);
  const create = useCreateGroup(collectionId);
  const { register, onSubmit, error } = useGroupNameForm({
    atLimit: groupCount >= COLLECTION_GROUPS_MAX,
    save: async (name) => {
      await create.mutateAsync(name);
      setCreatingGroupIn(null);
    },
  });
  const errorId = useId();
  const field = register("name");

  return (
    <form noValidate onSubmit={onSubmit} className="mx-3 mb-3 flex max-w-[420px] animate-pop flex-col gap-1 md:mx-3.5">
      <input
        {...field}
        autoFocus
        autoComplete="off"
        placeholder="Name the group, then Enter"
        aria-label="New group name"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setCreatingGroupIn(null);
          }
        }}
        className="h-11 rounded-xl bg-muted px-3 text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring aria-invalid:shadow-[inset_0_0_0_1.5px_var(--destructive)] md:h-10 md:text-[14.5px]"
      />
      {error ? (
        <p id={errorId} role="alert" className="px-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
