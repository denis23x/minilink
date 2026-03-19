"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Download } from "lucide-react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/ui/responsive-dialog";

interface LinkQRCodeDialogProps {
  shortUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QR_EXPORT_SIZE = 1024;
const QR_DISPLAY_SIZE = 256;

function useQRColors() {
  const read = () => {
    const s = getComputedStyle(document.documentElement);
    return {
      bgColor: s.getPropertyValue("--background").trim(),
      fgColor: s.getPropertyValue("--primary").trim(),
    };
  };

  const [colors, setColors] = useState({ bgColor: "#ffffff", fgColor: "#000000" });

  useEffect(() => {
    setColors(read());
    const observer = new MutationObserver(() => setColors(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return colors;
}

export function LinkQRCodeDialog({
  shortUrl,
  open,
  onOpenChange,
}: LinkQRCodeDialogProps) {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgExportRef = useRef<SVGSVGElement>(null);
  const marginSize = 2;
  const { bgColor, fgColor } = useQRColors();

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

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shortUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>QR Code</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Scan or export the QR code for this link
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="flex flex-col items-center gap-4">
          <QRCodeSVG
            value={shortUrl}
            size={QR_DISPLAY_SIZE}
            marginSize={marginSize}
            className="rounded-lg border w-full h-auto"
            level="Q"
            bgColor={bgColor}
            fgColor={fgColor}
          />

          {/* Hidden elements used for export only */}
          <QRCodeSVG
            ref={svgExportRef}
            value={shortUrl}
            size={QR_EXPORT_SIZE}
            level="Q"
            className="hidden"
            marginSize={marginSize}
            bgColor={bgColor}
            fgColor={fgColor}
          />
          <QRCodeCanvas
            ref={canvasRef}
            value={shortUrl}
            size={QR_EXPORT_SIZE}
            level="Q"
            className="hidden"
            marginSize={marginSize}
            bgColor={bgColor}
            fgColor={fgColor}
          />

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={copyPng}>
              <Copy className="h-4 w-4" />
              Copy PNG
            </Button>
            <Button variant="outline" onClick={copyLink}>
              <Copy className="h-4 w-4" />
              Copy link
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" onClick={() => download("png")}>
              <Download className="h-4 w-4" />
              PNG
            </Button>
            <Button variant="default" onClick={() => download("jpeg")}>
              <Download className="h-4 w-4" />
              JPEG
            </Button>
            <Button variant="default" onClick={() => download("svg")}>
              <Download className="h-4 w-4" />
              SVG
            </Button>
          </div>
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
      {/* Hidden anchor for programmatic downloads */}
      <a ref={anchorRef} className="hidden" aria-hidden="true" />
    </ResponsiveDialog>
  );
}
