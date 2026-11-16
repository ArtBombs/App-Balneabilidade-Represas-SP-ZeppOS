"""Desenha as telas do Balneabilidade (widgets gravados por test/capt.mjs) em PNG 480×480 redondo.
Base: tools/capturas.py do Mananciais SP. Fonte Inter no lugar da fonte do sistema (aproximação)."""
import json, sys, os, math
from PIL import Image, ImageDraw, ImageFont
S = 3
RAIZ, ENTRADA, SAIDA = sys.argv[1], sys.argv[2], sys.argv[3]
FONTE = '/usr/share/fonts/opentype/inter/Inter-Regular.otf'
cor = lambda c: '#%06x' % (c & 0xFFFFFF)
_fc = {}
def fonte(px):
    k = round(px * S * 0.94)
    if k not in _fc: _fc[k] = ImageFont.truetype(FONTE, k)
    return _fc[k]

def tela(widgets, y0):
    im = Image.new('RGBA', (480 * S, 480 * S), (0, 0, 0, 255))
    g = ImageDraw.Draw(im)
    for w in widgets:
        if not (y0 <= w.get('y', 0) < y0 + 480): continue
        x, y = w.get('x', 0) * S, (w['y'] - y0) * S
        t = w['type']
        if t == 'FILL_RECT':
            ww, hh = w['w'] * S, w['h'] * S
            r = min(w.get('radius', 0) * S, ww / 2, hh / 2)
            g.rounded_rectangle([x, y, x + ww - 1, y + hh - 1], r, fill=cor(w['color']))
        elif t == 'ARC':
            lw = w['line_width'] * S
            a0, a1 = w['start_angle'], w['end_angle']
            if a1 - a0 < 1: continue
            box = [x, y, x + w['w'] * S, y + w['h'] * S]
            cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
            rr = (box[2] - box[0]) / 2 - lw / 2
            # No relógio a ponta arredondada fica DENTRO do ângulo do arco (o vão entre segmentos
            # aparece). Encurta o arco meia espessura em cada ponta e desenha as pontas ali.
            cap = math.degrees((lw / 2) / rr)
            if a1 - a0 > 2 * cap:
                a0, a1 = a0 + cap, a1 - cap
            else:
                a0 = a1 = (a0 + a1) / 2
            if a1 > a0:
                g.arc(box, a0, a1, fill=cor(w['color']), width=int(lw))
            for a in (a0, a1):
                px_, py_ = cx + rr * math.cos(math.radians(a)), cy + rr * math.sin(math.radians(a))
                g.ellipse([px_ - lw / 2, py_ - lw / 2, px_ + lw / 2, py_ + lw / 2], fill=cor(w['color']))
        elif t == 'IMG':
            p = Image.open(os.path.join(RAIZ, w['src'])).convert('RGBA')
            p = p.resize((p.width * S, p.height * S), Image.LANCZOS)
            im.alpha_composite(p, (int(x), int(y)))
        elif t == 'TEXT' and w.get('text'):
            f = fonte(w['text_size'])
            ww, hh = w['w'] * S, w['h'] * S
            al = w.get('align_h', 'c')
            ax = {'l': x, 'r': x + ww}.get(al, x + ww / 2)
            linhas = str(w['text']).split('\n')
            lh = w['text_size'] * S * 1.25
            topo = y + hh / 2 - lh * (len(linhas) - 1) / 2
            for i, ln in enumerate(linhas):
                g.text((ax, topo + i * lh), ln, font=f, fill=cor(w['color']), anchor={'l': 'lm', 'r': 'rm'}.get(al, 'mm'))
    im = im.resize((480, 480), Image.LANCZOS)
    m = Image.new('L', (480 * S, 480 * S), 0)
    ImageDraw.Draw(m).ellipse([0, 0, 480 * S - 1, 480 * S - 1], fill=255)
    out = Image.new('RGBA', (480, 480), (0, 0, 0, 0))
    out.paste(im, mask=m.resize((480, 480), Image.LANCZOS))
    return out

d = json.load(open(ENTRADA))
os.makedirs(SAIDA, exist_ok=True)
loja = [
    ('01_guarapiranga_resumo', 'GUAR', 0), ('02_lista_represas', 'lista', 0),
    ('03_guarapiranga_pontos_1-5', 'GUAR', 1), ('04_guarapiranga_pontos_6-10', 'GUAR', 2),
    ('05_rio_grande_resumo', 'RGDE', 0), ('06_rio_grande_pontos', 'RGDE', 1),
    ('07_cantareira_pontos', 'CANT', 1), ('08_criterio', 'GUAR', 3), ('09_sobre', 'GUAR', 4),
]
LADO = int(sys.argv[4]) if len(sys.argv) > 4 else 480  # 360 = tamanho pedido pelo Zepp Console
for nome, est, k in loja:
    im = tela(d[est], k * 480)
    if LADO != 480: im = im.resize((LADO, LADO), Image.LANCZOS)
    im.save(os.path.join(SAIDA, nome + '.png'))
print('ok', SAIDA, len(loja))
