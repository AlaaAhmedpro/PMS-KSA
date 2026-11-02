import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { useData } from "../../store/DataStore";
import { useAuth } from "../../store/AuthContext";
import { NEWS_CATEGORY_LABELS, NEWS_CATEGORY_STYLE } from "../../lib/constants";
import { cn } from "../../lib/cn";
import type { NewsItem } from "../../lib/types";

/** سرعة ثابتة (بكسل/ثانية) */
const SCROLL_SPEED_PX = 68;
const MIN_TILES = 2;

const CAT_TICKER_STYLE: Record<string, string> = {
  sales: "bg-sky-500/20 text-sky-300 border border-sky-500/25",
  goals: "bg-brand-500/20 text-brand-200 border border-brand-500/30",
  congrats: "bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-500/25",
  alert: "bg-red-500/25 text-red-200 border border-red-500/35",
};

type TickerEntry = { item: NewsItem; key: string };

function TickerItem({ entry }: { entry: TickerEntry }) {
  const { item } = entry;
  const inner = (
    <>
      <span
        className={cn(
          "news-ticker__cat",
          CAT_TICKER_STYLE[item.category] ?? NEWS_CATEGORY_STYLE[item.category],
        )}
      >
        {NEWS_CATEGORY_LABELS[item.category]}
      </span>
      <span className="news-ticker__text" dir="auto">
        {item.text}
      </span>
      {item.link && (
        <ExternalLink
          className="news-ticker__icon"
          aria-hidden
        />
      )}
    </>
  );

  if (item.link) {
    return (
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className="news-ticker__item news-ticker__link"
      >
        {inner}
      </a>
    );
  }

  return <div className="news-ticker__item">{inner}</div>;
}

function TickerRow({
  entries,
  measureRef,
  ariaHidden,
}: {
  entries: TickerEntry[];
  measureRef?: React.RefObject<HTMLDivElement | null>;
  ariaHidden?: boolean;
}) {
  return (
    <div ref={measureRef} className="news-ticker__row" aria-hidden={ariaHidden}>
      {entries.map((entry) => (
        <TickerItem key={entry.key} entry={entry} />
      ))}
    </div>
  );
}

function buildEntries(items: NewsItem[], tiles: number): TickerEntry[] {
  const entries: TickerEntry[] = [];
  for (let t = 0; t < tiles; t += 1) {
    for (const item of items) {
      entries.push({ item, key: `${item.id}-t${t}` });
    }
  }
  return entries;
}

export function NewsTicker() {
  const { news } = useData();
  const { user } = useAuth();
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [tiles, setTiles] = useState(MIN_TILES);

  const active = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return news
      .filter((n: NewsItem) => {
        const inRange = n.startDate <= today && n.endDate >= today;
        const targeted =
          n.target.type === "all" ||
          (n.target.type === "branch" && n.target.branchId === user?.branchId);
        return inRange && targeted;
      })
      .sort((a, b) => b.startDate.localeCompare(a.startDate) || a.id.localeCompare(b.id));
  }, [news, user?.branchId]);

  const entries = useMemo(
    () => buildEntries(active, tiles),
    [active, tiles],
  );

  const activeKey = useMemo(
    () => active.map((n) => n.id).join("|"),
    [active],
  );

  useLayoutEffect(() => {
    setTiles(MIN_TILES);
  }, [activeKey]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const row = rowRef.current;
    if (!viewport || !track || !row || entries.length === 0) return;

    const applyMotion = () => {
      const viewportWidth = viewport.getBoundingClientRect().width;
      const rowWidth = row.getBoundingClientRect().width;
      if (rowWidth <= 0 || viewportWidth <= 0) return;

      const baseWidth = rowWidth / tiles;
      const neededTiles = Math.max(
        MIN_TILES,
        Math.ceil((viewportWidth * 1.6) / baseWidth),
      );

      if (neededTiles > tiles) {
        setTiles(neededTiles);
        return;
      }

      const duration = Math.max(18, rowWidth / SCROLL_SPEED_PX);
      const shift = `${rowWidth}px`;
      const dur = `${duration}s`;
      if (track.dataset.shift !== shift) {
        track.dataset.shift = shift;
        track.style.setProperty("--ticker-shift", shift);
      }
      if (track.dataset.duration !== dur) {
        track.dataset.duration = dur;
        track.style.setProperty("--ticker-duration", dur);
      }
    };

    applyMotion();

    const ro = new ResizeObserver(applyMotion);
    ro.observe(viewport);
    ro.observe(row);
    return () => ro.disconnect();
  }, [entries, tiles, activeKey]);

  if (active.length === 0) return null;

  return (
    <div className="news-ticker" role="region" aria-label="شريط أخبار الشركة">
      <div className="news-ticker__lead" aria-hidden />

      <div ref={viewportRef} className="news-ticker__viewport">
        <div
          ref={trackRef}
          className="news-ticker__track"
          key={activeKey}
        >
          <TickerRow entries={entries} measureRef={rowRef} />
          <TickerRow entries={entries} ariaHidden />
        </div>
      </div>

      <div className="news-ticker__badge">
        <span className="news-ticker__live" aria-hidden />
        <div className="leading-tight text-white" dir="rtl">
          <p className="text-[13px] font-extrabold tracking-wide">آخر الأخبار</p>
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/75">
            مباشر
          </p>
        </div>
      </div>
    </div>
  );
}
