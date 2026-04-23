// ── Raw layer types ────────────────────────────────────────────────────────

export interface MetadataEntry {
  name?: string;
  value?: string;
  divider?: boolean;
}

export interface Technique {
  techniqueID: string;
  score: number;
  color?: string;
  metadata?: MetadataEntry[];
  showSubtechniques?: boolean;
}

export interface AttackLayer {
  name: string;
  domain: string;
  description?: string;
  techniques: Technique[];
}

// ── Output types ───────────────────────────────────────────────────────────

export interface PieSlice {
  label: string;
  value: number;
  percentage: number; // 0–100
  color: string;
}

export interface PieChartData {
  title: string;
  description: string;
  total: number;
  slices: PieSlice[];
}

export interface Summary {
  totalTechniquesMapped: number;
  withDetectionRules: number;
  withoutDetectionRules: number;
  detectionCoveragePercent: number; // 0–100
  uniqueThreatGroups: number;
  highScoreTechniques: number; // detection score >= 4
  criticalTechniques: number;  // detection score == 5
}

export interface LayerStatistics {
  sourceName: string;
  summary: Summary;
  detectionScoreDistribution: PieChartData;
  detectionPlatformBreakdown: PieChartData;
  attributionBreakdown: PieChartData;
  techniqueCoverageOverview: PieChartData;
  topThreatGroupShare: PieChartData;
}

// ── Internal helpers ───────────────────────────────────────────────────────

function getMeta(technique: Technique, key: string): string | null {
  return (
    technique.metadata?.find(
      (m) => !m.divider && m.name?.toLowerCase() === key.toLowerCase()
    )?.value ?? null
  );
}

function toSlices(
  buckets: Map<string, number>,
  colors: string[]
): PieSlice[] {
  const total = [...buckets.values()].reduce((a, b) => a + b, 0);
  return [...buckets.entries()].map(([label, value], i) => ({
    label,
    value,
    percentage: total === 0 ? 0 : Math.round((value / total) * 10000) / 100,
    color: colors[i % colors.length],
  }));
}

// ── Exported statistics functions ──────────────────────────────────────────

export function computeSummary(techniques: Technique[]): Summary {
  const scored = techniques.filter((t) => t.score > 0);

  let withDetection = 0;
  let highScore = 0;
  let critical = 0;
  const groups = new Set<string>();

  for (const t of scored) {
    const score = getMeta(t, "detection score");
    if (score !== null) {
      withDetection++;
      const n = parseInt(score, 10);
      if (n >= 4) highScore++;
      if (n === 5) critical++;
    }

    const raw = getMeta(t, "group / campaign") ?? "";
    raw
      .split(",")
      .map((g) => g.trim())
      .filter((g) => g && g !== "Detection")
      .forEach((g) => groups.add(g));
  }

  const total = scored.length;

  return {
    totalTechniquesMapped: total,
    withDetectionRules: withDetection,
    withoutDetectionRules: total - withDetection,
    detectionCoveragePercent:
      total === 0 ? 0 : Math.round((withDetection / total) * 10000) / 100,
    uniqueThreatGroups: groups.size,
    highScoreTechniques: highScore,
    criticalTechniques: critical,
  };
}

export function detectionScoreDistribution(
  techniques: Technique[]
): PieChartData {
  const scored = techniques.filter((t) => t.score > 0);

  const buckets = new Map<string, number>([
    ["No coverage (0)", 0],
    ["Basic (1)", 0],
    ["Fair (2)", 0],
    ["Good (3)", 0],
    ["Very good (4)", 0],
    ["Excellent (5)", 0],
  ]);

  const labels: Record<number, string> = {
    0: "No coverage (0)",
    1: "Basic (1)",
    2: "Fair (2)",
    3: "Good (3)",
    4: "Very good (4)",
    5: "Excellent (5)",
  };

  for (const t of scored) {
    const raw = getMeta(t, "detection score");
    const key =
      raw !== null
        ? (labels[parseInt(raw, 10)] ?? `Score ${raw}`)
        : "No coverage (0)";
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return {
    title: "Detection score distribution",
    description: "Rule quality per technique (0 = none, 5 = excellent)",
    total: scored.length,
    slices: toSlices(buckets, [
      "#9E9E9E",
      "#FFE07A",
      "#FFCA28",
      "#FFAE00",
      "#FF8F00",
      "#FF6F00",
    ]),
  };
}

export function detectionPlatformBreakdown(
  techniques: Technique[]
): PieChartData {
  const scored = techniques.filter((t) => t.score > 0);

  const buckets = new Map<string, number>([
    ["XDR only", 0],
    ["Splunk only", 0],
    ["XDR + Splunk", 0],
    ["No platform", 0],
  ]);

  for (const t of scored) {
    const loc = getMeta(t, "detection location") ?? "";
    const xdr = loc.includes("XDR");
    const splunk = loc.includes("Splunk");
    if (xdr && splunk)   buckets.set("XDR + Splunk", buckets.get("XDR + Splunk")! + 1);
    else if (xdr)        buckets.set("XDR only",     buckets.get("XDR only")!     + 1);
    else if (splunk)     buckets.set("Splunk only",  buckets.get("Splunk only")!  + 1);
    else                 buckets.set("No platform",  buckets.get("No platform")!  + 1);
  }

  return {
    title: "Detection platform breakdown",
    description: "Where detection rules fire across your stack",
    total: scored.length,
    slices: toSlices(buckets, ["#1D9E75", "#185FA5", "#534AB7", "#9E9E9E"]),
  };
}

export function attributionBreakdown(techniques: Technique[]): PieChartData {
  const scored = techniques.filter((t) => t.score > 0);

  const buckets = new Map<string, number>([
    ["Threat group attributed", 0],
    ["Detection-overlay only", 0],
    ["No attribution", 0],
  ]);

  for (const t of scored) {
    const grp = getMeta(t, "group / campaign") ?? "";
    const overlay = getMeta(t, "overlay");
    const hasRealGroup = grp
      .split(",")
      .map((g) => g.trim())
      .some((g) => g && g !== "Detection");

    if (hasRealGroup) {
      buckets.set("Threat group attributed", buckets.get("Threat group attributed")! + 1);
    } else if (overlay === "detection") {
      buckets.set("Detection-overlay only", buckets.get("Detection-overlay only")! + 1);
    } else {
      buckets.set("No attribution", buckets.get("No attribution")! + 1);
    }
  }

  return {
    title: "Threat attribution breakdown",
    description: "Techniques tied to known groups vs. detection-overlay only",
    total: scored.length,
    slices: toSlices(buckets, ["#D85A30", "#3266AD", "#9E9E9E"]),
  };
}

export function techniqueCoverageOverview(
  techniques: Technique[]
): PieChartData {
  const scored = techniques.filter((t) => t.score > 0);
  const detected = scored.filter(
    (t) => getMeta(t, "detection score") !== null
  ).length;

  const buckets = new Map<string, number>([
    ["Detected", detected],
    ["No detection rule", scored.length - detected],
  ]);

  return {
    title: "Technique coverage overview",
    description: "Detected vs. undetected techniques across all mappings",
    total: scored.length,
    slices: toSlices(buckets, ["#1D9E75", "#E24B4A"]),
  };
}

export function topThreatGroupShare(
  techniques: Technique[],
  topN = 10
): PieChartData {
  const scored = techniques.filter((t) => t.score > 0);
  const counts = new Map<string, number>();

  for (const t of scored) {
    const raw = getMeta(t, "group / campaign") ?? "";
    raw
      .split(",")
      .map((g) => g.trim())
      .filter((g) => g && g !== "Detection")
      .forEach((g) => counts.set(g, (counts.get(g) ?? 0) + 1));
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, topN);
  const others = sorted.slice(topN).reduce((acc, [, v]) => acc + v, 0);
  if (others > 0) top.push(["Others", others]);

  const buckets = new Map<string, number>(top);
  const total = [...buckets.values()].reduce((a, b) => a + b, 0);

  return {
    title: `Technique share — top ${topN} threat groups`,
    description: "How many mapped techniques each group is associated with",
    total,
    slices: toSlices(buckets, [
      "#1D9E75","#D85A30","#534AB7","#185FA5","#BA7517",
      "#D4537E","#639922","#378ADD","#E24B4A","#888780","#4A4A4A",
    ]),
  };
}

// ── Main entry point ───────────────────────────────────────────────────────

export function computeLayerStatistics(layer: AttackLayer): LayerStatistics {
  const { techniques } = layer;
  return {
    sourceName:                 layer.name,
    summary:                    computeSummary(techniques),
    detectionScoreDistribution: detectionScoreDistribution(techniques),
    detectionPlatformBreakdown: detectionPlatformBreakdown(techniques),
    attributionBreakdown:       attributionBreakdown(techniques),
    techniqueCoverageOverview:  techniqueCoverageOverview(techniques),
    topThreatGroupShare:        topThreatGroupShare(techniques),
  };
}