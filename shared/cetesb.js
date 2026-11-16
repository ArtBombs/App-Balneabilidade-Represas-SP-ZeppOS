// Balneabilidade das praias interiores — camada pública do mapa da CETESB (ArcGIS Feature Service).
// Descoberta em 06/11/2026 nas requisições do mapa oficial:
// https://arcgis.cetesb.sp.gov.br/portal/apps/experiencebuilder/experience?id=5caf462c81a04896baf8f3916121b8ff
// A camada guarda só o retrato atual (1 linha por ponto, 37 pontos no estado). O histórico é
// acumulado pelo side service, uma entrada por data de relatório (drelatorio).

export const ARCGIS =
  'https://arcgis.cetesb.sp.gov.br/server/rest/services/Hosted/PRAIAS_INTERIORES_DEFINITIVA/FeatureServer/0/query'
export const HIST_MAX = 6 // relatórios guardados por ponto
export const MAX_PONTOS = 10 // 2 telas × 5 linhas
export const CAMPOS =
  'pto_cetesb,praia,local_,muncp,sist_hid,classific,classific_texto,agrup_classific,freq,drelatorio,perini,perfim'

// Represas de abastecimento da RMSP com praia monitorada (v1.1.0, 12/11/2026).
// `s` = códigos sist_hid_c da CETESB. Alto Tietê, Cotia, Rio Claro e São Lourenço não têm pontos.
export const REPRESAS = [
  { id: 'GUAR', nome: 'Guarapiranga', s: ['GUAR'] },
  { id: 'BILL', nome: 'Billings', s: ['BILL'] },
  { id: 'RGDE', nome: 'Rio Grande', s: ['RGDE'] },
  { id: 'CANT', nome: 'Cantareira', s: ['JCRE', 'RAIN'] }, // Jacareí-Jaguari + Atibainha
]
export const REP_PADRAO = 'GUAR'
export const REP_PONTE = 'GUAR' // o arquivo para mostradores é sempre da Guarapiranga
export const acharRepresa = (id) => REPRESAS.find((r) => r.id === id) || REPRESAS[0]

// O mapa oficial também esconde este ponto (não classificado desde 24/04/2026).
export const EXCLUIDOS = ['RAIN 00802']

// Nomes curtos para caber no relógio (código CETESB → nome). Ponto novo cai no nome encurtado.
// GUAR: conferidos no mapa pela ArtBombs (06–07/11). Demais: proposta, a conferir.
export const NOMES_CURTOS = {
  'GUAR 00051': 'Praia do Crispim',
  'GUAR 00101': 'Dedo de Deus',
  'GUAR 00301': 'Miami Paulista',
  'GUAR 00401': 'Marina Guaraci',
  'GUAR 00452': 'Praia do Jd. Represa',
  'GUAR 00502': 'Clube de Campo Castelo',
  'GUAR 00602': 'Guarujapiranga',
  'GUAR 00611': 'Wind Clube',
  'GUAR 00702': 'Praia do Sol',
  'GUAR 00751': 'Yacht Club São Paulo',
  'BILL 02801': 'Prainha Riacho Grande',
  'RGDE 02301': 'Clube Tahiti',
  'RGDE 02701': 'Clube Metalúrgicos ABC',
  'RGDE 02851': 'Estoril – Zoológico',
  'RGDE 02901': 'Prainha do Estoril',
  'JCRE 00521': 'Cond. Novo Horizonte',
  'JCRE 00701': 'Praia da Serrinha',
  'RAIN 00402': 'Praia do Utinga',
  'RAIN 00701': 'Pousada Porto do Sol',
}

// Referência na 2ª linha: nome do rio nas entradas de rio, bairro nos demais (regra da ArtBombs).
// Ponto novo sem entrada aqui cai no município (se não for São Paulo).
export const BAIRROS = {
  'GUAR 00051': 'Rio Embu-Guaçu',
  'GUAR 00101': 'Rio Embu-Guaçu',
  'GUAR 00301': 'Rio Embu-Mirim',
  'GUAR 00401': 'Rio Embu-Mirim',
  'GUAR 00452': 'Cidade Dutra',
  'GUAR 00502': 'Cidade Dutra',
  'GUAR 00602': 'Interlagos',
  'GUAR 00611': 'Rio Guarapiranga',
  'GUAR 00702': 'Interlagos',
  'GUAR 00751': 'Rio Guarapiranga',
  'BILL 02801': 'S. Bernardo do Campo',
  'RGDE 02301': 'Ribeirão Pires',
  'RGDE 02701': 'S. Bernardo do Campo',
  'RGDE 02851': 'Parque Estoril',
  'RGDE 02901': 'Parque Estoril',
  'JCRE 00521': 'Piracaia',
  'JCRE 00701': 'Bragança Paulista',
  'RAIN 00402': 'Nazaré Paulista',
  'RAIN 00701': 'Nazaré Paulista',
}

export function bairro(a) {
  const b = BAIRROS[a.pto_cetesb]
  if (b) return b
  return a.muncp && a.muncp !== 'São Paulo' ? a.muncp : ''
}

const soLetras = (x) => String(x).replace(/[^A-Z]/g, '')
export function urlConsulta(rep) {
  const r = acharRepresa(rep)
  const lista = r.s.map((x) => "'" + soLetras(x) + "'").join(',')
  const fora = EXCLUIDOS.map((x) => " AND pto_cetesb<>'" + x.replace(/[^A-Z0-9 ]/g, '') + "'").join('')
  const where = 'sist_hid_c IN (' + lista + ')' + fora
  return (
    ARCGIS +
    '?f=json&returnGeometry=false&orderByFields=pto_cetesb&outFields=' +
    CAMPOS +
    '&where=' +
    encodeURIComponent(where)
  )
}

// Datas da camada: meia-noite de Brasília em ms (ex.: 1793329200000 = 30/10/2026 00:00 −03).
export const dia = (ms) => (typeof ms === 'number' && isFinite(ms) ? new Date(ms - 3 * 3600e3).toISOString().slice(0, 10) : null)

// P = própria (inclui "Sistematicamente boa", classific S, dos pontos mensais) · I = imprópria · N = não classificada
export function classe(a) {
  const g = String(a.agrup_classific || '').toLowerCase()
  if (g.startsWith('pr')) return 'P'
  if (g.startsWith('impr')) return 'I'
  if (g.startsWith('n')) return 'N'
  const c = String(a.classific || '').toUpperCase()
  return c[0] === 'P' || c[0] === 'S' ? 'P' : c[0] === 'I' ? 'I' : 'N'
}

export function nomeCurto(a) {
  const n = NOMES_CURTOS[a.pto_cetesb]
  if (n) return n
  const s = String(a.praia || a.local_ || a.pto_cetesb || '?')
    .replace(/^(Prainha|Praia)( d[oa])? /i, '')
    .trim()
  return s.length > 22 ? s.slice(0, 21) + '.' : s
}

// Junta o retrato atual ao histórico salvo: { [pto]: [{ d, k }, …] } (mais antigo primeiro).
export function mesclarHist(hist, pontos) {
  const out = {}
  for (const p of pontos) {
    const ant = (hist && Array.isArray(hist[p.c]) ? hist[p.c] : []).filter((x) => x && x.d)
    const lista = ant.filter((x) => x.d !== p.d)
    lista.push({ d: p.d, k: p.k })
    lista.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))
    out[p.c] = lista.slice(-HIST_MAX)
  }
  return out
}

// Resposta do ArcGIS → payload pequeno para o relógio (+ histórico atualizado).
export function montarPayload(rep, body, histAnterior) {
  const r = acharRepresa(rep)
  if (!body || body.error) throw new Error('ArcGIS: ' + ((body && body.error && body.error.message) || 'resposta vazia'))
  const feats = (body.features || []).map((f) => f.attributes || {}).filter((a) => EXCLUIDOS.indexOf(a.pto_cetesb) < 0)
  if (!feats.length) throw new Error('nenhum ponto para ' + r.id)

  const pontos = feats.slice(0, MAX_PONTOS).map((a) => ({
    c: a.pto_cetesb,
    n: nomeCurto(a),
    m: a.muncp || '',
    b: bairro(a),
    k: classe(a),
    t: a.classific_texto || '',
    d: dia(a.drelatorio),
  }))
  const hist = mesclarHist(histAnterior, pontos)
  for (const p of pontos) p.h = hist[p.c].map((x) => x.k)

  // Data mais recente de relatório, e o período de amostras dela
  let ref = feats[0]
  for (const a of feats) if ((a.drelatorio || 0) > (ref.drelatorio || 0)) ref = a
  const mensal = feats.every((a) => String(a.freq || '').toLowerCase().startsWith('m'))

  return {
    payload: {
      rep: r.id,
      sist: r.id, // compatível com a ponte/cache da v1.0.x
      nome: r.nome,
      fr: mensal ? 'M' : 'S',
      d: dia(ref.drelatorio),
      ini: dia(ref.perini),
      fim: dia(ref.perfim),
      pts: pontos,
      ts: Date.now(),
    },
    hist,
  }
}
