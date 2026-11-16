// Gera JSON dos widgets visíveis em cada estado do app, para tools/capturas_balne.py.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { REPRESAS, montarPayload, urlConsulta } from '../shared/cetesb.js'
import { respostaPara } from '../test/fixture.mjs'

// Retrato real da camada em 14/11/2026 (boletim de 13/11 nos semanais; 30/10 nos mensais)
const ms = (s) => Date.parse(s + 'T00:00:00-03:00')
const sem = { freq: 'Semanal', drelatorio: ms('2026-11-13'), perini: ms('2026-10-12'), perfim: ms('2026-11-10') }
const men = { freq: 'Mensal', drelatorio: ms('2026-10-30'), perini: ms('2026-10-01'), perfim: ms('2026-10-30') }
const I = { classific: 'I', agrup_classific: 'Imprópria', classific_texto: 'Imprópria pelo critério microbiológico' }
const P = { classific: 'P', agrup_classific: 'Própria', classific_texto: 'Própria' }
const S = { classific: 'S', agrup_classific: 'Própria', classific_texto: 'Sistematicamente boa' }
const hoje = {
  GUAR: [['GUAR 00051', I, 'Itapecerica da Serra'], ['GUAR 00101', I], ['GUAR 00301', I], ['GUAR 00401', I], ['GUAR 00452', I], ['GUAR 00502', I], ['GUAR 00602', P], ['GUAR 00611', I], ['GUAR 00702', I], ['GUAR 00751', I]],
  BILL: [['BILL 02801', P, 'São Bernardo do Campo']],
  RGDE: [['RGDE 02301', P, 'Ribeirão Pires'], ['RGDE 02701', I, 'São Bernardo do Campo'], ['RGDE 02851', P, 'São Bernardo do Campo'], ['RGDE 02901', I, 'São Bernardo do Campo']],
  CANT: [['JCRE 00521', S, 'Piracaia'], ['JCRE 00701', S, 'Bragança Paulista'], ['RAIN 00402', S, 'Nazaré Paulista'], ['RAIN 00701', S, 'Nazaré Paulista']],
}
const resp = (id) => ({ features: hoje[id].map(([pto, c, m]) => ({ attributes: { pto_cetesb: pto, muncp: m || 'São Paulo', ...(id === 'CANT' ? men : sem), ...c } })) })
const payloads = {}
for (const r of REPRESAS) {
  // histórico real: boletins anteriores que já vimos (GUAR 30/10, RGDE 06/11)
  let hist = null
  if (r.id === 'GUAR' || r.id === 'RGDE') hist = montarPayload(r.id, respostaPara(urlConsulta(r.id)), null).hist
  payloads[r.id] = montarPayload(r.id, resp(r.id), hist).payload
}

const widgets = []
const mk = (type, opts) => { const w = { type, opts: { ...opts, visible: true }, ev: {}, vivo: true, setProperty(k, v) { if (k === 'MORE') Object.assign(this.opts, v); else this.opts[k] = v }, addEventListener(e, f) { this.ev[e] = f } }; widgets.push(w); return w }
const store = {}
let keyCb = null
globalThis.__zos = {
  ui: { createWidget: mk, deleteWidget: (w) => { w.vivo = false; return true }, widget: { TEXT: 'TEXT', ARC: 'ARC', FILL_RECT: 'FILL_RECT', IMG: 'IMG' }, prop: { TEXT: 'text', COLOR: 'color', MORE: 'MORE', VISIBLE: 'visible' }, align: { CENTER_H: 'c', LEFT: 'l', RIGHT: 'r', CENTER_V: 'v' }, text_style: { NONE: 0 }, event: { CLICK_UP: 'up' } },
  page: { setScrollMode: () => {}, setScrollLock: () => {}, getSwiperIndex: () => 1, SCROLL_MODE_SWIPER: 'swiper' },
  interaction: { onKey: (o) => { keyCb = o.callback }, offKey: () => {}, onGesture: () => {}, offGesture: () => {}, KEY_SELECT: 13, KEY_UP: 38, KEY_DOWN: 40, KEY_HOME: 36, KEY_SHORTCUT: 1, KEY_BACK: 8, KEY_EVENT_CLICK: 1, KEY_EVENT_PRESS: 2, KEY_EVENT_RELEASE: 3, KEY_EVENT_LONG_PRESS: 4, GESTURE_RIGHT: 4 },
  storage: { localStorage: { getItem(k, d) { return store[k] ?? d }, setItem(k, v) { store[k] = v } } },
  utils: { px: (v) => v },
  settings: { getLanguage: () => Number(process.env.LANG_ZEPP || 20) }, // 20 = pt-BR · 2 = inglês
  app: { getPackageInfo: () => ({ version: { name: '1.2.0' } }) },
  display: { setPageBrightTime: () => 0, resetPageBrightTime: () => 0 },
  fs: { writeFileSync: () => {} },
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'capt-'))
for (const [m, obj] of Object.entries(globalThis.__zos)) fs.writeFileSync(path.join(tmp, 'zos_' + m + '.mjs'), Object.keys(obj).map((n) => `export const ${n} = globalThis.__zos.${m}.${n}`).join('\n'))
fs.writeFileSync(path.join(tmp, 'zml.mjs'), 'export const BasePage = (o) => o')
fs.copyFileSync(new URL('../shared/cetesb.js', import.meta.url), path.join(tmp, 'cetesb.mjs'))
fs.writeFileSync(path.join(tmp, 'i18n.mjs'), fs.readFileSync(new URL('../page/i18n.js', import.meta.url), 'utf8').replace("from '@zos/settings'", "from './zos_settings.mjs'"))
let src = fs.readFileSync(new URL('../page/index/index.page.js', import.meta.url), 'utf8')
src = src.replace(/from '@zos\/(\w+)'/g, "from './zos_$1.mjs'").replace("from '@zeppos/zml/base-page'", "from './zml.mjs'").replace("from '../../shared/cetesb'", "from './cetesb.mjs'").replace("from '../i18n'", "from './i18n.mjs'")
fs.writeFileSync(path.join(tmp, 'page.mjs'), src)
// "Agora" do app = 14/11/2026 12:00 (datas não ficam amarelas por causa do relógio da máquina)
const agora = ms('2026-11-14') + 12 * 3600e3
Date.now = () => agora
let page; globalThis.Page = (o) => { page = o }
await import(path.join(tmp, 'page.mjs'))
page.request = async (q) => ({ ok: true, payload: payloads[q.params.rep] })
page.error = () => {}
const tick = () => new Promise((r) => setTimeout(r, 5))
const dump = () => widgets.filter((w) => w.vivo && w.opts.visible !== false).map((w) => ({ type: w.type, ...Object.fromEntries(Object.entries(w.opts).filter(([k]) => k !== 'visible')) }))
const out = {}
for (const id of ['CANT', 'BILL', 'RGDE', 'GUAR']) store['balne_payload_' + id] = JSON.stringify(payloads[id]) // caches → placar na lista
store.balne_represa = 'GUAR'
page.onInit(); page.build(); await tick()
out.GUAR = dump()
page.state.ui.titulo.ev.up(); await tick()
out.lista = dump()
page.fecharLista(); await tick()
for (const id of ['RGDE', 'CANT', 'BILL']) { page.selecionar(id); await tick(); out[id] = dump() }
page.selecionar('GUAR'); await tick()
page.abrirQR(); await tick(); out.qr = dump()
fs.writeFileSync(process.argv[2], JSON.stringify(out))
console.log('ok', Object.keys(out).map((k) => k + ':' + out[k].length).join(' '))
