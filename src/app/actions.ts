"use server";

import { computeLayerStatistics } from "@/lib/helper";

export async function getStats() {
    const apiURL = process.env.API_URL;
    const layer = await fetch("/api/layer.json").then(r => r.json());
    return computeLayerStatistics(layer);
}