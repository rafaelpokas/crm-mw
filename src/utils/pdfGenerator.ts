import { jsPDF } from 'jspdf';
import { Quote, QuoteVersion, Company, Contact } from '../data/types';
import { formatCurrency, formatBps, formatDate } from './formatters';

export function generateQuotePdf(
  quote: Quote,
  version: QuoteVersion,
  company?: Company,
  contact?: Contact
) {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 40;

  // Header background bar in graphite #223237
  doc.setFillColor(34, 50, 55);
  doc.rect(0, 0, pageWidth, 60, 'F');

  // Accent stripe in #B1D448
  doc.setFillColor(177, 212, 72);
  doc.rect(0, 60, pageWidth, 4, 'F');

  // Title in header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('MEGAWHIP', 40, 36);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(177, 212, 72);
  doc.text('CHICOTES ELÉTRICOS & SISTEMAS EMBARCADOS', 40, 48);

  // Quote identifier top right
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`COTAÇÃO: ${quote.number}`, pageWidth - 40, 32, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 210, 205);
  doc.text(`Revisão: ${version.revision} • Status: ${version.status.toUpperCase()}`, pageWidth - 40, 48, { align: 'right' });

  y = 85;

  // Watermark Demo Banner
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(239, 68, 68);
  doc.rect(40, y, pageWidth - 80, 24, 'FD');
  doc.setTextColor(185, 28, 28);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DOCUMENTO DEMONSTRATIVO — SEM VALIDADE FISCAL OU COMERCIAL REAL', pageWidth / 2, y + 16, { align: 'center' });

  y += 40;

  // Info Cards Section
  doc.setFillColor(245, 246, 240);
  doc.setDrawColor(218, 224, 215);
  doc.roundedRect(40, y, (pageWidth - 90) / 2, 70, 4, 4, 'FD');
  doc.roundedRect(40 + (pageWidth - 90) / 2 + 10, y, (pageWidth - 90) / 2, 70, 4, 4, 'FD');

  // Client Info (Left)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 50, 55);
  doc.text('DADOS DO CLIENTE', 50, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 80, 85);
  doc.text(`Empresa: ${company ? company.name : '—'}`, 50, y + 32);
  doc.text(`Contato: ${contact ? contact.name : '—'}`, 50, y + 46);
  doc.text(`E-mail / WA: ${contact ? contact.email : '—'}`, 50, y + 60);

  // Proposal Info (Right)
  const rightX = 50 + (pageWidth - 90) / 2 + 10;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 50, 55);
  doc.text('CONDIÇÕES DA PROPOSTA', rightX, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 80, 85);
  doc.text(`Validade até: ${formatDate(version.validUntil, false)}`, rightX, y + 32);
  doc.text(`Condição de Pagamento: ${version.paymentTerms || 'A combinar'}`, rightX, y + 46);
  doc.text(`Prazo de Entrega: ${version.deliveryTerms || 'Sujeito à validação'}`, rightX, y + 60);

  y += 90;

  // Items Table Header
  doc.setFillColor(34, 50, 55);
  doc.rect(40, y, pageWidth - 80, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ITEM', 48, y + 15);
  doc.text('SKU / PRODUTO', 80, y + 15);
  doc.text('QTD', 310, y + 15, { align: 'right' });
  doc.text('UNITÁRIO', 380, y + 15, { align: 'right' });
  doc.text('DESC.', 440, y + 15, { align: 'right' });
  doc.text('TOTAL LÍQ.', pageWidth - 50, y + 15, { align: 'right' });

  y += 22;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let grossSum = 0;
  let discountSum = 0;

  version.lines.forEach((line, idx) => {
    grossSum += line.grossCents;
    discountSum += line.discountCents;

    const rowBg = idx % 2 === 0 ? 255 : 249;
    doc.setFillColor(rowBg, rowBg, rowBg);
    doc.rect(40, y, pageWidth - 80, 22, 'F');
    doc.setDrawColor(230, 235, 230);
    doc.line(40, y + 22, pageWidth - 40, y + 22);

    doc.setTextColor(50, 60, 65);
    doc.text(String(idx + 1).padStart(2, '0'), 48, y + 15);
    doc.setFont('helvetica', 'bold');
    doc.text(line.skuSnapshot, 80, y + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(`- ${line.nameSnapshot}`, 175, y + 15);
    doc.text(String(line.quantity), 310, y + 15, { align: 'right' });
    doc.text(formatCurrency(line.unitPriceCents), 380, y + 15, { align: 'right' });
    doc.text(formatBps(line.discountBps), 440, y + 15, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(line.netCents), pageWidth - 50, y + 15, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += 22;
  });

  y += 15;

  // Totals Box (Right aligned)
  const totalsBoxWidth = 220;
  const totalsBoxX = pageWidth - 40 - totalsBoxWidth;

  doc.setFillColor(245, 246, 240);
  doc.setDrawColor(218, 224, 215);
  doc.roundedRect(totalsBoxX, y, totalsBoxWidth, 88, 4, 4, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(80, 90, 95);
  doc.text('Subtotal Bruto:', totalsBoxX + 12, y + 20);
  doc.text(formatCurrency(grossSum), pageWidth - 52, y + 20, { align: 'right' });

  doc.text('Desconto Aplicado:', totalsBoxX + 12, y + 36);
  doc.text(`-${formatCurrency(discountSum)}`, pageWidth - 52, y + 36, { align: 'right' });

  doc.text('Frete Calculado:', totalsBoxX + 12, y + 52);
  doc.text(version.freightPending ? 'A definir' : formatCurrency(version.freightCents), pageWidth - 52, y + 52, { align: 'right' });

  doc.setDrawColor(200, 205, 200);
  doc.line(totalsBoxX + 10, y + 60, pageWidth - 50, y + 60);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(34, 50, 55);
  doc.text('TOTAL:', totalsBoxX + 12, y + 76);
  doc.setTextColor(177, 212, 72);
  doc.text(formatCurrency(version.totalCents), pageWidth - 52, y + 76, { align: 'right' });

  y += 110;

  // Notes Box
  doc.setFillColor(250, 250, 248);
  doc.setDrawColor(220, 225, 220);
  doc.roundedRect(40, y, pageWidth - 80, 60, 4, 4, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 65, 70);
  doc.text('NOTAS IMPORTANTES E AVISOS TÉCNICOS:', 50, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 100, 105);
  doc.text('• Valores demonstrativos para homologação e alinhamento comercial, sem apuração fiscal.', 50, y + 28);
  doc.text('• Conectores e chicotes sob projeto exigem confirmação dimensional e técnica prévia pela engenharia.', 50, y + 40);
  doc.text('• Validade garantida até a data especificada nesta revisão. Revisões posteriores substituem este documento.', 50, y + 52);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(140, 150, 155);
  doc.text('MegaWhip Sistemas Elétricos • Protótipo Comercial B2B • Gerado localmente no navegador', pageWidth / 2, 800, { align: 'center' });

  doc.save(`${quote.number}-REV${version.revision}.pdf`);
}
