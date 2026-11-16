"""Arte da loja do Balneabilidade Rep. SP no layout da do Mananciais SP (1920×2100).
Reaproveita da arte do Mananciais: gradiente do fundo, selo 'available on ZeppOS', relógios e listas
de aparelhos. Capturas vêm de capt.py. QR: passe os PNG dos .zpk; sem eles, fica um espaço marcado.
  python3 compor.py ref.png capturas/ icon.png saida.png [qr_nxp.png qr_zps.png]"""
import sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
REF, CAP, ICON, OUT = sys.argv[1:5]
QR = sys.argv[5:7] if len(sys.argv) >= 7 else None
I = '/usr/share/fonts/opentype/inter/'
F = lambda n, s: ImageFont.truetype(I + n, s)
TXT, MUTED, VERDE, CIANO, RODAPE = (232, 244, 246), (122, 154, 163), (76, 217, 138), (18, 208, 255), (79, 106, 114)

ref = Image.open(REF).convert('RGBA')
W, H = ref.size
out = Image.new('RGBA', (W, H))
# Fundo: o gradiente da arte do Mananciais é vertical (linhas constantes) → copia a coluna x=30
col = ref.crop((30, 0, 31, 1080)).resize((W, 1080))
out.paste(col, (0, 0))
# Metade de baixo inteira (relógios, listas de aparelhos, rodapé)
out.paste(ref.crop((0, 1080, W, H)), (0, 1080))
g = ImageDraw.Draw(out)

# ── Cabeçalho ──
ic = Image.open(ICON).convert('RGBA').resize((184, 184), Image.LANCZOS)
out.alpha_composite(ic, (113, 118))
titulo, sufixo = 'Balneabilidade', ' Rep. SP'
ft = F('Inter-SemiBold.otf', 96)
g.text((330, 196), titulo, font=ft, fill=TXT, anchor='ls')
x_suf = 330 + g.textlength(titulo, font=ft)
g.text((x_suf, 196), sufixo, font=F('Inter-Light.otf', 96), fill=TXT, anchor='ls')
g.text((334, 268), 'As praias das represas de SP no seu pulso', font=F('Inter-Regular.otf', 36), fill=MUTED, anchor='ls')
# selo "available on ZeppOS" (recorte da arte do Mananciais)
out.alpha_composite(ref.crop((1440, 130, 1810, 300)), (1440, 130))

# ── 4 telas ──
telas = [
    ('guarapiranga_1_resumo.png', 'Próprias e impróprias'),
    ('guarapiranga_0_lista_represas.png', '4 represas da RMSP'),
    ('rio_grande_2_pontos_1-5.png', 'Ponto a ponto'),
    ('guarapiranga_4_criterio.png', 'Critério da CETESB'),
]
fc = F('Inter-Regular.otf', 36)
for i, (arq, leg) in enumerate(telas):
    cx, cy = 300 + i * 440, 630
    g.ellipse([cx - 222, cy - 222, cx + 222, cy + 222], fill=(9, 25, 31))
    g.ellipse([cx - 212, cy - 212, cx + 212, cy + 212], fill=(30, 48, 54))
    t = Image.open(os.path.join(CAP, arq)).convert('RGBA').resize((396, 396), Image.LANCZOS)
    out.alpha_composite(t, (cx - 198, cy - 198))
    g.text((cx, 900), leg, font=fc, fill=TXT, anchor='ms')

# ── Instale AGORA! (sobre a faixa já existente, recriada no fundo novo) ──
g.text((925, 1062), 'Instale AGORA!', font=F('Inter-BlackItalic.otf', 62), fill=VERDE, anchor='ms')

# ── QR nas telas dos relógios ──
for k, (x0, y0) in enumerate(((490, 1366), (1102, 1366))):
    if QR:
        g.rectangle([x0 - 10, y0 - 10, x0 + 269, y0 + 269], fill=(0, 0, 0))
        q = Image.open(QR[k]).convert('RGBA').resize((260, 260), Image.NEAREST)
        out.alpha_composite(q, (x0, y0))
    else:
        g.rectangle([x0 - 10, y0 - 10, x0 + 269, y0 + 269], fill=(0, 0, 0))
        g.rounded_rectangle([x0 + 6, y0 + 6, x0 + 253, y0 + 253], 18, outline=(90, 110, 116), width=4)
        g.text((x0 + 130, y0 + 120), 'QR', font=F('Inter-Bold.otf', 64), fill=(90, 110, 116), anchor='mm')
        g.text((x0 + 130, y0 + 185), ('NXP', 'ZPS')[k], font=F('Inter-Regular.otf', 32), fill=(90, 110, 116), anchor='mm')

# ── Rodapé ──
g.rectangle([0, 1985, W, H], fill=(13, 37, 44))
g.text((W // 2, 2058), 'Dados públicos do Mapa de Qualidade das Praias Interiores (CETESB) · app independente, sem vínculo com a CETESB',
       font=F('Inter-Regular.otf', 28), fill=RODAPE, anchor='ms')
out.convert('RGB').save(OUT)
print('ok', OUT, out.size, 'larg. título', int(x_suf + g.textlength(sufixo, font=F('Inter-Light.otf', 96))))
