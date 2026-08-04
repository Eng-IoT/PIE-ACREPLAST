export type ComplianceStatus = 'conforme' | 'nao_conforme' | 'pendente' | 'nao_avaliado' | 'nao_aplicavel';

const normalize = (value: unknown) => String(value ?? '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[\s-]+/g, '_');

export function normalizeComplianceStatus(value: unknown): ComplianceStatus {
  const status = normalize(value);
  if (['conforme', 'aprovado', 'ativo', 'valido', 'regular'].includes(status)) return 'conforme';
  if (['nao_conforme', 'reprovado', 'irregular', 'vencido'].includes(status)) return 'nao_conforme';
  if (['pendente', 'pending', 'em_analise', 'aguardando', 'em_preenchimento'].includes(status)) return 'pendente';
  if (['nao_aplicavel', 'n_a', 'na'].includes(status)) return 'nao_aplicavel';
  return 'nao_avaliado';
}

export function normalizeActionStatus(value: unknown) {
  const status = normalize(value);
  if (['completed', 'concluido', 'concluida', 'finalizado', 'finalizada', 'feito', 'fechado'].includes(status)) return 'completed';
  if (['in_progress', 'em_andamento', 'andamento'].includes(status)) return 'in_progress';
  return 'pending';
}

export function normalizePriority(value: unknown) {
  const priority = normalize(value);
  if (['critical', 'critica', 'critico'].includes(priority)) return 'critical';
  if (['high', 'alta', 'alto'].includes(priority)) return 'high';
  if (['medium', 'media', 'medio'].includes(priority)) return 'medium';
  return 'low';
}

export function parseLocalDate(value: unknown) {
  if (!value) return null;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  const text = String(value).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isOverdue(deadline: unknown, status: unknown) {
  if (normalizeActionStatus(status) === 'completed') return false;
  const date = parseLocalDate(deadline);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

export function calculateCompliance(statuses: unknown[]) {
  const normalized = statuses.map(normalizeComplianceStatus);
  const conforme = normalized.filter(status => status === 'conforme').length;
  const naoConforme = normalized.filter(status => status === 'nao_conforme').length;
  const pendente = normalized.filter(status => status === 'pendente').length;
  const naoAvaliado = normalized.filter(status => status === 'nao_avaliado').length;
  const naoAplicavel = normalized.filter(status => status === 'nao_aplicavel').length;
  const avaliados = conforme + naoConforme + pendente;
  return {
    conforme,
    naoConforme,
    pendente,
    naoAvaliado,
    naoAplicavel,
    avaliados,
    percentual: avaliados === 0 ? null : Math.round((conforme / avaliados) * 1000) / 10,
  };
}
