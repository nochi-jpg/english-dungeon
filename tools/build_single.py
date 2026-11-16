#!/usr/bin/env python3
"""index.html・JS・画像をぜんぶ1つに埋めこんだ、配布用の1ファイルHTMLを作る（HTML直配布用）。

使い方： python3 tools/build_single.py
できたもの： dist/english-dungeon.html
"""
import base64, io, pathlib, re
from PIL import Image

R = pathlib.Path(__file__).resolve().parent.parent
html = (R / 'index.html').read_text(encoding='utf-8')

# JS を埋めこむ
def inline_js(m):
    src = (R / m.group(1)).read_text(encoding='utf-8')
    return '<script>\n' + src.replace('</script', '<\\/script') + '\n</script>'
html = re.sub(r'<script src="([^"]+)"></script>', inline_js, html)

# 画像を data URI に（HTML・JS 内の images/〜.png をぜんぶ）。小さくするため WebP にする（背景は画質90、敵とロゴは劣化なし）
def data_uri(path):
    im = Image.open(R / path); buf = io.BytesIO()
    if path.startswith('images/bg/'): im.save(buf, 'WEBP', quality=90, method=6)
    else: im.save(buf, 'WEBP', lossless=True, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()
imgs = sorted(set(re.findall(r'images/[\w/\-]+\.png', html)))
for p in imgs:
    html = html.replace(p, data_uri(p))

out = R / 'dist' / 'english-dungeon.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding='utf-8')
print(out, f'{out.stat().st_size / 1e6:.1f} MB', len(imgs), '枚の画像を埋めこみ')
