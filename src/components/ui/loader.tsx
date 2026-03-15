import type { VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";
import { Icons, iconVariants } from "~/components/ui/icons";

type IconSize = NonNullable<VariantProps<typeof iconVariants>["size"]>;

interface LoaderProps {
  className?: string;
  size?: IconSize;
}

export function Loader({ className, size = "sm" }: LoaderProps) {
  return (
    <Icons.loader className={cn(iconVariants({ size }), "animate-spin", className)} />
  );
}
