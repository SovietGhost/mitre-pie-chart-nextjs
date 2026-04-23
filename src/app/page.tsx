"use client"

import { AttackPieChart } from "@/components/pie-chart";
import { Spinner } from "@/components/ui/spinner";
import { useDetectionScoreChart, useSummary, useTopGroupsChart } from "@/lib/api";

const LAYER_URL = "/api/layer";

export default function Home() {
  
  const { data: summary, isPending } = useSummary(LAYER_URL);
  const { data: scoreChart }         = useDetectionScoreChart(LAYER_URL);
  const { data: groupChart }         = useTopGroupsChart(LAYER_URL, 10);

  if (isPending) return <Spinner />;

  if (!scoreChart) {
    return "empty"
  } 

  return <AttackPieChart data={scoreChart} />;
}