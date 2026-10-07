export const JSEARCH_CALLS_PER_RUN = 2;
export const JSEARCH_MONTHLY_CAP = 180;

export interface MetierQuery {
  id: string;
  label: string;
  query: string;
}

export const METIER_ROTATION: MetierQuery[] = [
  { id: 'mecanique', label: 'Mécanique', query: 'mécanicien Afrique' },
  { id: 'electricite', label: 'Électricité', query: 'électricien Afrique' },
  { id: 'informatique', label: 'Informatique', query: 'informaticien Afrique' },
  { id: 'btp', label: 'BTP', query: 'génie civil Afrique' },
  { id: 'comptabilite', label: 'Comptabilité', query: 'comptable Afrique' },
  { id: 'sante', label: 'Santé', query: 'infirmier Afrique' },
  { id: 'agriculture', label: 'Agriculture', query: 'agronome Afrique' },
  { id: 'logistique', label: 'Logistique', query: 'logisticien Afrique' },
  { id: 'rh', label: 'Ressources humaines', query: 'ressources humaines Afrique' },
  { id: 'petrole', label: 'Pétrole et gaz', query: 'pétrolier Afrique' },
  { id: 'enseignement', label: 'Enseignement', query: 'enseignant Afrique' },
  { id: 'maintenance', label: 'Maintenance', query: 'maintenance industrielle Afrique' },
];

export function dayInDouala(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Douala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function dayOfYear(iso: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return 1;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = Date.UTC(year, month - 1, day);
  const start = Date.UTC(year, 0, 1);
  return Math.floor((utc - start) / 86_400_000) + 1;
}

export function queriesForDay(dayIso: string): MetierQuery[] {
  const count = METIER_ROTATION.length;
  if (count === 0) return [];
  const start = ((dayOfYear(dayIso) - 1) * JSEARCH_CALLS_PER_RUN) % count;
  return Array.from({ length: JSEARCH_CALLS_PER_RUN }, (_, offset) => METIER_ROTATION[(start + offset) % count]);
}

export function callsForMonth(year: number, month: number): number {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let total = 0;
  for (let day = 1; day <= days; day += 1) {
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    total += queriesForDay(iso).length;
  }
  return total;
}
