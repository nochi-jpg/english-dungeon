#!/usr/bin/env python3
"""manabi-resource（https://nochi-jpg.github.io/manabi-resource/）の英語の問題から questions.js を作る。

使い方：
  python3 tools/build_questions.py path/to/manabi-resource/dist/questions.json

レベル1＝小3・4年、レベル2＝小5年、レベル3＝小6年。choices の先頭が正解（表示するときにまぜる）。
"""
import json, sys

src = sys.argv[1] if len(sys.argv) > 1 else '../manabi-resource/dist/questions.json'
q = json.load(open(src, encoding='utf-8'))
eng = [{'g': x['grade'], 'q': x['q'], 'c': x['choices']} for x in q['questions'] if x['subject'] == '英語']
lv = {1: [x for x in eng if x['g'] <= 4], 2: [x for x in eng if x['g'] == 5], 3: [x for x in eng if x['g'] == 6]}
print({k: len(v) for k, v in lv.items()})
out = ('// 英単語の問題（nochi-jpg/manabi-resource の英語から tools/build_questions.py で作る）。'
       'レベル1＝小3・4、2＝小5、3＝小6。choices の先頭が正解\n'
       'window.ED_Q = ' + json.dumps({str(k): [[x['q'], x['c']] for x in v] for k, v in lv.items()}, ensure_ascii=False) + ';\n')
open('questions.js', 'w', encoding='utf-8').write(out)
