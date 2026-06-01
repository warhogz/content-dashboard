"use client";

export type ImageQueuePriority = "high" | "auto" | "low";
type ImageStatus = "idle" | "queued" | "loading" | "loaded" | "error";
type ImageListener = () => void;

const loadedUrls = new Set<string>();
const queuedUrls = new Set<string>();
const loadingUrls = new Set<string>();
const failedUrls = new Set<string>();
const highPriorityQueue: string[] = [];
const normalPriorityQueue: string[] = [];
const lowPriorityQueue: string[] = [];
const listeners = new Map<string, Set<ImageListener>>();

let activeLoads = 0;
let maxConcurrentLoads = 6;
let pumpScheduled = false;

function notify(url: string) {
  const callbacks = listeners.get(url);
  callbacks?.forEach((callback) => callback());
}

function getQueue(priority: ImageQueuePriority) {
  if (priority === "high") return highPriorityQueue;
  if (priority === "low") return lowPriorityQueue;
  return normalPriorityQueue;
}

function takeNextUrl() {
  return highPriorityQueue.shift() ?? normalPriorityQueue.shift() ?? lowPriorityQueue.shift();
}

function schedulePump() {
  if (pumpScheduled || typeof window === "undefined") return;
  pumpScheduled = true;
  window.setTimeout(() => {
    pumpScheduled = false;
    pumpQueue();
  }, 0);
}

function finishUrl(url: string, status: "loaded" | "error") {
  loadingUrls.delete(url);
  queuedUrls.delete(url);

  if (status === "loaded") {
    loadedUrls.add(url);
    failedUrls.delete(url);
  } else {
    failedUrls.add(url);
  }

  notify(url);
}

function loadImage(url: string) {
  const image = new window.Image();
  image.decoding = "async";
  image.loading = "eager";

  return new Promise<void>((resolve) => {
    image.onload = () => {
      finishUrl(url, "loaded");
      resolve();
    };

    image.onerror = () => {
      finishUrl(url, "error");
      resolve();
    };

    image.src = url;

    if (image.complete) {
      finishUrl(url, "loaded");
      resolve();
    }
  });
}

function pumpQueue() {
  if (typeof window === "undefined") return;

  while (activeLoads < maxConcurrentLoads) {
    const nextUrl = takeNextUrl();
    if (!nextUrl) return;

    queuedUrls.delete(nextUrl);

    if (!nextUrl || loadedUrls.has(nextUrl) || loadingUrls.has(nextUrl)) {
      continue;
    }

    activeLoads += 1;
    loadingUrls.add(nextUrl);

    void loadImage(nextUrl).finally(() => {
      activeLoads = Math.max(0, activeLoads - 1);
      schedulePump();
    });
  }
}

export function getImageStatus(url?: string | null): ImageStatus {
  if (!url) return "idle";
  if (loadedUrls.has(url)) return "loaded";
  if (loadingUrls.has(url)) return "loading";
  if (queuedUrls.has(url)) return "queued";
  if (failedUrls.has(url)) return "error";
  return "idle";
}

export function isImageLoaded(url?: string | null) {
  return Boolean(url && loadedUrls.has(url));
}

export function markImageLoaded(url?: string | null) {
  if (!url) return;
  finishUrl(url, "loaded");
}

export function enqueueImage(
  url?: string | null,
  options?: { priority?: ImageQueuePriority; concurrency?: number }
) {
  if (!url || typeof window === "undefined" || loadedUrls.has(url) || loadingUrls.has(url) || queuedUrls.has(url)) {
    return;
  }

  if (options?.concurrency) {
    maxConcurrentLoads = Math.max(maxConcurrentLoads, options.concurrency);
  }

  const queue = getQueue(options?.priority ?? "auto");
  queuedUrls.add(url);
  queue.push(url);
  schedulePump();
}

export function enqueueImages(
  urls: string[],
  options?: { priority?: ImageQueuePriority; concurrency?: number }
) {
  urls.forEach((url) => enqueueImage(url, options));
}

export function subscribeToImage(url: string, listener: ImageListener) {
  const callbacks = listeners.get(url) ?? new Set<ImageListener>();
  callbacks.add(listener);
  listeners.set(url, callbacks);

  return () => {
    const current = listeners.get(url);
    if (!current) return;

    current.delete(listener);
    if (!current.size) {
      listeners.delete(url);
    }
  };
}
