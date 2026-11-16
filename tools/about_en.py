"""Gera assets/common.w480-r/about_en.png a partir da arte da ArtBombs (about.png): apaga os textos
em português e escreve em inglês com Source Sans 3 (parente aberto da Myriad). O tamanho de cada
linha é calibrado pela largura do texto original. Base: tools/sobre_en.py do Mananciais SP.
Uso: python3 tools/about_en.py <pasta com source-sans-3-latin-*-normal.woff>"""
import sys
from PIL import Image, ImageDraw, ImageFont

FONTES = sys.argv[1]
SRC, DST = 'assets/common.w480-r/about.png', 'assets/common.w480-r/about_en.png'
F = lambda wt, s: ImageFont.truetype(f'{FONTES}/source-sans-3-latin-{wt}-normal.woff', s)
PRETO, FAIXA = (0, 0, 0, 255), (25, 71, 45, 255)
BRANCO, CIANO = (255, 255, 255, 255), (18, 208, 255, 255)

S = 4
base = Image.open(SRC).convert('RGBA')
big = base.resize((480 * S, 480 * S), Image.NEAREST)
d = ImageDraw.Draw(big)
R = lambda x0, y0, x1, y1, c: d.rectangle((x0 * S, y0 * S, x1 * S, y1 * S), fill=c)

def tamanho(txt_pt, largura, wt):
    """tamanho (px na arte 480) em que o texto original em PT tem a largura medida na arte"""
    return largura / (F(wt, 100).getlength(txt_pt) / 100)

def texto(partes, y_base, size, wt, x0=None, cx=None):
    f = F(wt, size * S)
    total = sum(f.getlength(t) for t, _ in partes)
    x = (cx * S - total / 2) if cx is not None else x0 * S
    for t, c in partes:
        d.text((x, y_base * S), t, font=f, fill=c, anchor='ls')
        x += f.getlength(t)

# Medidas na arte de 14/11 (px 480): largura de cada texto e linha de base
s_sub = tamanho('Represas Estado de SP', 233, 400)
s_l1 = tamanho('App independente e gratuito, sem vínculo com a CETESB.', 419, 400)
s_l2 = tamanho('Dados públicos do Mapa de Qualidade das Praias Interiores.', 426, 400)
s_ap = tamanho('Apoie o projeto:', 114, 400)

# 1) apaga os textos em português (logo, título "Balneabilidade", QR e LivePix ficam)
R(176, 115, 424, 141, PRETO)     # subtítulo
R(14, 200, 466, 254, FAIXA)      # faixa: 2 linhas
R(144, 347, 271, 372, PRETO)     # "Apoie o projeto:"

# 2) inglês
texto([('São Paulo Reservoirs', BRANCO)], 133.5, s_sub, 400, x0=178)
texto([('Free, independent app, not affiliated with CETESB.', BRANCO)], 218, s_l1, 400, cx=239)
texto([('Public data from ', BRANCO), ("CETESB's Inland Beach Quality Map.", CIANO)], 245.5, s_l2, 400, cx=239)
texto([('Support us:', BRANCO)], 364, s_ap, 400, x0=149)

out = big.resize((480, 480), Image.LANCZOS)
out.putalpha(base.getchannel('A'))
out.save(DST)
print('ok', DST, 'tamanhos', [round(x, 1) for x in (s_sub, s_l1, s_l2, s_ap)])
