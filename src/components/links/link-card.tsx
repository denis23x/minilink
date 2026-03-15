import Image from "next/image";
import type { ShortLink } from "~/types";
import { formatDistanceToNowStrict } from "date-fns";
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
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <Image
        src={faviconUrl}
        alt=""
        width={20}
        height={20}
        className="shrink-0 rounded"
        unoptimized
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <a
            href={shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-sm font-medium hover:underline"
          >
            /{link.slug}
          </a>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatNumber(link.clicks)} clicks
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{decodedUrl}</p>
        {link.description && (
          <p className="truncate text-xs text-muted-foreground">
            {link.description}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {!isProtected && link.createdAt && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNowStrict(link.createdAt, { addSuffix: true })}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {link.createdAt.toLocaleDateString()}
            </TooltipContent>
          </Tooltip>
        )}
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
