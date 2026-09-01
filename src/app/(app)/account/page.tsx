import { ChangePasswordForm } from "@/components/change-password-form";
import { Card } from "@/components/ui";
import { requireMember } from "@/lib/auth";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const { user, member } = await requireMember();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted">
          Signed in as{" "}
          <span className="text-foreground">{member.display_name ?? user.email}</span>
          {member.display_name && ` (${user.email})`}.
        </p>
      </div>

      <Card title="Change password">
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
