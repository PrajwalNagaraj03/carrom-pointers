"use client";

import { useActionState } from "react";

import { Button, Field, FormError, inputClass } from "@/components/ui";
import { changePassword } from "@/lib/actions/account";
import { initialActionState } from "@/lib/actions/shared";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initialActionState);
  const done = Boolean(state.savedAt) && !state.error;

  return (
    // Remounting on a successful change clears all three boxes.
    <form
      key={state.savedAt ?? "new"}
      action={action}
      className="flex max-w-sm flex-col gap-4 p-4 sm:p-5"
    >
      <FormError message={state.error} />

      {done && (
        <p
          role="status"
          className="rounded-lg border border-positive/40 bg-positive/10 px-3 py-2 text-sm text-positive"
        >
          Password changed. Use the new one next time you sign in.
        </p>
      )}

      <Field label="Current password">
        <input
          type="password"
          name="current_password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </Field>

      <Field label="New password" hint="At least 8 characters.">
        <input
          type="password"
          name="new_password"
          autoComplete="new-password"
          minLength={8}
          required
          className={inputClass}
        />
      </Field>

      <Field label="Confirm new password">
        <input
          type="password"
          name="confirm_password"
          autoComplete="new-password"
          minLength={8}
          required
          className={inputClass}
        />
      </Field>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Changing…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}
