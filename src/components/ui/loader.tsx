import { Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";

const sizeClasses: Record<string, string> = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
  "2xl": "h-10 w-10",
  "3xl": "h-12 w-12",
  "4xl": "h-16 w-16",
  "5xl": "h-20 w-20",
};

type IconSize = keyof typeof sizeClasses;

interface LoaderProps {
  className?: string;
  size?: IconSize;
}

export function Loader({ className, size = "sm" }: LoaderProps) {
  return (
    <Loader2
      className={cn(sizeClasses[size], "animate-spin", className)}
    />
  );
}
