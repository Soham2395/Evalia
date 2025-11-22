"use client";

import { useState, type ReactNode } from "react";

export default function SectionViewAll({
  total,
  threshold = 6,
  children,
}: {
  total: number;
  threshold?: number;
  children?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  if (total <= threshold) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end">
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
          {expanded ? "View less" : "View all"}
        </button>
      </div>

      {/* Animated reveal area */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
