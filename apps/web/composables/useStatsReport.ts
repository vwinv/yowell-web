import type { StatsPeriodPreset } from "@yowell/shared";

export function useStatsReport() {
  const exporting = ref(false);

  async function downloadReport(params: {
    preset: StatsPeriodPreset;
    from?: string;
    to?: string;
  }) {
    exporting.value = true;
    try {
      const search = new URLSearchParams();
      search.set("preset", params.preset);
      if (params.preset === "custom" && params.from && params.to) {
        search.set("from", params.from);
        search.set("to", params.to);
      }

      const blob = await apiFetch<Blob>(
        `${useApiUrl("/stats/report.pdf")}?${search.toString()}`,
        { responseType: "blob" },
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `statistiques-${params.preset}-${params.from ?? ""}-${params.to ?? ""}.pdf`.replace(
        /--+/g,
        "-",
      );
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Impossible de générer le rapport PDF.");
    } finally {
      exporting.value = false;
    }
  }

  return { exporting, downloadReport };
}
