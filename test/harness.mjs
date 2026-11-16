// node test/harness.mjs — testa shared/cetesb.js e a página com mocks de @zos/* (sem relógio, sem esbuild).
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { REPRESAS, montarPayload, urlConsulta, nomeCurto } from '../shared/cetesb.js'
import { respostaPara } from './fixture.mjs'

const url = urlConsulta('CANT')
console.log('url CANT where:', decodeURIComponent(url.split('where=')[1]))
console.log('nome curto de ponto novo:', nomeCurto({ pto_cetesb: 'XXXX 09999', praia: 'Prainha do Bairro Muito Comprido Exemplo' }))

// Payload de cada represa (+ histórico: 2 relatórios do GUAR)
const payloads = {}
for (const r of REPRESAS) {
  let hist = null
  if (r.id === 'GUAR') hist = montarPayload('GUAR', respostaPara(urlConsulta('GUAR'), { drelatorio: Date.parse('2026-10-23T00:00:00-03:00'), agrup_classific: 'Própria' }), null).hist
  const { payload } = montarPayload(r.id, respostaPara(urlConsulta(r.id)), hist)
  payloads[r.id] = payload
  const c = payload.pts
  console.log(`${r.id.padEnd(4)} ${payload.nome.padEnd(12)} ${c.filter((p) => p.k === 'P').length}/${c.length} fr=${payload.fr} rel=${payload.d} | ${c.map((p) => p.c).join(', ')}`)
}
try { montarPayload('GUAR', { error: { message: 'Invalid query' } }) } catch (e) { console.log('erro tratado:', e.message) }

// ── Mocks @zos/* ──────────────────────────────────────────────────
const widgets = []
const mk = (type, opts) => { const w = { type, opts: { ...opts, visible: true }, ev: {}, vivo: true, setProperty(k, v) { if (k === 'MORE') Object.assign(this.opts, v); else this.opts[k] = v }, addEventListener(e, f) { this.ev[e] = f } }; widgets.push(w); return w }
const store = {}
const files = {}
let keyCb = null
globalThis.__zos = {
  ui: { createWidget: mk, deleteWidget: (w) => { w.vivo = false; return true }, widget: { TEXT: 'TEXT', ARC: 'ARC', FILL_RECT: 'FILL_RECT', IMG: 'IMG' }, prop: { TEXT: 'text', COLOR: 'color', MORE: 'MORE', VISIBLE: 'visible' }, align: { CENTER_H: 'c', LEFT: 'l', RIGHT: 'r', CENTER_V: 'v' }, text_style: { NONE: 0 }, event: { CLICK_UP: 'up' } },
  page: { setScrollMode: (o) => { globalThis.__scroll = o; globalThis.__lock = false }, setScrollLock: (o) => { globalThis.__lock = o.lock }, getSwiperIndex: () => 1, SCROLL_MODE_SWIPER: 'swiper' },
  interaction: { onKey: (o) => { keyCb = o.callback }, offKey: () => {}, onGesture: () => {}, offGesture: () => {}, KEY_SELECT: 13, KEY_UP: 38, KEY_DOWN: 40, KEY_HOME: 36, KEY_SHORTCUT: 1, KEY_BACK: 8, KEY_EVENT_CLICK: 1, KEY_EVENT_PRESS: 2, KEY_EVENT_RELEASE: 3, KEY_EVENT_LONG_PRESS: 4, GESTURE_RIGHT: 4 },
  storage: { localStorage: { getItem(k, d) { if (typeof d !== 'string') throw new Error('default precisa ser string'); return store[k] ?? d }, setItem(k, v) { if (typeof v !== 'string') throw new Error('valor precisa ser string'); store[k] = v } } },
  utils: { px: (v) => v },
  settings: { getLanguage: () => Number(process.env.LANG_ZEPP || 20) }, // 20 = pt-BR · 2 = inglês
  app: { getPackageInfo: () => ({ version: { name: '1.2.0' } }) },
  display: { setPageBrightTime: () => 0, resetPageBrightTime: () => 0 },
  fs: { writeFileSync: (o) => { files[o.path] = o.data } },
}
// Reescreve os imports da página para módulos em memória (exportam todas as chaves do mock)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'balne-'))
for (const [m, obj] of Object.entries(globalThis.__zos)) fs.writeFileSync(path.join(tmp, 'zos_' + m + '.mjs'), Object.keys(obj).map((n) => `export const ${n} = globalThis.__zos.${m}.${n}`).join('\n'))
fs.writeFileSync(path.join(tmp, 'zml.mjs'), 'export const BasePage = (o) => o')
fs.copyFileSync(new URL('../shared/cetesb.js', import.meta.url), path.join(tmp, 'cetesb.mjs'))
fs.writeFileSync(path.join(tmp, 'i18n.mjs'), fs.readFileSync(new URL('../page/i18n.js', import.meta.url), 'utf8').replace("from '@zos/settings'", "from './zos_settings.mjs'"))
let src = fs.readFileSync(new URL('../page/index/index.page.js', import.meta.url), 'utf8')
src = src.replace(/from '@zos\/(\w+)'/g, "from './zos_$1.mjs'").replace("from '@zeppos/zml/base-page'", "from './zml.mjs'").replace("from '../../shared/cetesb'", "from './cetesb.mjs'").replace("from '../i18n'", "from './i18n.mjs'")
if (/from '@/.test(src)) throw new Error('import não mapeado')
fs.writeFileSync(path.join(tmp, 'page.mjs'), src)
let page; globalThis.Page = (o) => { page = o }
await import(path.join(tmp, 'page.mjs'))

let offline = false
const pedidos = []
page.request = async (q) => { pedidos.push(q.params.rep); return offline ? { ok: false, error: 'HTTP 503' } : { ok: true, payload: payloads[q.params.rep] } }
page.error = () => {}
const tick = () => new Promise((r) => setTimeout(r, 5))
const vis = (w) => w.vivo && w.opts.visible !== false
const tela = (n) => widgets.filter((w) => w.type === 'TEXT' && vis(w) && w.opts.y >= n * 480 && w.opts.y < (n + 1) * 480 && w.opts.text).map((w) => String(w.opts.text).replace('\n', ' ')).join(' | ')
const telas = (t) => { console.log(`\n[${t}] pediu ${pedidos.join(',')} | anel ${widgets.filter((w) => w.type === 'ARC' && vis(w)).length} seg.`); for (let n = 0; n < 5; n++) console.log(` tela ${n + 1}:`, tela(n)) }
const coroa = (k) => keyCb(k, 1)

page.onInit(); page.build(); await tick()
console.log('\nonKey registrado no onInit:', typeof keyCb === 'function')
telas('abre (padrão GUAR)')
console.log('ponte:', files['balne.json'])

// Clique da coroa na tela 1 → lista; giro → cursor; clique → escolhe
coroa(13); await tick()
const linhasLista = () => page.state.ui.lista.filter((w) => w.type === 'TEXT' && vis(w)).map((w) => w.opts.text)
console.log('\n[lista] travado:', globalThis.__lock, '| crown_enable:', globalThis.__scroll.options.modeParams.crown_enable, '|', linhasLista().join(' · '))
coroa(38); coroa(38) // dedupe de giro de 35 ms: só o 1º anda
await new Promise((r) => setTimeout(r, 40)); coroa(38)
console.log('cursor após 3 giros ↑ (2 valem, sentido invertido):', REPRESAS[page.state.cursor].nome)
await new Promise((r) => setTimeout(r, 850)); coroa(13); await tick()
console.log('lista apagada:', page.state.ui.lista === null, '| salvo:', store.balne_represa, '| destravado:', globalThis.__lock === false, '| crown_enable:', globalThis.__scroll.options.modeParams.crown_enable)
telas('escolheu pela coroa')
console.log('ponte continua GUAR:', JSON.parse(files['balne.json']).s)

// Toque no nome → Cantareira (4 pontos mensais) e Billings (1 ponto)
for (const id of ['CANT', 'BILL']) {
  await new Promise((r) => setTimeout(r, 850))
  page.state.ui.titulo.ev.up(); await tick()
  page.state.ui.lista.find((w) => w.type === 'TEXT' && w.opts.text === REPRESAS.find((r) => r.id === id).nome).ev.up(); await tick()
  telas('toque → ' + id)
}

// Lista mostra o placar salvo de cada represa
await new Promise((r) => setTimeout(r, 850))
page.state.ui.titulo.ev.up(); await tick()
console.log('\n[lista com caches]', linhasLista().join(' · '))
await new Promise((r) => setTimeout(r, 850)); coroa(8); await tick() // voltar fecha sem trocar
console.log('voltar fechou sem trocar:', page.state.ui.lista === null, page.state.rep)

// Offline com cache
offline = true
page.atualizar(); await tick()
console.log('offline:', tela(0).split(' | ').pop())

// ── Bug v1.1.0: clique da coroa chegando em dobro ──
offline = false
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
await espera(850)
const t0 = page.state.rep
keyCb(13, 1); await espera(120); keyCb(13, 3); await espera(500); keyCb(13, 1); await tick()
console.log('\n[clique duplo 1+3 e 1 após 620 ms] lista continua aberta:', !!page.state.ui.lista, '| represa:', page.state.rep === t0 ? 'mesma' : 'TROCOU')
coroa(40); await espera(850)
const alvo = REPRESAS[page.state.cursor].id
keyCb(13, 1); await espera(300); keyCb(13, 1); await tick()
console.log('[confirma + 2º sinal 300 ms] lista fechada:', page.state.ui.lista === null, '| escolheu:', page.state.rep, '(cursor era', alvo + ')')
await espera(850); keyCb(13, 1); await tick()
console.log('[clique normal depois de 850 ms] abre de novo:', !!page.state.ui.lista)
await espera(850); keyCb(8, 1); await tick()

// ── About (tela 5) e QR ──
console.log('\n[about] telas:', globalThis.__scroll.options.count, '| imagens:', widgets.filter((w) => w.type === 'IMG' && vis(w)).map((w) => w.opts.src + '@' + w.opts.y).join(', '))
const areaQR = widgets.find((w) => w.type === 'TEXT' && w.opts.text === '' && w.opts.y === 1920 + 340)
areaQR.ev.up(); await tick()
console.log('toque no apoio abre QR:', !!page.state.qr, '|', widgets.filter((w) => w.type === 'IMG' && vis(w)).map((w) => w.opts.src).join(', '))
page.state.qr[2].ev.up(); await tick()
console.log('toque fecha QR:', page.state.qr === null, '| qr.png apagado:', !widgets.some((w) => w.opts.src === 'qr.png' && vis(w)))

// Giro fora da lista é do sistema (troca de tela)
console.log('giro fora da lista devolve:', keyCb(40, 1))
console.log('erros na tela:', widgets.filter((w) => vis(w) && String(w.opts.text).startsWith('ERRO')).length)
