// Idioma da interface (v1.2.0). Relógio em português (pt-BR 20 · pt-PT 15) → português;
// qualquer outro idioma → inglês (a loja da Zepp exige inglês como idioma padrão).
// Tabela: docs.zepp.com › Related Resources › Multilingual Mapping (getLanguage de @zos/settings).
// Namespace com checagem: firmware sem getLanguage cai em português. Mesmo esquema do Mananciais SP.
// Nomes de praias, represas, rios e bairros NÃO são traduzidos (nomes próprios).
import * as zosSettings from '@zos/settings'

function detectar() {
  try {
    if (typeof zosSettings.getLanguage === 'function') {
      const c = Number(zosSettings.getLanguage())
      if (!isNaN(c)) return c === 20 || c === 15 ? 'pt' : 'en'
    }
  } catch (e) {}
  return 'pt'
}

export const LANG = detectar()
export const EN = LANG === 'en'

// Chave = id curto; valor = [português, inglês]
const T = {
  propria: ['Própria', 'Safe'],
  impropria: ['Imprópria', 'Unsafe'],
  naoClass: ['Não classificada', 'Not rated'],
  paraBanho1: ['própria para banho', 'safe for swimming'],
  paraBanhoN: ['próprias para banho', 'safe for swimming'],
  paraBanho0: ['para banho', 'safe for swimming'],
  impr1: [' imprópria', ' unsafe'],
  imprN: [' impróprias', ' unsafe'],
  nenhumaImpr: ['nenhuma imprópria', 'none unsafe'],
  atualizando: ['atualizando...', 'updating...'],
  semConexao: ['sem conexão', 'offline'],
  offline: ['offline', 'cached'],
  salvo: ['salvo', 'saved'],
  mensal: ['mensal', 'monthly'],
  semanal: ['semanal', 'weekly'],
  pontos: ['PONTOS', 'SPOTS'],
  pontoUnico: ['PONTO ÚNICO', 'ONLY SPOT'],
  ponto: ['PONTO', 'SPOT'],
  de: [' DE ', ' OF '],
  so: ['só ', 'only '],
  ponto1: [' ponto', ' spot'],
  pontoN: [' pontos', ' spots'],
  nestaRepresa: ['nesta represa', 'at this reservoir'],
  represas: ['REPRESAS', 'RESERVOIRS'],
  criterio: ['CRITÉRIO CETESB', 'CETESB CRITERIA'],
  PROPRIA: ['PRÓPRIA', 'SAFE'],
  IMPROPRIA: ['IMPRÓPRIA', 'UNSAFE'],
  crit1: ['E. coli até 600 /100 mL', 'E. coli up to 600 /100 mL'],
  crit2: ['em 80% das amostras', 'in 80% of samples'],
  crit3: ['acima de 600 em +20%', 'above 600 in over 20%'],
  crit4: ['ou acima de 1500 na última', 'or above 1500 in the latest'],
  amostras: ['amostras ', 'samples '],
  a: [' a ', ' – '],
  fonte: ['Fonte: CETESB · ', 'Source: CETESB · '],
  boletimDe: ['Boletim de ', 'Report of '],
}

export const t = (k) => {
  const v = T[k]
  return v ? v[EN ? 1 : 0] : k
}

// Data curta: "13/11" em português, "Nov 13" em inglês (evita a ambiguidade dd/mm × mm/dd)
const MESES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const dataCurta = (s) => {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return '--'
  return EN ? MESES[Number(m[2]) - 1] + ' ' + Number(m[3]) : m[3] + '/' + m[2]
}
