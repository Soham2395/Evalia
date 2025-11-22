"use client";

import { useEffect, useState } from "react";

export default function RevealToggle({
  targetId,
  expandedLabel = "View less",
  collapsedLabel = "View all",
  initialExpanded = false,
}: {
  targetId: string;
  expandedLabel?: string;
  collapsedLabel?: string;
  initialExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(initialExpanded);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const collapsed = "grid-rows-[0fr]";
    const opened = "grid-rows-[1fr]";
    if (expanded) {
      el.classList.remove(collapsed);
      el.classList.add(opened);
    } else {
      el.classList.remove(opened);
      el.classList.add(collapsed);
    }
  }, [expanded, targetId]);

  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={() => setExpanded((v) => !v)}
      className={`px-3 py-1 rounded-full text-xs transition-colors duration-200 border ${
        expanded
          ? "bg-primary-100/15 text-primary-100 border-primary-100/30 hover:bg-primary-100/20"
          : "bg-dark-200 text-light-100/80 border-dark-100 hover:bg-dark-100"
      }`}
    >
      {expanded ? expandedLabel : collapsedLabel}
    </button>
  );
}
