import type { Sale } from "@yowell/shared";

export function useSaleInvoice() {
  const generatingId = ref<string | null>(null);

  async function downloadInvoice(sale: Sale) {
    generatingId.value = sale.id;
    try {
      const blob = await apiFetch<Blob>(useApiUrl(`/sales/${sale.id}/invoice`), {
        responseType: "blob",
      });
      const date = new Date(sale.orderedAt).toISOString().slice(0, 10);
      const slug = sale.clientName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();
      const prefix = sale.kind === "quote" ? "devis" : "facture";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${prefix}-${slug || "client"}-${date}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      alert(
        sale.kind === "quote"
          ? "Impossible de générer le devis PDF."
          : "Impossible de générer la facture PDF.",
      );
    } finally {
      generatingId.value = null;
    }
  }

  return { generatingId, downloadInvoice };
}
