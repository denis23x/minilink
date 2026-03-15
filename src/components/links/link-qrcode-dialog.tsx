"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
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

const QR_EXPORT_SIZE = 1024;
const QR_DISPLAY_SIZE = 256;

export function LinkQRCodeDialog({ shortUrl, trigger }: LinkQRCodeDialogProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgExportRef = useRef<SVGSVGElement>(null);

  function triggerDownload(href: string, filename: string) {
    const a = anchorRef.current;
    if (!a) return;
    a.href = href;
    a.download = filename;
    a.click();
  }

  async function download(format: "png" | "jpeg" | "svg") {
    try {
      if (format === "svg") {
        const svg = svgExportRef.current;
        if (!svg) return;
        const serialized = new XMLSerializer().serializeToString(svg);
        const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
        triggerDownload(dataUri, `qr-${shortUrl}.svg`);
      } else {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dataUrl = canvas.toDataURL(`image/${format}`);
        triggerDownload(dataUrl, `qr-${shortUrl}.${format}`);
      }
    } catch {
      toast.error("Failed to export QR code");
    }
  }

  async function copyPng() {
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not ready");
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
          <QRCodeSVG value={shortUrl} size={QR_DISPLAY_SIZE} level="Q" />

          {/* Hidden elements used for export only */}
          <QRCodeSVG
            ref={svgExportRef}
            value={shortUrl}
            size={QR_EXPORT_SIZE}
            level="Q"
            className="hidden"
          />
          <QRCodeCanvas
            ref={canvasRef}
            value={shortUrl}
            size={QR_EXPORT_SIZE}
            level="Q"
            className="hidden"
          />

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
