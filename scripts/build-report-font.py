#!/usr/bin/env python3
"""
Decupeaza DejaVu Sans la caracterele folosite in rapoarte si scrie
src/lib/report-font.ts.

De ce exista: fonturile standard PDF merg pe WinAnsi, care n-are a-breve,
s-virgula si t-virgula. Rapoartele ieseau cu "Arges Expres" si "Braila" —
numele publicatiilor scrise gresit in documentul pe care clientul il pune la
dosar. Decupat, fontul intra in ~33KB in loc de 750KB.

Rulare:  python3 scripts/build-report-font.py
"""
import io, base64, os, tempfile
from fontTools.ttLib import TTFont
from fontTools import subset

EXTRA = "ăĂâÂîÎșȘțȚşŞţŢ—–„”’…·€"
CHARS = "".join(chr(c) for c in range(32, 127)) + EXTRA

def build(src, out):
    opts = subset.Options()
    opts.layout_features = []
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    font = subset.load_font(src, opts)
    s = subset.Subsetter(options=opts)
    s.populate(text=CHARS)
    s.subset(font)
    subset.save_font(font, out, opts)
    return TTFont(out)

tmp = tempfile.mkdtemp()
reg_p, bold_p = os.path.join(tmp, "r.ttf"), os.path.join(tmp, "b.ttf")
reg = build("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", reg_p)
bold = build("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", bold_p)

# Codurile trebuie sa fie CONTIGUE: /Differences insira glifele una dupa alta
# de la FirstChar, deci orice gaura decaleaza tot ce urmeaza. Prima versiune
# sarea peste 127 si iesea "BacAu Expres" in loc de "Bacau".
enc = {chr(c): c for c in range(32, 127)}
for i, ch in enumerate(EXTRA):
    enc[ch] = 127 + i

ordered = sorted(enc.items(), key=lambda kv: kv[1])
assert [c for _, c in ordered] == list(range(32, 32 + len(ordered))), "coduri necontigue"

def table(f):
    upm = f["head"].unitsPerEm
    cmap, hmtx = f.getBestCmap(), f["hmtx"]
    names, widths = [], []
    for ch, _ in ordered:
        g = cmap.get(ord(ch))
        names.append(g or ".notdef")
        widths.append(round(hmtx[g][0] * 1000 / upm) if g else 600)
    return names, widths

names, widths_r = table(reg)
_, widths_b = table(bold)

def metrics(f):
    h, hh, o = f["head"], f["hhea"], f["OS/2"]
    k = 1000 / h.unitsPerEm
    return {
        "ascent": round(hh.ascent * k),
        "descent": round(hh.descent * k),
        "capHeight": round(getattr(o, "sCapHeight", 700) * k),
        "bbox": [round(h.xMin * k), round(h.yMin * k), round(h.xMax * k), round(h.yMax * k)],
        "italicAngle": 0,
        "stemV": 80,
    }

b64 = lambda p: base64.b64encode(io.open(p, "rb").read()).decode()
enc_lines = "\n".join(
    f'  "{ch}": {c},' for ch, c in ordered if c >= 127
)

out = f'''/**
 * Fontul rapoartelor PDF, decupat la caracterele de care avem nevoie.
 *
 * GENERAT — nu se editeaza de mana. Ruleaza scripts/build-report-font.py.
 *
 * Fonturile standard PDF merg pe WinAnsi, care n-are ă, ș si ț. Rapoartele
 * ieseau cu "Arges Expres" si "Braila Expres" — numele publicatiilor scrise
 * gresit in documentul pe care clientul il pune la dosar. DejaVu Sans le are
 * pe toate; decupat, intra in {os.path.getsize(reg_p)//1024}KB + {os.path.getsize(bold_p)//1024}KB.
 */

/** Codul din PDF pentru fiecare caracter special. ASCII ramane el insusi. */
export const FONT_ENCODING: Record<string, number> = {{
{enc_lines}
}};

/** Glifele in ordinea codurilor, pentru /Differences. Contiguu de la 32. */
export const FONT_GLYPHS: string[] = {names!r};

export const FONT_FIRST_CHAR = 32;
export const FONT_WIDTHS = {widths_r!r};
export const FONT_WIDTHS_BOLD = {widths_b!r};
export const FONT_METRICS = {{ regular: {metrics(reg)!r}, bold: {metrics(bold)!r} }};

export const FONT_REGULAR_B64 = "{b64(reg_p)}";

export const FONT_BOLD_B64 = "{b64(bold_p)}";
'''
io.open("src/lib/report-font.ts", "w", encoding="utf-8").write(out.replace("'", '"'))
print(f"scris src/lib/report-font.ts — subset {os.path.getsize(reg_p)//1024}/{os.path.getsize(bold_p)//1024}KB, {len(ordered)} coduri")
