import { cn } from "~/lib/utils";

type HeadingVariant = "h1" | "h2" | "h3" | "h4";

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  variant?: HeadingVariant;
  isFirstBlock?: boolean;
}

const variantStyles: Record<HeadingVariant, string> = {
  h1: "text-3xl font-bold tracking-tight",
  h2: "text-2xl font-semibold tracking-tight",
  h3: "text-xl font-semibold",
  h4: "text-lg font-medium",
};

export function Heading({ variant = "h2", isFirstBlock, className, children, ...props }: HeadingProps) {
  const Tag = variant;
  return (
    <Tag
      className={cn(variantStyles[variant], isFirstBlock && "mt-0", className)}
      {...props}
    >
      {children}
    </Tag>
  );
}
