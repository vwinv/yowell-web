import { existsSync } from "node:fs";
import { join } from "node:path";

import type { StatsOverview } from "@yowell/shared";
import PDFDocument from "pdfkit";

const BRAND = "Yo'Well";
const BRAND_TAGLINE = "Jus de fruits naturels";

function formatCfaPdf(amount: number): string {
  const value = Math.round(amount);
  const digits = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const prefix = amount < 0 ? "−" : "";
  return `${prefix}${digits} FCFA`;
}

function resolveLogoPath(): string | null {
  const candidates = [
    join(process.cwd(), "assets", "logo.png"),
    join(process.cwd(), "..", "web", "assets", "logo.png"),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  return null;
}

export function buildStatsReportPdf(overview: StatsOverview): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const logoPath = resolveLogoPath();
    const headerTop = 48;
    const logoSize = 50;

    if (logoPath) {
      doc.image(logoPath, left, headerTop, { width: logoSize, height: logoSize });
    }

    const textLeft = logoPath ? left + logoSize + 12 : left;

    doc.fontSize(20).fillColor("#0d5c52").text(BRAND, textLeft, headerTop);
    doc
      .fontSize(10)
      .fillColor("#666666")
      .text(BRAND_TAGLINE, textLeft, headerTop + 26);

    doc
      .fontSize(18)
      .fillColor("#111111")
      .text("Rapport statistiques", left + pageWidth - 180, headerTop, {
        width: 180,
        align: "right",
      });
    doc
      .fontSize(10)
      .fillColor("#444444")
      .text(overview.period.label, left + pageWidth - 180, headerTop + 26, {
        width: 180,
        align: "right",
      });
    doc.text(
      `${overview.period.from} → ${overview.period.to}`,
      left + pageWidth - 180,
      headerTop + 42,
      { width: 180, align: "right" },
    );

    let y = headerTop + logoSize + 36;

    const summaryRows = [
      ["Revenus encaissés", formatCfaPdf(overview.revenue)],
      ["Dépenses", formatCfaPdf(overview.expenses)],
      ["Bénéfice", formatCfaPdf(overview.profit)],
      ["Commandes", String(overview.ordersCount)],
    ];

    doc.fontSize(12).fillColor("#0d5c52").text("Synthèse", left, y);
    y += 22;

    for (const [label, value] of summaryRows) {
      doc.fontSize(10).fillColor("#444444").text(label, left, y, { width: 200 });
      doc
        .font("Helvetica-Bold")
        .fillColor("#111111")
        .text(value, left + pageWidth - 150, y, { width: 150, align: "right" });
      doc.font("Helvetica");
      y += 18;
    }

    y += 16;
    doc.fontSize(12).fillColor("#0d5c52").text("Top produits", left, y);
    y += 20;

    if (overview.topProducts.length) {
      for (const product of overview.topProducts) {
        doc
          .fontSize(9)
          .fillColor("#111111")
          .text(
            `${product.productName} — ${product.quantity} vendu(s) — ${formatCfaPdf(product.revenue)}`,
            left,
            y,
            { width: pageWidth },
          );
        y += 16;
      }
    } else {
      doc.fontSize(9).fillColor("#888888").text("Aucune vente payée sur la période.", left, y);
      y += 16;
    }

    y += 12;
    doc.fontSize(12).fillColor("#0d5c52").text("Détail par jour", left, y);
    y += 18;

    doc.font("Helvetica-Bold").fontSize(8).fillColor("#0d5c52");
    doc.text("Date", left, y, { width: 90 });
    doc.text("Revenus", left + 95, y, { width: 80, align: "right" });
    doc.text("Dépenses", left + 180, y, { width: 80, align: "right" });
    doc.text("Bénéfice", left + 265, y, { width: 80, align: "right" });
    y += 14;
    doc.font("Helvetica").fillColor("#111111");

    for (const day of overview.recentDays) {
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      doc.fontSize(8).text(day.label, left, y, { width: 90 });
      doc.text(formatCfaPdf(day.revenue), left + 95, y, { width: 80, align: "right" });
      doc.text(formatCfaPdf(day.expenses), left + 180, y, { width: 80, align: "right" });
      doc.text(formatCfaPdf(day.profit), left + 265, y, { width: 80, align: "right" });
      y += 13;
    }

    doc.end();
  });
}
