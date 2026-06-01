"use client";

import { useEffect } from "react";
import { enqueueImages } from "@/lib/image-cache";

export function ImagePreload({
  urls,
  concurrency = 6,
  priorityCount = 8
}: {
  urls: string[];
  concurrency?: number;
  priorityCount?: number;
}) {
  useEffect(() => {
    const queue = urls.filter(Boolean);
    if (!queue.length) return;

    const head = queue.slice(0, priorityCount);
    const tail = queue.slice(priorityCount);

    enqueueImages(head, { priority: "high", concurrency });
    enqueueImages(tail, { priority: "auto", concurrency });
  }, [urls, concurrency, priorityCount]);

  return null;
}
