import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/torque/AuthShell";
import { clerkAppearance } from "@/components/torque/clerkAppearance";

export default function Page() {
  return (
    <AuthShell mode="login">
      <SignIn routing="path" path="/login" signUpUrl="/signup" appearance={clerkAppearance} />
    </AuthShell>
  );
}

