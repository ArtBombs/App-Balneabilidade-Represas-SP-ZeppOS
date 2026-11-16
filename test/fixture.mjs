// Respostas reais da camada PRAIAS_INTERIORES_DEFINITIVA.
// GUAR em 06/11/2026 (relatório 30/10); BILL/RGDE/JCRE/RAIN em 12/11/2026.
const ms = (s) => Date.parse(s + 'T00:00:00-03:00')
const I = { classific: 'I', classific_texto: 'Imprópria pelo critério microbiológico', agrup_classific: 'Imprópria' }
const P = { classific: 'P', classific_texto: 'Própria', agrup_classific: 'Própria' }
const S = { classific: 'S', classific_texto: 'Sistematicamente boa', agrup_classific: 'Própria' }
const N = { classific: 'N', classific_texto: 'Não Classificada', agrup_classific: 'Não Classificada' }
const sem = (rel, ini, fim) => ({ freq: 'Semanal', drelatorio: ms(rel), perini: ms(ini), perfim: ms(fim) })
const men = (rel, ini, fim) => ({ freq: 'Mensal', drelatorio: ms(rel), perini: ms(ini), perfim: ms(fim) })
const G = sem('2026-10-30', '2026-09-29', '2026-10-26')
const B = sem('2026-11-06', '2026-10-05', '2026-11-03')
const M = men('2026-10-30', '2026-10-01', '2026-10-30')
const linhas = [
  ['GUAR', 'GUAR 00051', 'Prainha Bairro do Crispim', 'Itapecerica da Serra', I, G],
  ['GUAR', 'GUAR 00101', "Praia Dedo de Deus - M'Boi Mirim", 'São Paulo', I, G],
  ['GUAR', 'GUAR 00301', 'Bairro Miami Paulista/Aracati', 'São Paulo', I, G],
  ['GUAR', 'GUAR 00401', 'Marina Guaraci', 'São Paulo', I, G],
  ['GUAR', 'GUAR 00452', 'Prainha do Jardim Represa - Hidroavião', 'São Paulo', I, G],
  ['GUAR', 'GUAR 00502', 'Clube de Campo Castelo', 'São Paulo', I, G],
  ['GUAR', 'GUAR 00602', 'Restaurante Interlagos - Guarujapiranga', 'São Paulo', P, G],
  ['GUAR', 'GUAR 00611', 'No píer da Escola de Esportes Náuticos Wind Clube', 'São Paulo', I, G],
  ['GUAR', 'GUAR 00702', 'Marina Guarapiranga - Praia do Sol', 'São Paulo', I, G],
  ['GUAR', 'GUAR 00751', 'Em frente ao píer do Yacht Club Paulista', 'São Paulo', I, G],
  ['BILL', 'BILL 02801', 'Prainha do Riacho Grande, próxima à barragem do Rio Grande', 'São Bernardo do Campo', P, B],
  ['RGDE', 'RGDE 02301', 'Prainha do Clube Tahiti', 'Ribeirão Pires', P, B],
  ['RGDE', 'RGDE 02701', 'Clube de Campo Sindicato dos Metalúrgicos do ABC', 'São Bernardo do Campo', P, B],
  ['RGDE', 'RGDE 02851', 'Próxima ao Zoológico Do Parque Municipal', 'São Bernardo do Campo', P, B],
  ['RGDE', 'RGDE 02901', 'Prainha do Parque Municipal do Estoril', 'São Bernardo do Campo', I, B],
  ['JCRE', 'JCRE 00521', 'Praia do Condomínio Novo Horizonte', 'Piracaia', S, M],
  ['JCRE', 'JCRE 00701', 'Praia da Serrinha (Píer da Marina Confiança)', 'Bragança Paulista', S, M],
  ['RAIN', 'RAIN 00402', 'Praia do Utinga', 'Nazaré Paulista', S, M],
  ['RAIN', 'RAIN 00701', 'Píer da Pousada Porto do Sol', 'Nazaré Paulista', S, M],
  ['RAIN', 'RAIN 00802', 'Rod. Dom Pedro I (rampa próx. Hotel Varanda)', 'Nazaré Paulista', N, men('2026-04-24', '2026-04-01', '2026-04-24')],
]
// Simula o filtro do ArcGIS a partir da URL (sist_hid_c IN (...)). O RAIN 00802 vem de propósito:
// o montarPayload também precisa descartá-lo.
export function respostaPara(url, extra = {}) {
  const w = decodeURIComponent(url.split('where=')[1] || '')
  const sists = (w.match(/IN \(([^)]*)\)/) || [, ''])[1].replace(/'/g, '').split(',')
  return {
    features: linhas
      .filter((l) => sists.includes(l[0]))
      .map(([sist, pto, praia, muncp, c, f]) => ({ attributes: { sist_hid_c: sist, sist_hid: sist, ...f, ...c, pto_cetesb: pto, praia, muncp, ...extra } })),
  }
}
