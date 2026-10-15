import type { Quote, QuoteVersion, Company, Contact } from "../data/types";
import { calculateQuoteTotals } from "./calculations";
import { formatCurrency, formatDate } from "./formatters";
export async function generateQuotePdf(
  quote: Quote,
  version: QuoteVersion,
  company?: Company,
  contact?: Contact,
) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const width = 595;
  let y = 100;
  pdf.setFont("helvetica");
  try {
    const blob = await (await fetch("/logo-megawhip.png")).blob();
    const data = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.readAsDataURL(blob);
    });
    pdf.addImage(data, "PNG", 40, 25, 145, 73);
  } catch {
    pdf.setFontSize(22);
    pdf.text("MegaWhip", 40, 60);
  }
  const footer = () => {
    pdf.setFontSize(9);
    pdf.setTextColor(90);
    pdf.text(
      "DEMONSTRAÇÃO · dados fictícios · sem validade comercial",
      40,
      805,
    );
    pdf.text(`Página ${pdf.getNumberOfPages()}`, 490, 805);
  };
  const line = (text: string, size = 11, bold = false) => {
    pdf.setFontSize(size);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    const parts = pdf.splitTextToSize(text, 515);
    for (const part of parts) {
      if (y > 760) {
        footer();
        pdf.addPage();
        y = 45;
      }
      pdf.text(part, 40, y);
      y += size + 5;
    }
    y += 5;
  };
  line(`Cotação ${quote.number} · revisão ${version.revision}`, 16, true);
  line(
    `Estado: ${version.status} | Validade: ${formatDate(version.validUntil)}`,
  );
  line(company?.name || contact?.name || "Comprador");
  line(
    [contact?.name, contact?.email, contact?.whatsappMockId]
      .filter(Boolean)
      .join(" · "),
  );
  for (const item of version.lines) {
    line(`${item.skuSnapshot} — ${item.nameSnapshot}`, 12, true);
    line(
      `${item.quantity} ${"un"} × ${formatCurrency(item.unitPriceCents)} | desconto ${(item.discountBps / 100).toFixed(2)}%`,
    );
    if (item.technicalNote) line(item.technicalNote);
  }
  const totals = calculateQuoteTotals(version.lines, version.freightCents);
  line(`Subtotal: ${formatCurrency(totals.totalGrossCents)}`);
  line(`Desconto: ${formatCurrency(totals.totalDiscountCents)}`);
  line(
    `Frete: ${version.freightPending ? "A definir" : formatCurrency(version.freightCents)}`,
  );
  line(
    `Total: ${totals.hasPricePending || version.freightPending ? "Pendente de confirmação" : formatCurrency(totals.totalCents)}`,
    16,
    true,
  );
  line(`Pagamento: ${version.paymentTerms || "A confirmar"}`);
  line(`Entrega: ${version.deliveryTerms || "A confirmar"}`);
  line(
    "Este documento corresponde exclusivamente à revisão indicada. Uma nova revisão somente substitui a anterior após sua publicação.",
  );
  footer();
  pdf.save(`${quote.number}-r${version.revision}-DEMO.pdf`);
}
