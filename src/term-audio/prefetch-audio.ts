/** Bunpro’s prefetched answer-bar clip for the current review, if any. */
export function prefetchAudioHref(): string | null {
  return (
    document.querySelector<HTMLLinkElement>('link#prefetch-audio')?.href ??
    document.querySelector<HTMLLinkElement>('link[rel="prefetch"][as="audio"]')?.href ??
    null
  );
}
