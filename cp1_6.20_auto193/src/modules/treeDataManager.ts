import axios from "axios";
import type { SpeciesSummary, SpeciesDetail } from "../types";

const API_BASE = "/api";

export async function fetchAllSpecies(): Promise<SpeciesSummary[]> {
  const res = await axios.get<SpeciesSummary[]>(`${API_BASE}/species`);
  return res.data;
}

export async function fetchSpeciesDetail(
  speciesId: string
): Promise<SpeciesDetail> {
  const res = await axios.get<SpeciesDetail>(`${API_BASE}/species/${speciesId}`);
  return res.data;
}
