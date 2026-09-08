"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import { Leaderboard } from "@/components/leaderboard";
import { isBoardView } from "@/lib/types/database";
import type { BoardView, SizedStandingsRow, StandingsRow } from "@/lib/types/database";

const LABELS: Record<BoardView, { short: string; long: string; caption: string }> = {
  all: {
    short: "All",
    long: "All matches",
    caption: "Every match this season, whoever was round the board.",
  },
  three: {
    short: "3-player",
    long: "Three-player boards",
    caption: "Only the matches all three of you played.",
  },
  two: {
    short: "1-on-1",
    long: "One-on-one matches",
    caption: "Only the matches played one against one.",
  },
};

const REMEMBERED = "carrom.board";

/**
 * The three boards, switched in the browser.
 *
 * They used to be links, so every click was a round trip that re-ran the auth
 * check and refetched the whole page -- match list and all -- to swap one table.
 * Three players make these tables a few rows each, so the page now carries all
 * three and the switch costs nothing.
 *
 * The trade is that the board is no longer in the URL, so it cannot be linked
 * to; localStorage keeps your last choice across reloads instead.
 */
export function SeasonBoards({
  all,
  bySize,
}: {
  all: StandingsRow[];
  bySize: SizedStandingsRow[];
}) {
  // Read through useSyncExternalStore rather than an effect: it gives the server
  // render an explicit snapshot ("all"), so there is no flash of the wrong tab
  // and no setState during mount.
  const remembered = useSyncExternalStore(subscribe, readStored, () => null);
  const [picked, setPicked] = useState<BoardView | null>(null);

  const view: BoardView = picked ?? (isBoardView(remembered) ? remembered : "all");

  function choose(next: BoardView) {
    setPicked(next);
    try {
      window.localStorage.setItem(REMEMBERED, next);
    } catch {
      // Private browsing or blocked site data. Not worth failing a click over.
    }
  }

  const boards = useMemo(() => {
    const forSize = (size: number) =>
      bySize
        .filter((row) => row.table_size === size)
        // Named rather than spread around table_size, so the two row types stay
        // independent.
        .map((row) => ({
          season_id: row.season_id,
          player_id: row.player_id,
          player_name: row.player_name,
          is_active: row.is_active,
          matches_played: row.matches_played,
          wins: row.wins,
          draws: row.draws,
          losses: row.losses,
          points_scored: row.points_scored,
          best_score: row.best_score,
        }))
        .sort(
          (a, b) =>
            b.points_scored - a.points_scored ||
            b.wins - a.wins ||
            b.best_score - a.best_score ||
            a.player_name.localeCompare(b.player_name),
        );

    return { all, three: forSize(3), two: forSize(2) };
  }, [all, bySize]);

  return (
    <section className="rounded-xl border border-border bg-surface shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Leaderboard
        </h2>

        <div
          role="tablist"
          aria-label="Which matches to count"
          className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1"
        >
          {(Object.keys(LABELS) as BoardView[]).map((option) => {
            const active = option === view;

            return (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={LABELS[option].long}
                onClick={() => choose(option)}
                className={`inline-flex min-h-9 shrink-0 items-center rounded-lg border px-3 text-xs font-medium transition-colors ${
                  active
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-muted hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                {LABELS[option].short}
              </button>
            );
          })}
        </div>
      </header>

      <p className="border-b border-border px-4 py-2 text-xs text-muted sm:px-5">
        {LABELS[view].caption} Ranked by points scored.
      </p>

      <Leaderboard rows={boards[view]} />
    </section>
  );
}

function readStored(): string | null {
  try {
    return window.localStorage.getItem(REMEMBERED);
  } catch {
    return null;
  }
}

/** Another tab changing the choice keeps this one in step. */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}
