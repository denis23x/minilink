import { getServerAuthSession } from "~/server/auth";
import { SigninDialog } from "~/components/auth/signin-dialog";
import { UserProfileDropdown } from "~/components/auth/user-profile-dropdown";

export async function UserProfile() {
  const session = await getServerAuthSession();

  if (session) {
    return <UserProfileDropdown session={session} />;
  }

  return <SigninDialog />;
}
