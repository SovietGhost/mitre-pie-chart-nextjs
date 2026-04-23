import {
  useQuery,
  useQueries,
  queryOptions,
  QueryClient,
} from "@tanstack/react-query";

import {
  computeLayerStatistics,
  type AttackLayer,
  type LayerStatistics,
  type PieChartData,
  type Summary,
} from "./helper";

// ── Query keys ─────────────────────────────────────────────────────────────
//
// Structured as a factory so any component can invalidate/refetch precisely.
//
//   queryClient.invalidateQueries({ queryKey: attackKeys.layer(url) })
//   queryClient.invalidateQueries({ queryKey: attackKeys.all })

export const attackKeys = {
  all:     ["attack"] as const,
  layers:  () => [...attackKeys.all, "layer"] as const,
  layer:   (url: string) => [...attackKeys.layers(), url] as const,
  stats:   (url: string) => [...attackKeys.layer(url), "stats"] as const,
  chart:   (url: string, chart: string) =>
             [...attackKeys.stats(url), chart] as const,
} as const;

// ── Fetcher ────────────────────────────────────────────────────────────────

async function fetchLayer(url: string): Promise<AttackLayer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch layer: ${res.status} ${res.statusText}`);
  return res.json() as Promise<AttackLayer>;
}

// ── queryOptions factories ─────────────────────────────────────────────────
//
// Use these directly with useQuery, or pass to prefetchQuery / ensureQueryData
// on the server / in loaders.

export const layerQueryOptions = (url: string) =>
  queryOptions({
    queryKey: attackKeys.layer(url),
    queryFn:  () => fetchLayer(url),
    staleTime: 5 * 60 * 1000,   // layer files rarely change mid-session
    gcTime:    30 * 60 * 1000,
  });

export const statsQueryOptions = (url: string) =>
  queryOptions({
    queryKey: attackKeys.stats(url),
    queryFn:  async () => {
      const layer = await fetchLayer(url);
      return computeLayerStatistics(layer);
    },
    staleTime: 5 * 60 * 1000,
    gcTime:    30 * 60 * 1000,
  });

// ── Hooks — full statistics ────────────────────────────────────────────────

/** Full statistics object — use when you need everything at once. */
export function useLayerStatistics(url: string) {
  return useQuery(statsQueryOptions(url));
}

// Convenience accessor — same query, typed return
export function useLayerStatisticsData(url: string): LayerStatistics | undefined {
  return useLayerStatistics(url).data;
}

// ── Hooks — individual charts ──────────────────────────────────────────────
//
// Each hook selects only the slice it needs from the cached statistics object.
// No extra network request is made — TanStack Query deduplicates automatically.

function useChart<T>(
  url: string,
  chart: string,
  select: (s: LayerStatistics) => T
) {
  return useQuery({
    ...statsQueryOptions(url),
    queryKey: attackKeys.chart(url, chart) as any,
    select,
  });
}

export function useSummary(url: string) {
  return useChart<Summary>(url, "summary", (s) => s.summary);
}

export function useDetectionScoreChart(url: string) {
  return useChart<PieChartData>(
    url, "detectionScore", (s) => s.detectionScoreDistribution
  );
}

export function useDetectionPlatformChart(url: string) {
  return useChart<PieChartData>(
    url, "platform", (s) => s.detectionPlatformBreakdown
  );
}

export function useAttributionChart(url: string) {
  return useChart<PieChartData>(
    url, "attribution", (s) => s.attributionBreakdown
  );
}

export function useCoverageChart(url: string) {
  return useChart<PieChartData>(
    url, "coverage", (s) => s.techniqueCoverageOverview
  );
}

export function useTopGroupsChart(url: string, topN = 10) {
  return useChart<PieChartData>(
    url, `topGroups-${topN}`, (s) => s.topThreatGroupShare
  );
}

// ── Hook — compare multiple layers side by side ────────────────────────────

export interface LayerComparison {
  url: string;
  name: string;
  stats: LayerStatistics;
}

/**
 * Fetch and compute statistics for multiple layer URLs in parallel.
 * Useful for comparing environments, time periods, or threat profiles.
 *
 * @example
 * const results = useLayerComparison(["/layers/2024.json", "/layers/2025.json"]);
 * const loaded  = results.filter(r => r.status === "success");
 */
export function useLayerComparison(urls: string[]) {
  return useQueries({
    queries: urls.map((url) => ({
      ...statsQueryOptions(url),
      select: (stats: LayerStatistics): LayerComparison => ({
        url,
        name: stats.sourceName,
        stats,
      }),
    })),
  });
}

// ── Server-side / loader prefetch helpers ─────────────────────────────────

/**
 * Call in a React Router / Next.js loader before rendering.
 * The data will be in cache when the component mounts → no loading state.
 *
 * @example
 * // Next.js page
 * export async function getServerSideProps() {
 *   const client = makeQueryClient();
 *   await prefetchLayerStatistics(client, "/api/layer.json");
 *   return { props: { dehydratedState: dehydrate(client) } };
 * }
 */
export async function prefetchLayerStatistics(
  client: QueryClient,
  url: string
): Promise<void> {
  await client.prefetchQuery(statsQueryOptions(url));
}

/**
 * Returns the cached statistics synchronously (useful in loaders that need
 * data before deciding which components to render).
 */
export function getLayerStatistics(
  client: QueryClient,
  url: string
): LayerStatistics | undefined {
  return client.getQueryData<LayerStatistics>(attackKeys.stats(url));
}

// ── Singleton QueryClient ──────────────────────────────────────────────────
//
// Import `queryClient` in your app root and pass to <QueryClientProvider>.
// Do NOT create a new instance per render.

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});