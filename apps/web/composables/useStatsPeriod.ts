import type { StatsPeriodPreset } from "@yowell/shared";

export function useStatsPeriod() {
  const preset = ref<StatsPeriodPreset>("month");
  const customFrom = ref("");
  const customTo = ref("");

  const query = computed(() => {
    if (preset.value === "custom") {
      return {
        preset: "custom" as const,
        from: customFrom.value,
        to: customTo.value,
      };
    }
    return { preset: preset.value };
  });

  const presets: { id: StatsPeriodPreset; label: string }[] = [
    { id: "today", label: "Aujourd'hui" },
    { id: "week", label: "7 jours" },
    { id: "month", label: "Ce mois" },
    { id: "year", label: "Cette année" },
    { id: "custom", label: "Personnalisé" },
  ];

  function initCustomDates() {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    customFrom.value = start.toISOString().slice(0, 10);
    customTo.value = to;
  }

  watch(
    preset,
    (value) => {
      if (value === "custom" && (!customFrom.value || !customTo.value)) {
        initCustomDates();
      }
    },
    { immediate: true },
  );

  return {
    preset,
    customFrom,
    customTo,
    query,
    presets,
    initCustomDates,
  };
}
