import Link from "next/link";

import type { BoardView } from "@/lib/types/database";

const LABELS: Record<BoardView, { short: string; long: string }> = {
  all: { short: "All", long: "All matches" },
  three: { short: "3-player", long: "Three-player boards" },
  two: { short: "1-on-1", long: "One-on-one matches" },
};

/**
 * Which board the leaderboard below is showing. Plain links with a query
 * parameter rather than client state: the standings are server-rendered, so the
 * switch is a navigation, and it survives a refresh and a shared link.
 */
export function BoardTabs({
  basePath,
  current,
}: {
  basePath: string;
  current: BoardView;
}) {
  return (
    <div
      role="tablist"
      aria-label="Which matches to count"
      className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1"
    >
      {(Object.keys(LABELS) as BoardView[]).map((view) => {
        const active = view === current;

        return (
          <Link
            key={view}
            href={view === "all" ? basePath : `${basePath}?board=${view}`}
            role="tab"
            aria-selected={active}
            aria-label={LABELS[view].long}
            className={`inline-flex min-h-9 shrink-0 items-center rounded-lg border px-3 text-xs font-medium transition-colors ${
              active
                ? "border-accent bg-accent-soft text-accent"
                : "border-border text-muted hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            {LABELS[view].short}
          </Link>
        );
      })}
    </div>
  );
}

export const BOARD_CAPTIONS: Record<BoardView, string> = {
  all: "Every match this season, whoever was round the board.",
  three: "Only the matches all three of you played.",
  two: "Only the matches played one against one.",
};
