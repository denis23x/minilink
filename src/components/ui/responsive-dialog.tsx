"use client";

import { createContext, useContext } from "react";
import { useMediaQuery } from "~/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";

const ResponsiveDialogContext = createContext<{
  isDesktop: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({
  isDesktop: false,
  open: false,
  onOpenChange: () => void 0,
});

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  children,
}: ResponsiveDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <ResponsiveDialogContext.Provider value={{ isDesktop, open, onOpenChange }}>
      {isDesktop ? (
        <Dialog open={open} onOpenChange={onOpenChange}>
          {children}
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={onOpenChange}>
          {children}
        </Drawer>
      )}
    </ResponsiveDialogContext.Provider>
  );
}

export function ResponsiveDialogTrigger({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

export function ResponsiveDialogContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isDesktop } = useContext(ResponsiveDialogContext);
  if (isDesktop) return <DialogContent>{children}</DialogContent>;
  return <DrawerContent>{children}</DrawerContent>;
}

export function ResponsiveDialogBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function ResponsiveDialogHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isDesktop } = useContext(ResponsiveDialogContext);
  if (isDesktop) return <DialogHeader>{children}</DialogHeader>;
  return <DrawerHeader className="text-left">{children}</DrawerHeader>;
}

export function ResponsiveDialogTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isDesktop } = useContext(ResponsiveDialogContext);
  if (isDesktop) return <DialogTitle>{children}</DialogTitle>;
  return <DrawerTitle>{children}</DrawerTitle>;
}

// Mobile-only
export function ResponsiveDialogFooter({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isDesktop } = useContext(ResponsiveDialogContext);
  if (isDesktop) return null;
  return <DrawerFooter>{children}</DrawerFooter>;
}

export function ResponsiveDialogClose({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isDesktop } = useContext(ResponsiveDialogContext);
  if (isDesktop) return null;
  return <DrawerClose asChild>{children}</DrawerClose>;
}
