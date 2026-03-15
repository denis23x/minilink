import type { Session } from "next-auth";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

interface ProtectedElementProps {
  session: Session | null;
  children: React.ReactNode;
  message?: string;
}

export function ProtectedElement({
  session,
  children,
  message = "Sign in to use this feature",
}: ProtectedElementProps) {
  if (session) return <>{children}</>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-not-allowed opacity-50">{children}</span>
      </TooltipTrigger>
      <TooltipContent>{message}</TooltipContent>
    </Tooltip>
  );
}
