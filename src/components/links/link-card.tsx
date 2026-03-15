import Image from "next/image";
import type { ShortLink } from "~/types";
import { formatDistanceToNowStrict } from "date-fns";
import { Calendar, Eye } from "lucide-react";
import { formatNumber, getBaseUrl } from "~/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { LinkCopyButton } from "~/components/links/link-copy-button";
import { LinkOptionsDropdown } from "~/components/links/link-options-dropdown";

interface LinkCardProps {
  link: ShortLink;
}

const PROTECTED_SLUG = "github";

export function LinkCard({ link }: LinkCardProps) {
  const shortUrl = `${getBaseUrl()}/${link.slug}`;
  const decodedUrl = decodeURIComponent(link.url);
  const isProtected = link.slug === PROTECTED_SLUG;

  const faviconUrl = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${decodedUrl}&size=32`;

  return (
    <div className="flex items-center gap-3 rounded-lg shadow-sm border hover:border-foreground transition-colors bg-card p-3">
      <Image
        src={faviconUrl}
        alt=""
        width={24}
        height={24}
        className="shrink-0 rounded aspect-square"
        unoptimized
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <a
            href={shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-sm font-medium underline font-mono"
          >
            {link.slug}
          </a>
          <Tooltip>
            <TooltipTrigger
              as="p"
              className="cursor-default flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors bg-transparent border-0 p-0"
            >
              <Eye className="h-3 w-3" />
              <span className="shrink-0">
                {formatNumber(link?.clicks ?? 0)}
              </span>
            </TooltipTrigger>
            <TooltipContent>Total views</TooltipContent>
          </Tooltip>
          {link.createdAt && (
            <Tooltip>
              <TooltipTrigger
                as="p"
                className="cursor-default flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors bg-transparent border-0 p-0"
              >
                <Calendar className="h-3 w-3" />
                <span className="shrink-0">
                  {formatDistanceToNowStrict(link.createdAt, {
                    addSuffix: true,
                  })}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Created on {link.createdAt.toLocaleDateString()}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{decodedUrl}</p>
        {link.description && (
          <p className="truncate text-xs text-muted-foreground">
            {link.description}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <LinkCopyButton shortUrl={shortUrl} />
        {!isProtected && (
          <LinkOptionsDropdown
            slug={link.slug}
            url={link.url}
            description={link.description}
            shortUrl={shortUrl}
          />
        )}
      </div>
    </div>
  );
}
