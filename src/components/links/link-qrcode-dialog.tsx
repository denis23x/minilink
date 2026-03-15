"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { getQRAsCanvas, getQRAsSVGDataUri, QRCodeSVG } from "~/lib/qrcode";
import { Button } from "~/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "~/components/ui/responsive-dialog";

interface LinkQRCodeDialogProps {
  shortUrl: string;
  trigger: React.ReactNode;
}

export function LinkQRCodeDialog({ shortUrl, trigger }: LinkQRCodeDialogProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLAnchorElement>(null);

  async function download(format: "png" | "jpeg" | "svg") {
    try {
      if (format === "svg") {
        const dataUri = getQRAsSVGDataUri({ value: shortUrl, size: 1024 });
        triggerDownload(dataUri, `qr-${shortUrl}.svg`);
      } else {
        const canvas = await getQRAsCanvas({ value: shortUrl, size: 1024 });
        const dataUrl = canvas.toDataURL(`image/${format}`);
        triggerDownload(dataUrl, `qr-${shortUrl}.${format}`);
      }
    } catch {
      toast.error("Failed to export QR code");
    }
  }

  function triggerDownload(href: string, filename: string) {
    const a = anchorRef.current;
    if (!a) return;
    a.href = href;
    a.download = filename;
    a.click();
  }

  async function copyPng() {
    try {
      const canvas = await getQRAsCanvas({ value: shortUrl, size: 1024 });
      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error("Failed to create blob");
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        toast.success("QR code copied");
      });
    } catch {
      toast.error("Failed to copy QR code");
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger>
        <span onClick={() => setOpen(true)}>{trigger}</span>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>QR Code</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="flex flex-col items-center gap-4 p-4">
          <QRCodeSVG value={shortUrl} size={256} level="Q" />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={copyPng}>
              Copy PNG
            </Button>
            <Button variant="outline" size="sm" onClick={() => download("png")}>
              PNG
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => download("jpeg")}
            >
              JPEG
            </Button>
            <Button variant="outline" size="sm" onClick={() => download("svg")}>
              SVG
            </Button>
          </div>
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
      {/* Hidden anchor for programmatic downloads */}
      <a ref={anchorRef} className="hidden" aria-hidden="true" />
    </ResponsiveDialog>
  );
}
