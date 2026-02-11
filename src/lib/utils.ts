import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-TN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount) + ' DT';
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy', { locale: fr });
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: fr });
}

export function generateNumber(prefix: string): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${rand}`;
}

export function generateInvoiceNumber(): string {
  return generateNumber('TEE');
}

export function generatePONumber(): string {
  return generateNumber('PO');
}

export function generateJobNumber(): string {
  return generateNumber('JOB');
}

export function generateQuoteNumber(): string {
  return generateNumber('DEV');
}

export function generateBLNumber(): string {
  return generateNumber('BL');
}

export function calculateRetenue(total: number): number {
  return total >= 1000 ? total * 0.01 : 0;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export const EXPENSE_CATEGORIES = [
  'Loyer',
  'Electricite',
  'Internet',
  'Transport',
  'Matiere premiere',
  'Equipement',
  'Salaires',
  'Marketing',
  'Fournitures',
  'Maintenance',
  'Assurance',
  'Autre',
] as const;

export const TECHNIQUE_LABELS: Record<string, string> = {
  dtf: 'DTF',
  uv: 'UV',
  embroidery: 'Broderie',
  laser: 'Laser',
};

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-700' },
  validated: { bg: 'bg-blue-50', text: 'text-blue-700' },
  paid: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700' },
  ordered: { bg: 'bg-blue-50', text: 'text-blue-700' },
  received: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  pending: { bg: 'bg-amber-50', text: 'text-amber-700' },
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-700' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  delivered: { bg: 'bg-teal-50', text: 'text-teal-700' },
  sent: { bg: 'bg-cyan-50', text: 'text-cyan-700' },
  accepted: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700' },
  converted: { bg: 'bg-brand-50', text: 'text-brand-700' },
  returned: { bg: 'bg-orange-50', text: 'text-orange-700' },
};

export const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: 'bg-slate-100', text: 'text-slate-600' },
  medium: { bg: 'bg-blue-50', text: 'text-blue-700' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700' },
  urgent: { bg: 'bg-red-50', text: 'text-red-700' },
};

export function exportTEJCSV(purchases: Array<{
  po_number: string;
  order_date: string;
  supplier_name: string;
  supplier_tax_id: string;
  total: number;
  retenue_source: number;
}>) {
  const header = 'Numero,Date,Fournisseur,MF Fournisseur,Montant TTC,Retenue Source\n';
  const rows = purchases.map((p) =>
    `"${p.po_number}","${p.order_date}","${p.supplier_name}","${p.supplier_tax_id}",${p.total},${p.retenue_source}`
  ).join('\n');
  return header + rows;
}

export function exportTEJXML(purchases: Array<{
  po_number: string;
  order_date: string;
  supplier_name: string;
  supplier_tax_id: string;
  total: number;
  retenue_source: number;
}>) {
  const items = purchases.map((p) => `    <Achat>
      <Numero>${p.po_number}</Numero>
      <Date>${p.order_date}</Date>
      <Fournisseur>${p.supplier_name}</Fournisseur>
      <MF>${p.supplier_tax_id}</MF>
      <MontantTTC>${p.total.toFixed(3)}</MontantTTC>
      <RetenueSource>${p.retenue_source.toFixed(3)}</RetenueSource>
    </Achat>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<DeclarationTEJ>\n  <Achats>\n${items}\n  </Achats>\n</DeclarationTEJ>`;
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function generateRNNumber(): string {
  return generateNumber('BR');
}

export function generateCNNumber(): string {
  return generateNumber('AV');
}

export function generateSONumber(): string {
  return generateNumber('CMD');
}

export function calculateFODEC(amountHT: number, rate: number = 1): number {
  return amountHT * (rate / 100);
}

const UNITS = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const TEENS = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function convertLessThanThousand(n: number): string {
  if (n === 0) return '';
  if (n < 10) return UNITS[n];
  if (n >= 10 && n < 20) return TEENS[n - 10];

  if (n < 70) {
    const ten = Math.floor(n / 10);
    const unit = n % 10;
    if (unit === 0) return TENS[ten];
    if (unit === 1 && ten === 2) return 'vingt et un';
    if (unit === 1 && ten === 3) return 'trente et un';
    if (unit === 1 && ten === 4) return 'quarante et un';
    if (unit === 1 && ten === 5) return 'cinquante et un';
    if (unit === 1 && ten === 6) return 'soixante et un';
    return TENS[ten] + '-' + UNITS[unit];
  }

  if (n >= 70 && n < 80) {
    const remainder = n - 60;
    if (remainder < 10) return 'soixante-' + UNITS[remainder];
    return 'soixante-' + TEENS[remainder - 10];
  }

  if (n >= 80 && n < 100) {
    const remainder = n - 80;
    if (remainder === 0) return 'quatre-vingts';
    if (remainder < 10) return 'quatre-vingt-' + UNITS[remainder];
    return 'quatre-vingt-' + TEENS[remainder - 10];
  }

  const hundred = Math.floor(n / 100);
  const remainder = n % 100;
  let result = '';

  if (hundred === 1) {
    result = 'cent';
  } else {
    result = UNITS[hundred] + ' cent';
  }

  if (hundred > 1 && remainder === 0) {
    result += 's';
  }

  if (remainder > 0) {
    result += ' ' + convertLessThanThousand(remainder);
  }

  return result;
}

export function numberToFrenchWords(amount: number): string {
  if (amount === 0) return 'zéro dinars';

  const dinars = Math.floor(amount);
  const millimes = Math.round((amount - dinars) * 1000);

  let result = '';

  if (dinars === 0) {
    result = '';
  } else if (dinars === 1) {
    result = 'un dinar';
  } else if (dinars < 1000) {
    result = convertLessThanThousand(dinars) + ' dinars';
  } else {
    const thousands = Math.floor(dinars / 1000);
    const remainder = dinars % 1000;

    if (thousands === 1) {
      result = 'mille';
    } else {
      result = convertLessThanThousand(thousands) + ' mille';
    }

    if (remainder > 0) {
      result += ' ' + convertLessThanThousand(remainder);
    }

    result += ' dinars';
  }

  if (millimes > 0) {
    if (result) result += ' et ';
    result += convertLessThanThousand(millimes) + ' millimes';
  }

  return result.charAt(0).toUpperCase() + result.slice(1);
}

export async function generateQRDataURL(text: string): Promise<string> {
  const QRCode = await import('qrcode');
  return QRCode.toDataURL(text, {
    width: 150,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
}

export interface CompanyValidationError {
  field: string;
  message: string;
}

export function validateCompanyForTEJ(company: {
  company_name?: string;
  company_tax_id?: string;
  company_email?: string;
  company_phone?: string;
}): CompanyValidationError[] {
  const errors: CompanyValidationError[] = [];

  if (!company.company_name) {
    errors.push({
      field: 'company_name',
      message: 'Le nom de la société est requis',
    });
  }

  if (!company.company_tax_id) {
    errors.push({
      field: 'company_tax_id',
      message: 'Matricule fiscal de la société invalide (doit être 7 chiffres + 1 lettre)',
    });
  } else {
    const taxIdRegex = /^\d{7}[A-Za-z]$/;
    if (!taxIdRegex.test(company.company_tax_id)) {
      errors.push({
        field: 'company_tax_id',
        message: 'Matricule fiscal de la société invalide (doit être 7 chiffres + 1 lettre)',
      });
    }
  }

  if (!company.company_email) {
    errors.push({
      field: 'company_email',
      message: "L'adresse email de la société est requise",
    });
  }

  if (!company.company_phone) {
    errors.push({
      field: 'company_phone',
      message: 'Le numéro de téléphone de la société est requis',
    });
  }

  return errors;
}
