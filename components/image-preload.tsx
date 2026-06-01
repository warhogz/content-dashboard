"use client";

import { useEffect } from "react";

function preloadImage(src: string) {
  return new Promise<void>((resolve) => {
    const image = new window.Image();
    image.decoding = "async";
    image.loading = "eager";
    image.src = src;
    image.onload = () => resolve();
    image.onerror = () => resolve();
  });
}

export function ImagePreload({ urls, concurrency = 3 }: { urls: string[]; concurrency?: number }) {
  useEffect(() => {
    const queue = urls.filter(Boolean);
    if (!queue.length) return;

    let cancelled = false;
    let nextIndex = 0;

    async function worker() {
      while (!cancelled) {
        const currentIndex = nextIndex;
        nextIndex += 1;

        if (currentIndex >= queue.length) return;
        await preloadImage(queue[currentIndex]);
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () => worker());
    void Promise.all(workers);

    return () => {
      cancelled = true;
    };
  }, [urls, concurrency]);

  return null;
}
