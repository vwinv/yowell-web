import { existsSync } from "node:fs";
import { join } from "node:path";

import type { Client, Sale } from "@yowell/shared";
import { SALE_PERSONALIZATION_FEE, saleTotal } from "@yowell/shared";
import PDFDocument from "pdfkit";

const BRAND = "Yo'Well";
const BRAND_TAGLINE = "Jus de fruits naturels";
const FOOTER_THANKS = "Yo'Well vous remercie pour la confiance !";
const FOOTER_PAYMENT = "Wave ou OM au 78 681 53 34";

/** Montants lisibles en PDF (evite le separateur U+202F de fr-FR affiche comme "/") */
function formatCfaPdf(amount: number): string {
  const value = Math.round(amount);
  const digits = value
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${digits} FCFA`;
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

function formatInvoiceDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function paymentLabel(status: Sale["paymentStatus"]): string {
  return status === "paid" ? "Payé" : "Non payé";
}

export function buildSaleInvoicePdf(sale: Sale, client: Client): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const invoiceNo = sale.id.slice(0, 8).toUpperCase();
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const headerTop = 48;
    const logoSize = 56;
    const logoPath = resolveLogoPath();

    if (logoPath) {
      doc.image(logoPath, left, headerTop, {
        width: logoSize,
        height: logoSize,
      });
    }

    const textLeft = logoPath ? left + logoSize + 14 : left;

    doc
      .fontSize(22)
      .fillColor("#0d5c52")
      .text(BRAND, textLeft, headerTop + 4, { continued: false });
    doc
      .fontSize(10)
      .fillColor("#666666")
      .text(BRAND_TAGLINE, textLeft, headerTop + 32);

    doc
      .fontSize(20)
      .fillColor("#111111")
      .text(sale.kind === "quote" ? "DEVIS" : "FACTURE", left + pageWidth - 120, headerTop, {
        width: 120,
        align: "right",
      });
    doc
      .fontSize(10)
      .fillColor("#444444")
      .text(`N° ${invoiceNo}`, left + pageWidth - 120, headerTop + 28, {
        width: 120,
        align: "right",
      });
    doc.text(formatInvoiceDate(sale.orderedAt), left + pageWidth - 120, headerTop + 44, {
      width: 120,
      align: "right",
    });

    const clientY = headerTop + logoSize + 28;

    doc.fontSize(11).fillColor("#0d5c52").text("Client", left, clientY);
    doc
      .fontSize(12)
      .fillColor("#111111")
      .text(client.name, left, clientY + 18);

    let detailY = clientY + 38;
    doc.fontSize(10).fillColor("#444444");

    if (client.phone) {
      doc.text(`Téléphone : ${client.phone}`, left, detailY);
      detailY += 16;
    }
    if (client.email) {
      doc.text(`E-mail : ${client.email}`, left, detailY);
      detailY += 16;
    }
    if (client.address) {
      doc.text(`Adresse : ${client.address}`, left, detailY, {
        width: pageWidth * 0.55,
      });
      detailY += doc.heightOfString(`Adresse : ${client.address}`, {
        width: pageWidth * 0.55,
      });
    }

    doc
      .fontSize(10)
      .fillColor("#444444")
      .text(
        sale.kind === "quote"
          ? "Document non engageant — valable 30 jours"
          : `Statut paiement : ${paymentLabel(sale.paymentStatus)}`,
        left + pageWidth - 200,
        clientY + 18,
        { width: 200, align: "right" },
      );

    doc.y = Math.max(detailY, clientY + 80) + 20;

    const colWidths = {
      product: pageWidth * 0.36,
      volume: pageWidth * 0.12,
      qty: pageWidth * 0.1,
      unit: pageWidth * 0.21,
      total: pageWidth * 0.21,
    };
    const tableTop = doc.y;
    const rowHeight = 22;
    const headerBg = "#e5f0ee";

    const drawRow = (
      y: number,
      cells: string[],
      opts: { header?: boolean; bold?: boolean } = {},
    ) => {
      let x = left;
      const widths = [
        colWidths.product,
        colWidths.volume,
        colWidths.qty,
        colWidths.unit,
        colWidths.total,
      ];

      if (opts.header) {
        doc.rect(left, y, pageWidth, rowHeight).fill(headerBg);
        doc.fillColor("#0d5c52");
      } else {
        doc.fillColor("#111111");
      }

      doc.fontSize(opts.header ? 10 : 9);
      if (opts.bold || opts.header) {
        doc.font("Helvetica-Bold");
      } else {
        doc.font("Helvetica");
      }

      cells.forEach((cell, i) => {
        doc.text(cell, x + 6, y + 6, {
          width: widths[i]! - 12,
          align: i >= 2 ? "right" : "left",
          lineBreak: false,
        });
        x += widths[i]!;
      });

      if (!opts.header) {
        doc
          .strokeColor("#dddddd")
          .moveTo(left, y + rowHeight)
          .lineTo(left + pageWidth, y + rowHeight)
          .stroke();
      }
    };

    drawRow(tableTop, ["Produit", "Format", "Qté", "Prix unit.", "Total"], {
      header: true,
    });

    let y = tableTop + rowHeight;
    for (const item of sale.items) {
      if (y > doc.page.height - 140) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      drawRow(y, [
        item.productName,
        item.volume,
        String(item.quantity),
        formatCfaPdf(item.unitPrice),
        formatCfaPdf(item.lineTotal),
      ]);
      y += rowHeight;
    }

    y += 12;
    const subtotal = saleTotal(sale.items);
    const personalizationFee = sale.personalization
      ? SALE_PERSONALIZATION_FEE * sale.items.reduce((sum, item) => sum + item.quantity, 0)
      : 0;

    const drawTotalLine = (label: string, amount: number, bold = false) => {
      doc
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(bold ? 12 : 10)
        .fillColor(bold ? "#0d5c52" : "#444444")
        .text(label, left + pageWidth - colWidths.total - colWidths.unit, y, {
          width: colWidths.unit - 10,
          align: "right",
        });
      doc.text(formatCfaPdf(amount), left + pageWidth - colWidths.total, y, {
        width: colWidths.total - 6,
        align: "right",
      });
      y += 18;
    };

    drawTotalLine("Sous-total", subtotal);
    if (sale.personalization) {
      drawTotalLine("Personnalisation", personalizationFee);
    }
    if (sale.discountAmount > 0) {
      drawTotalLine("Remise", -sale.discountAmount);
    }
    drawTotalLine("Total", sale.totalAmount, true);

    if (sale.notes.trim()) {
      y += 36;
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#444444")
        .text("Notes", left, y);
      doc
        .font("Helvetica")
        .fontSize(10)
        .text(sale.notes.trim(), left, y + 16, { width: pageWidth });
    }

    const footerY = doc.page.height - 88;
    doc
      .strokeColor("#e5f0ee")
      .moveTo(left, footerY - 12)
      .lineTo(left + pageWidth, footerY - 12)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#0d5c52")
      .text(FOOTER_THANKS, left, footerY, { width: pageWidth, align: "center" });

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#444444")
      .text(FOOTER_PAYMENT, left, footerY + 20, {
        width: pageWidth,
        align: "center",
      });

    doc.end();
  });
}
