import { BaseSideService } from '@zeppos/zml/base-side'
import { REPRESAS, REP_PADRAO, urlConsulta, montarPayload } from '../shared/cetesb'

// Chaves por represa (GUAR mantém as chaves da v1.0.x → histórico preservado)
const K_CACHE = (r) => 'balne_payload_' + r
const K_HIST = (r) => 'balne_hist_' + r

function lerStore(k) {
  try {
    const s = settings.settingsStorage.getItem(k)
    return s ? JSON.parse(s) : null
  } catch (e) {
    return null
  }
}

function gravarStore(k, v) {
  try {
    settings.settingsStorage.setItem(k, JSON.stringify(v))
  } catch (e) {}
}

async function buscar(rep) {
  const res = await fetch({ url: urlConsulta(rep), method: 'GET', headers: { Accept: 'application/json' } })
  if (res.status && res.status !== 200) throw new Error('HTTP ' + res.status)
  const body = typeof res.body === 'string' ? JSON.parse(res.body) : res.body
  const { payload, hist } = montarPayload(rep, body, lerStore(K_HIST(rep)))
  gravarStore(K_HIST(rep), hist)
  gravarStore(K_CACHE(rep), payload)
  return payload
}

AppSideService(
  BaseSideService({
    onInit() {},
    onRun() {},
    onDestroy() {},

    onRequest(req, res) {
      if (req.method !== 'balne.get') return res('método desconhecido')
      const p = req.params || {}
      const pedido = p.rep || p.sist // v1.0.x mandava `sist`
      const rep = REPRESAS.some((r) => r.id === pedido) ? pedido : REP_PADRAO

      buscar(rep)
        .then((payload) => res(null, { ok: true, payload }))
        .catch((err) => {
          this.error('falha CETESB:', err && err.message)
          const cache = lerStore(K_CACHE(rep))
          if (cache) res(null, { ok: true, stale: true, payload: cache })
          else res(null, { ok: false, rep, error: String((err && err.message) || err) })
        })
    },
  }),
)
