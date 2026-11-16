import { BasePage } from '@zeppos/zml/base-page'
// Só importações nomeadas que já rodaram no Balance (Mananciais SP v1.1.x).
// Nome importado que o firmware não exporta = página não carrega (tela preta).
// Funções mais novas vêm pelo namespace: se não existirem, ficam undefined e o código desvia.
import { createWidget, widget, prop, align, text_style, event } from '@zos/ui'
import * as zosUi from '@zos/ui'
import { setScrollMode, SCROLL_MODE_SWIPER } from '@zos/page'
import * as zosPage from '@zos/page'
import * as zosI from '@zos/interaction'
import * as zosApp from '@zos/app'
import { localStorage } from '@zos/storage'
import { setPageBrightTime, resetPageBrightTime } from '@zos/display'
import { writeFileSync } from '@zos/fs'
import { px } from '@zos/utils'
import { REPRESAS, REP_PADRAO, REP_PONTE, acharRepresa, MAX_PONTOS, HIST_MAX } from '../../shared/cetesb'
import { EN, t, dataCurta } from '../i18n'
const tr = t // dentro dos laços 'for (let t …)' o nome t é o índice

// ─── Design tokens ────────────────────────────────────────────────
const C = {
  bg: 0x000000,
  track: 0x1c2a2e,
  text: 0xe8f4f6,
  muted: 0x7a9aa3,
  propria: 0x4cd98a,
  impropria: 0xeb5757,
  nc: 0x55666b,
  atencao: 0xf2c94c,
  ciano: 0x12d0ff, // cor dos destaques da arte do about
  branco: 0xffffff,
}
const SCREEN = 480
const POR_TELA = 5
const TELAS_LISTA = Math.ceil(MAX_PONTOS / POR_TELA) // 2
const TELAS = 3 + TELAS_LISTA // resumo + listas + critério + about
const VERSAO_RESERVA = '1.2.1' // se getPackageInfo não existir no firmware
// About (arte da ArtBombs): assets/common.w480-r/about.png, about_en.png e qr.png, 480×480.
// Versão no topo e data do boletim na faixa verde são escritas pelo app.
const BRILHO_MS = 30000
const VELHO_DIAS = { S: 10, M: 40 } // semanal / mensal: passou disso = data em amarelo
const K_REP = 'balne_represa'
const K_CACHE = (r) => 'balne_payload_' + r
// Histórico na linha do nome: 4 quadradinhos à direita (sobra largura para nomes longos)
const HIST_VIS = 4
const HQ_PASSO = 11
const HQ_X = 404 - HIST_VIS * HQ_PASSO // 360
const NOME_W = HQ_X - 6 - 92 // 262
// Nome longo (ex.: Clube de Campo Castelo) usa fonte menor para caber antes do histórico
const tamNome = (n) => (n.length <= 15 ? 26 : n.length <= 19 ? 24 : 22)

// Ponte para mostradores (lida com openSync + appId, API 3). Só ASCII. Sempre a Guarapiranga.
const PONTE_ARQUIVO = 'balne.json'

// Anel: 0° = 3h, horário (ARC do Zepp OS). Primeiro segmento começa no topo (270°).
const ANEL_TOPO = 270
const ANEL_VAO = 4

// Coroa no Balance (validado no Mananciais SP, 05/11/2026): clique = 13, giro = 38/40, evento 1.
const COROA_SENTIDO = -1 // mesmo sentido escolhido no Mananciais SP
// v1.1.1: no Balance o clique da coroa chegou em dobro (abria e fechava o menu na hora).
// Agora: só o evento CLICK (1) conta, RELEASE é ignorado, e depois de abrir/fechar a lista
// qualquer clique da coroa nos próximos 800 ms é descartado.
const CLIQUE_DEDUP_MS = 800
// Diagnóstico: linha na tela 1 com os últimos eventos crus (tecla/evento +ms). Ligar se o bug voltar.
const DEBUG_BOTOES = false
const GIRO_DEDUP_MS = 35

function versao() {
  try {
    const info = typeof zosApp.getPackageInfo === 'function' ? zosApp.getPackageInfo() : null
    if (info && info.version && info.version.name) return info.version.name
  } catch (e) {}
  return VERSAO_RESERVA
}
// Área de toque invisível (TEXT vazio é transparente e aceita eventos — validado no Mananciais SP)
function area(x, y, w, h, fn) {
  const a = createWidget(widget.TEXT, { x: px(x), y: px(y), w: px(w), h: px(h), text: '' })
  a.addEventListener(event.CLICK_UP, fn)
  return a
}

const cor = (k) => (k === 'P' ? C.propria : k === 'I' ? C.impropria : C.nc)
const rotulo = (k) => (k === 'P' ? t('propria') : k === 'I' ? t('impropria') : t('naoClass'))
const ddmm = dataCurta // "13/11" em PT, "Nov 13" em EN
const maiusc = (s) => String(s || '').toUpperCase()
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const num = (v) => (typeof v === 'number' ? v : Number(v))
function diasDesde(iso) {
  if (!iso) return 999
  const t = Date.parse(iso + 'T00:00:00-03:00')
  return isFinite(t) ? Math.floor((Date.now() - t) / 864e5) : 999
}
const contar = (d) => {
  const pts = (d && d.pts) || []
  return { n: pts.length, p: pts.filter((x) => x.k === 'P').length, i: pts.filter((x) => x.k === 'I').length }
}

function lerJSON(k) {
  try {
    const s = localStorage.getItem(k, '')
    return s ? JSON.parse(s) : null
  } catch (e) {
    return null
  }
}
function gravarJSON(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch (e) {}
}

function text(y0, o) {
  return createWidget(widget.TEXT, {
    x: px(o.x ?? 40),
    y: px(y0 + o.y),
    w: px(o.w ?? SCREEN - 80),
    h: px(o.h ?? 40),
    text: o.text ?? '',
    text_size: px(o.size ?? 24),
    color: o.color ?? C.text,
    align_h: o.align ?? align.CENTER_H,
    align_v: align.CENTER_V,
    text_style: text_style.NONE,
  })
}
function rect(x, y, w, h, color, radius = 0) {
  return createWidget(widget.FILL_RECT, { x: px(x), y: px(y), w: px(w), h: px(Math.max(1, h)), color, radius: px(radius) })
}
function setRect(wd, x, y, w, h, color, radius = 0) {
  wd.setProperty(prop.MORE, { x: px(x), y: px(y), w: px(w), h: px(Math.max(1, h)), color, radius: px(radius) })
}
const mostrar = (w, v) => {
  try {
    w.setProperty(prop.VISIBLE, v)
  } catch (e) {}
}
function chamar(fn, ...args) {
  try {
    if (typeof fn === 'function') return fn(...args)
  } catch (e) {}
  return undefined
}
function apagar(w) {
  try {
    if (typeof zosUi.deleteWidget === 'function') return zosUi.deleteWidget(w)
  } catch (e) {}
  mostrar(w, false)
  try {
    w.setProperty(prop.MORE, { x: px(-1000), y: px(-1000), w: px(1), h: px(1) })
  } catch (e) {}
}
function travarRolagem(lock) {
  try {
    if (typeof zosPage.setScrollLock === 'function') zosPage.setScrollLock({ lock })
  } catch (e) {}
}

function gravarPonte(d) {
  if ((d.rep || d.sist) !== REP_PONTE) return
  try {
    const c = contar(d)
    writeFileSync({
      path: PONTE_ARQUIVO,
      data: JSON.stringify({ f: 1, s: 'GUAR', d: d.d, p: c.p, n: c.n, ts: d.ts }),
      options: { encoding: 'utf8' },
    })
  } catch (e) {}
}

// Página atual (0 = resumo), pelo on_page do swiper; reserva: getSwiperIndex (veio 1-based no Balance)
let paginaOnPage = null
function naPrimeiraTela() {
  if (typeof paginaOnPage === 'number') return paginaOnPage === 0
  const i = chamar(zosPage.getSwiperIndex)
  return typeof i !== 'number' || i <= 1
}

Page(
  BasePage({
    state: { ui: {}, rep: REP_PADRAO, cache: null, listaAberta: false },

    onInit() {
      try {
        setPageBrightTime({ brightTime: BRILHO_MS })
      } catch (e) {}
      try {
        const salvo = localStorage.getItem(K_REP, '')
        this.state.rep = REPRESAS.some((r) => r.id === salvo) ? salvo : REP_PADRAO
      } catch (e) {
        this.state.rep = REP_PADRAO
      }
      this.state.cache = lerJSON(K_CACHE(this.state.rep))
      // Teclas registradas no onInit (no build, nenhum evento chegava — Mananciais SP v1.1.4)
      this.ligarBotoes()
    },

    mostrarErro(onde, e) {
      try {
        this.error(onde, e)
      } catch (x) {}
      try {
        createWidget(widget.TEXT, {
          x: px(50), y: px(170), w: px(380), h: px(160),
          text: 'ERRO em ' + onde + ':\n' + String((e && e.message) || e).slice(0, 120),
          text_size: px(22), color: C.impropria,
          align_h: align.CENTER_H, align_v: align.CENTER_V,
          text_style: text_style.WRAP === undefined ? text_style.NONE : text_style.WRAP,
        })
      } catch (x) {}
    },

    build() {
      try {
        this.montarTelas()
      } catch (e) {
        this.mostrarErro('build', e)
        return
      }
      try {
        if (this.state.cache) this.render(this.state.cache, t('salvo'))
      } catch (e) {
        this.mostrarErro('render (cache)', e)
      }
      this.atualizar()
    },

    onDestroy() {
      try {
        resetPageBrightTime()
      } catch (e) {}
      chamar(zosI.offKey)
      chamar(zosI.offGesture)
    },

    // ─── Coroa / botões ───────────────────────────────────────────
    ligarBotoes() {
      chamar(zosI.onKey, {
        callback: (a, b) => {
          const key = a && typeof a === 'object' ? num(a.key) : num(a)
          const ev = a && typeof a === 'object' ? num(a.event ?? a.keyEvent ?? a.type) : num(b)
          const r = this.tecla(key, ev)
          this.diag(key, ev, r)
          return r
        },
      })
    },

    diag(key, ev, r) {
      if (!DEBUG_BOTOES) return
      const agora = Date.now()
      const d = (this.state.dbg = this.state.dbg || [])
      d.push(key + '/' + ev + (r ? '✓' : '') + ' +' + (this.state.dbgT ? agora - this.state.dbgT : 0))
      this.state.dbgT = agora
      if (d.length > 4) d.shift()
      try {
        if (this.state.ui.dbg) this.state.ui.dbg.setProperty(prop.TEXT, d.join('  '))
      } catch (e) {}
    },

    tecla(key, ev) {
      if (this.state.qr && (key === 13 || key === zosI.KEY_SELECT || key === zosI.KEY_HOME || key === zosI.KEY_SHORTCUT || key === zosI.KEY_BACK)) {
        if ((ev === zosI.KEY_EVENT_CLICK || ev === 1) && Date.now() - (this.state.ultimoClique || 0) >= CLIQUE_DEDUP_MS) this.fecharQR()
        return true
      }
      const naLista = this.state.listaAberta
      const ehSelect = key === zosI.KEY_SELECT || key === 13 || key === zosI.KEY_HOME
      const ehCima = key === zosI.KEY_UP || key === 38
      const ehBaixo = key === zosI.KEY_DOWN || key === 40
      const ehClique = ev === zosI.KEY_EVENT_CLICK || ev === 1
      const cliqueNovo = () => {
        const agora = Date.now()
        if (agora - (this.state.ultimoClique || 0) < CLIQUE_DEDUP_MS) return false
        this.state.ultimoClique = agora
        return true
      }

      // Giro: com a lista aberta move o cursor; fora dela, o sistema troca de tela.
      if (ehCima || ehBaixo) {
        if (!naLista) return false
        if (ev === zosI.KEY_EVENT_CLICK || ev === 1) {
          const agora = Date.now()
          if (agora - (this.state.ultimoGiro || 0) >= GIRO_DEDUP_MS) {
            this.state.ultimoGiro = agora
            this.moverCursor((ehBaixo ? 1 : -1) * COROA_SENTIDO)
          }
        }
        return true
      }

      if (ehSelect) {
        if (!naLista && !naPrimeiraTela()) return false
        if (ev === zosI.KEY_EVENT_PRESS) {
          this.state.pressaoLonga = false
          return true
        }
        if (ev === zosI.KEY_EVENT_LONG_PRESS) {
          this.state.pressaoLonga = true
          return false // segurar continua sendo do sistema
        }
        if (ehClique) {
          if (this.state.pressaoLonga) return false
          if (cliqueNovo()) {
            if (naLista) this.confirmarCursor()
            else this.abrirLista()
          }
          return true
        }
        return true // RELEASE e outros sinais do mesmo clique: consumidos sem ação
      }

      // Botão de baixo (ou voltar) fecha a lista sem trocar
      if (naLista && (key === zosI.KEY_SHORTCUT || key === zosI.KEY_BACK)) {
        if (ehClique && cliqueNovo()) this.fecharLista()
        return true
      }
      return false
    },

    // coroaDoSistema = false entrega o giro ao app (com a lista aberta)
    swiper(coroaDoSistema = true) {
      setScrollMode({
        mode: SCROLL_MODE_SWIPER,
        options: {
          height: px(SCREEN),
          count: TELAS,
          modeParams: {
            crown_enable: coroaDoSistema,
            on_page: (i) => {
              paginaOnPage = num(i)
            },
          },
        },
      })
    },

    montarTelas() {
      this.swiper()
      const ui = this.state.ui

      // ── Tela 1 · Resumo ─────────────────────────────────────────
      ui.anel = []
      for (let i = 0; i < MAX_PONTOS; i++) {
        ui.anel.push(
          createWidget(widget.ARC, {
            x: px(40), y: px(40), w: px(400), h: px(400),
            start_angle: ANEL_TOPO, end_angle: ANEL_TOPO + 1,
            color: C.track, line_width: px(22),
          }),
        )
      }
      // Nome da represa: toque (ou clique da coroa) abre a lista de represas
      ui.titulo = text(0, { x: 90, w: 300, y: 104, h: 36, text: maiusc(acharRepresa(this.state.rep).nome), size: 24, color: C.muted })
      ui.tituloTraco = rect(222, 140, 36, 3, C.muted, 2)
      ui.titulo.addEventListener(event.CLICK_UP, () => this.abrirLista())
      ui.placar = text(0, { y: 148, h: 110, text: '--', size: 96 })
      ui.placarLbl = text(0, { y: 256, h: 36, text: t('paraBanhoN'), size: 26, color: C.muted })
      ui.impr = text(0, { y: 300, h: 36, text: '', size: 26, color: C.impropria })
      ui.status = text(0, { y: 338, h: 30, text: t('atualizando'), size: 20, color: C.muted })
      if (DEBUG_BOTOES) ui.dbg = text(0, { x: 90, w: 300, y: 372, h: 26, text: '', size: 16, color: C.atencao })

      // ── Telas 2 e 3 · Pontos ────────────────────────────────────
      ui.linhas = []
      for (let t = 0; t < TELAS_LISTA; t++) {
        const y0 = SCREEN * (1 + t)
        ui['cab' + t] = text(y0, { y: 44, h: 34, text: tr('pontos'), size: 22, color: C.muted })
        for (let i = 0; i < POR_TELA; i++) {
          const y = 92 + i * 66
          const ln = {
            y0,
            y,
            dot: rect(68, y0 + y + 12, 14, 14, C.track, 7),
            nome: text(y0, { x: 92, w: NOME_W, y, h: 36, text: '', size: 26, align: align.LEFT }),
            sub: text(y0, { x: 92, w: 300, y: y + 32, h: 26, text: '', size: 18, color: C.muted, align: align.LEFT }),
            hist: [],
          }
          // Histórico: HIST_VIS quadradinhos à direita do nome (o mais recente na ponta). Guardados: HIST_MAX.
          for (let h = 0; h < HIST_VIS; h++) ln.hist.push(rect(HQ_X + h * HQ_PASSO, y0 + y + 14, 8, 8, C.bg, 2))
          ui.linhas.push(ln)
        }
      }
      // Represa com até 5 pontos: a tela 3 fica com este aviso
      ui.vazio = text(SCREEN * 2, { y: 200, h: 80, text: '', size: 22, color: C.muted })

      // ── Tela 4 · Sobre ──────────────────────────────────────────
      const y4 = SCREEN * (1 + TELAS_LISTA)
      text(y4, { y: 52, h: 34, text: t('criterio'), size: 22, color: C.muted })
      text(y4, { y: 96, h: 34, text: t('PROPRIA'), size: 26, color: C.propria })
      text(y4, { y: 130, h: 30, text: t('crit1'), size: 22 })
      text(y4, { y: 158, h: 30, text: t('crit2'), size: 22, color: C.muted })
      text(y4, { y: 200, h: 34, text: t('IMPROPRIA'), size: 26, color: C.impropria })
      text(y4, { y: 234, h: 30, text: t('crit3'), size: 22 })
      text(y4, { y: 262, h: 30, text: t('crit4'), size: 22, color: C.muted })
      ui.periodo = text(y4, { y: 314, h: 30, text: '', size: 20, color: C.muted })
      ui.fonte = text(y4, { y: 350, h: 28, text: t('fonte').replace(' · ', ''), size: 20, color: C.muted })
      text(y4, { y: 400, h: 28, text: 'ArtBombs', size: 18, color: C.nc })

      // ── Tela 5 · About ──────────────────────────────────────────
      const y5 = SCREEN * (2 + TELAS_LISTA)
      this.state.y5 = y5
      createWidget(widget.IMG, { x: 0, y: px(y5), w: px(SCREEN), h: px(SCREEN), src: EN ? 'about_en.png' : 'about.png' })
      text(y5, { x: 140, w: 200, y: 26, h: 32, text: 'v' + versao(), size: 20, color: C.ciano })
      ui.boletim = text(y5, { y: 281, h: 38, text: '', size: 20, color: C.branco })
      // "Apoie o projeto" + LivePix + mini QR → QR em tela cheia
      area(132, y5 + 340, 216, 80, () => this.abrirQR())
    },

    // ─── Lista de represas (camada criada ao abrir, apagada ao fechar) ───
    abrirLista() {
      if (this.state.listaAberta) return
      this.state.listaAberta = true
      this.state.ultimoClique = Date.now() // segundo sinal do mesmo clique não confirma o cursor
      chamar(() => this.swiper(false))
      travarRolagem(true)
      try {
        const L = (this.state.ui.lista = [])
        const linhas = (this.state.ui.listaLinhas = [])
        const add = (w) => (L.push(w), w)
        const yLinha = (i) => 140 + i * 52
        this.state.cursor = Math.max(0, REPRESAS.findIndex((r) => r.id === this.state.rep))

        const fundo = add(rect(0, 0, SCREEN, SCREEN, C.bg, 0))
        fundo.addEventListener(event.CLICK_UP, () => {}) // bloqueia toques nas telas por baixo
        const tit = add(text(0, { x: 140, w: 200, y: 82, h: 36, text: t('represas'), size: 22, color: C.muted }))
        tit.addEventListener(event.CLICK_UP, () => this.fecharLista())

        // áreas de toque → cursor → marcador e textos (cursor visível entre as áreas e os textos)
        REPRESAS.forEach((r, i) => {
          add(rect(72, yLinha(i) + 2, 336, 46, C.bg, 23)).addEventListener(event.CLICK_UP, () => this.selecionar(r.id))
        })
        this.state.ui.cursor = add(rect(72, yLinha(this.state.cursor) + 2, 336, 46, C.track, 23))
        this.state.ui.cursor.addEventListener(event.CLICK_UP, () => this.confirmarCursor())

        REPRESAS.forEach((r, i) => {
          const y = yLinha(i)
          const c = contar(lerJSON(K_CACHE(r.id)))
          const escolher = () => this.selecionar(r.id)
          if (r.id === this.state.rep) add(rect(82, y + 22, 6, 6, C.propria, 3))
          const nome = add(text(0, { x: 96, w: 200, y, h: 50, text: r.nome, size: 24, color: C.muted, align: align.LEFT }))
          const val = add(
            text(0, {
              x: 290, w: 100, y, h: 50, size: 24, align: align.RIGHT,
              text: c.n ? c.p + '/' + c.n : '--',
              color: !c.n ? C.muted : c.p === c.n ? C.propria : c.p === 0 ? C.impropria : C.text,
            }),
          )
          ;[nome, val].forEach((w) => w.addEventListener(event.CLICK_UP, escolher))
          linhas.push({ y, nome })
        })
        this.pintarCursor()

        // Deslizar para a direita (voltar) fecha a lista em vez de sair do app
        chamar(zosI.onGesture, {
          callback: (ev) => {
            if (ev === zosI.GESTURE_RIGHT && this.state.listaAberta) {
              this.fecharLista()
              return true
            }
            return false
          },
        })
      } catch (e) {
        this.fecharLista()
        this.mostrarErro('lista', e)
      }
    },

    moverCursor(dir) {
      const novo = clamp(this.state.cursor + dir, 0, REPRESAS.length - 1)
      if (novo === this.state.cursor) return
      this.state.cursor = novo
      this.pintarCursor()
    },

    pintarCursor() {
      const ui = this.state.ui
      const linhas = ui.listaLinhas || []
      const ln = linhas[this.state.cursor]
      if (!ln || !ui.cursor) return
      setRect(ui.cursor, 72, ln.y + 2, 336, 46, C.track, 23)
      linhas.forEach((l, i) => l.nome.setProperty(prop.COLOR, i === this.state.cursor ? C.text : C.muted))
    },

    confirmarCursor() {
      const r = REPRESAS[this.state.cursor]
      if (r) this.selecionar(r.id)
      else this.fecharLista()
    },

    fecharLista() {
      if (!this.state.listaAberta) return
      this.state.listaAberta = false
      this.state.ultimoClique = Date.now() // segundo sinal do mesmo clique não reabre a lista
      chamar(zosI.offGesture)
      const L = this.state.ui.lista || []
      this.state.ui.lista = null
      this.state.ui.listaLinhas = null
      this.state.ui.cursor = null
      L.forEach(apagar)
      travarRolagem(false)
      this.swiper() // destravar volta para rolagem livre → reaplica o swiper
    },

    selecionar(id) {
      this.fecharLista()
      if (id === this.state.rep) return
      this.state.rep = id
      try {
        localStorage.setItem(K_REP, String(id))
      } catch (e) {}
      try {
        this.state.ui.titulo.setProperty(prop.TEXT, maiusc(acharRepresa(id).nome))
        this.state.cache = lerJSON(K_CACHE(id))
        if (this.state.cache) this.render(this.state.cache, t('salvo'))
        else this.limpar()
      } catch (e) {
        this.mostrarErro('trocar represa', e)
      }
      this.atualizar()
    },

    limpar() {
      this.render({ rep: this.state.rep, pts: [] }, '')
      this.state.ui.status.setProperty(prop.TEXT, t('atualizando'))
      this.state.ui.status.setProperty(prop.COLOR, C.muted)
    },

    // ─── QR do apoio (camada sobre a tela 5; toque em qualquer lugar fecha) ───
    abrirQR() {
      if (this.state.qr) return
      const y5 = this.state.y5
      const L = []
      L.push(rect(0, y5, SCREEN, SCREEN, C.bg, 0))
      L.push(createWidget(widget.IMG, { x: 0, y: px(y5), w: px(SCREEN), h: px(SCREEN), src: 'qr.png' }))
      L.push(area(0, y5, SCREEN, SCREEN, () => this.fecharQR()))
      this.state.qr = L
      this.state.ultimoClique = Date.now()
    },

    fecharQR() {
      ;(this.state.qr || []).forEach(apagar)
      this.state.qr = null
    },

    // ─── Dados ────────────────────────────────────────────────────
    atualizar() {
      const pedido = this.state.rep
      this.request({ method: 'balne.get', params: { rep: pedido, sist: pedido } })
        .then((r) => {
          if (!r || !r.ok) throw new Error((r && r.error) || 'sem dados')
          const p = r.payload
          const id = p.rep || p.sist || pedido
          gravarJSON(K_CACHE(id), p)
          gravarPonte(p)
          if (id !== this.state.rep) return // trocou de represa no meio da busca
          this.state.cache = p
          try {
            this.render(p, r.stale ? t('offline') : '')
          } catch (e) {
            this.mostrarErro('render', e)
          }
        })
        .catch((e) => {
          try {
            this.error('request:', e)
          } catch (x) {}
          if (pedido !== this.state.rep) return
          const c = this.state.cache
          const msg = String((e && e.message) || e || '')
          const ui = this.state.ui
          if (ui.status) ui.status.setProperty(prop.TEXT, c ? t('offline') + ' · CETESB ' + ddmm(c.d) : t('semConexao') + (msg ? ' · ' + msg.slice(0, 14) : ''))
        })
    },

    render(d, origem) {
      const ui = this.state.ui
      if (!d || !ui.placar) return
      const pts = (d.pts || []).slice(0, MAX_PONTOS)
      const { n, p: prop_, i: impr } = contar({ pts })

      // Tela 1 — anel com um segmento por ponto (mesma ordem da lista)
      const passo = n ? 360 / n : 360
      ui.anel.forEach((w, i) => {
        if (i >= n) return mostrar(w, false)
        mostrar(w, true)
        const ini = (ANEL_TOPO + i * passo + (n > 1 ? ANEL_VAO / 2 : 0)) % 360
        w.setProperty(prop.MORE, {
          x: px(40), y: px(40), w: px(400), h: px(400),
          start_angle: ini, end_angle: ini + Math.max(1, passo - (n > 1 ? ANEL_VAO : 0)),
          color: cor(pts[i].k), line_width: px(22),
        })
      })
      ui.titulo.setProperty(prop.TEXT, maiusc(acharRepresa(d.rep || d.sist || this.state.rep).nome))
      ui.placar.setProperty(prop.TEXT, n ? prop_ + '/' + n : '--')
      ui.placar.setProperty(prop.COLOR, !n ? C.text : prop_ === n ? C.propria : prop_ === 0 ? C.impropria : C.text)
      ui.placarLbl.setProperty(prop.TEXT, n === 1 ? (prop_ ? t('paraBanho1') : t('paraBanho0')) : prop_ === 1 ? t('paraBanho1') : t('paraBanhoN'))
      ui.impr.setProperty(prop.TEXT, impr ? impr + (impr === 1 ? t('impr1') : t('imprN')) : n ? t('nenhumaImpr') : '')
      ui.impr.setProperty(prop.COLOR, impr ? C.impropria : C.propria)
      const fr = d.fr === 'M' ? 'M' : 'S'
      const velho = diasDesde(d.d) > VELHO_DIAS[fr]
      ui.status.setProperty(prop.TEXT, 'CETESB · ' + ddmm(d.d) + (fr === 'M' ? ' · ' + t('mensal') : '') + (origem ? ' · ' + origem : ''))
      ui.status.setProperty(prop.COLOR, velho ? C.atencao : C.muted)

      // Telas 2 e 3 — linhas
      for (let t = 0; t < TELAS_LISTA; t++) {
        const a = t * POR_TELA + 1
        const b = Math.min(n, (t + 1) * POR_TELA)
        ui['cab' + t].setProperty(prop.TEXT, b < a ? '' : n === 1 ? tr('pontoUnico') : a === b ? tr('ponto') + ' ' + a + tr('de') + n : tr('pontos') + ' ' + a + '–' + b + tr('de') + n)
      }
      const vazio = n > 0 && n <= POR_TELA
      ui.vazio.setProperty(prop.TEXT, vazio ? t('so') + n + (n === 1 ? t('ponto1') : t('pontoN')) + '\n' + t('nestaRepresa') : '')
      mostrar(ui.vazio, vazio)
      ui.linhas.forEach((ln, i) => {
        const p = pts[i]
        const vis = !!p
        mostrar(ln.dot, vis)
        mostrar(ln.nome, vis)
        mostrar(ln.sub, vis)
        if (!vis) return ln.hist.forEach((q) => mostrar(q, false))
        setRect(ln.dot, 68, ln.y0 + ln.y + 12, 14, 14, cor(p.k), 7)
        ln.nome.setProperty(prop.TEXT, p.n)
        ln.nome.setProperty(prop.MORE, { text_size: px(tamNome(String(p.n || ''))) })
        const ref = p.b !== undefined ? p.b : p.m && p.m !== 'São Paulo' ? p.m : '' // cache antigo não tem b
        ln.sub.setProperty(prop.TEXT, rotulo(p.k) + (ref ? ' · ' + ref : ''))
        ln.sub.setProperty(prop.COLOR, cor(p.k))
        // histórico sem o relatório atual (o atual já é o ponto grande)
        const h = (p.h || []).slice(0, -1).slice(-HIST_VIS)
        const off = HIST_VIS - h.length
        ln.hist.forEach((q, j) => {
          const k = j >= off ? h[j - off] : null
          mostrar(q, k !== null)
          if (k !== null) setRect(q, HQ_X + j * HQ_PASSO, ln.y0 + ln.y + 14, 8, 8, cor(k), 2)
        })
      })

      // Tela 4
      ui.periodo.setProperty(prop.TEXT, d.ini && d.fim ? t('amostras') + ddmm(d.ini) + t('a') + ddmm(d.fim) : '')
      ui.fonte.setProperty(prop.TEXT, t('fonte') + (fr === 'M' ? t('mensal') : t('semanal')))
      ui.boletim.setProperty(prop.TEXT, d.d ? t('boletimDe') + ddmm(d.d) + ' · ' + (fr === 'M' ? t('mensal') : t('semanal')) : '')
    },
  }),
)
