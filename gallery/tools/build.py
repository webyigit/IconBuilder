#!/usr/bin/env python3
"""갤러리 데이터 생성기.
사용: python3 -I build.py <@iconify-json 패키지들을 푼 폴더> <출력 data 폴더>
각 패키지는 <src>/<아무이름>/package/icons.json 형태여야 한다 (npm pack @iconify-json/<prefix> 후 압축 해제).
"""
import json, re, sys, glob, os

SRC, OUT = sys.argv[1], sys.argv[2]
PER_STYLE = 100

# (id, 표시 이름, prefix, 포함 정규식, 기준이름 추출용 제거 정규식, 분류)
S = []
def add(id, name, prefix, inc, strip=None, exc=None, cat='ui'):
    S.append(dict(id=id, name=name, prefix=prefix, inc=inc, strip=strip, exc=exc, cat=cat))

NOT_MS = r'-(outline|rounded|sharp)$'
add('material-symbols-filled', 'Material Symbols Filled', 'material-symbols', r'^.*$', None, r'-(outline|rounded|sharp)$', 'material')
add('material-symbols-outlined', 'Material Symbols Outlined', 'material-symbols', r'^(?!.*-outline-(rounded|sharp)$).*-outline$', r'-outline$', None, 'material')
add('material-symbols-rounded', 'Material Symbols Rounded Filled', 'material-symbols', r'^(?!.*-outline-rounded$).*-rounded$', r'-rounded$', None, 'material')
add('material-symbols-outline-rounded', 'Material Symbols Rounded', 'material-symbols', r'-outline-rounded$', r'-outline-rounded$', None, 'material')
add('material-symbols-sharp', 'Material Symbols Sharp Filled', 'material-symbols', r'^(?!.*-outline-sharp$).*-sharp$', r'-sharp$', None, 'material')
add('material-symbols-outline-sharp', 'Material Symbols Sharp', 'material-symbols', r'-outline-sharp$', r'-outline-sharp$', None, 'material')
for v, n in [('baseline', 'Filled'), ('outline', 'Outlined'), ('round', 'Round'), ('sharp', 'Sharp'), ('twotone', 'Two-tone')]:
    add(f'material-icons-{v}', f'Material Icons {n}', 'ic', rf'^{v}-', rf'^{v}-', None, 'material')
add('mdi', 'Material Design Icons', 'mdi', r'.*', None, r'-outline$', 'material')
add('mdi-outline', 'Material Design Icons Outline', 'mdi', r'-outline$', r'-outline$', None, 'material')
for v in ['thin', 'light', 'bold', 'fill', 'duotone']:
    add(f'phosphor-{v}', f'Phosphor {v.capitalize()}', 'ph', rf'-{v}$', rf'-{v}$')
add('phosphor-regular', 'Phosphor Regular', 'ph', r'.*', None, r'-(thin|light|bold|fill|duotone)$')
for v, n in [('linear', 'Linear'), ('outline', 'Outline'), ('broken', 'Broken'), ('bold', 'Bold'), ('bold-duotone', 'Bold Duotone'), ('line-duotone', 'Line Duotone')]:
    add(f'solar-{v}', f'Solar {n}', 'solar', rf'(?<!-bold)(?<!-line)-{v}$' if v in ('bold',) else rf'-{v}$', rf'-{v}$')
add('tabler-outline', 'Tabler Outline', 'tabler', r'.*', None, r'-filled$|^brand-')
add('tabler-filled', 'Tabler Filled', 'tabler', r'-filled$', r'-filled$')
add('heroicons-outline', 'Heroicons Outline', 'heroicons', r'.*', None, r'-solid$|-20-|-16-')
add('heroicons-solid', 'Heroicons Solid', 'heroicons', r'^(?!.*-(20|16)-solid$).*-solid$', r'-solid$')
add('heroicons-mini', 'Heroicons Mini (20px)', 'heroicons', r'-20-solid$', r'-20-solid$')
add('heroicons-micro', 'Heroicons Micro (16px)', 'heroicons', r'-16-solid$', r'-16-solid$')
add('fluent-regular', 'Fluent UI Regular (24px)', 'fluent', r'-24-regular$', r'-24-regular$')
add('fluent-filled', 'Fluent UI Filled (24px)', 'fluent', r'-24-filled$', r'-24-filled$')
add('fluent-color', 'Fluent UI Color', 'fluent-color', r'-24$', r'-24$', None, 'color')
add('lucide', 'Lucide', 'lucide', r'.*')
add('iconoir-regular', 'Iconoir Regular', 'iconoir', r'.*', None, r'-solid$')
add('iconoir-solid', 'Iconoir Solid', 'iconoir', r'-solid$', r'-solid$')
add('remix-line', 'Remix Icon Line', 'ri', r'-line$', r'-line$')
add('remix-fill', 'Remix Icon Fill', 'ri', r'-fill$', r'-fill$')
add('bootstrap', 'Bootstrap Icons', 'bi', r'.*', None, r'-fill$')
add('bootstrap-fill', 'Bootstrap Icons Fill', 'bi', r'-fill$', r'-fill$')
add('ionicons-filled', 'Ionicons Filled', 'ion', r'.*', None, r'-(outline|sharp)$|^(ios|md|logo|social)-')
add('ionicons-outline', 'Ionicons Outline', 'ion', r'-outline$', r'-outline$', r'^(ios|md|logo|social)-')
add('ionicons-sharp', 'Ionicons Sharp', 'ion', r'-sharp$', r'-sharp$', r'^(ios|md|logo|social)-')
add('fontawesome-solid', 'Font Awesome Solid', 'fa7-solid', r'.*')
add('fontawesome-regular', 'Font Awesome Regular', 'fa7-regular', r'.*')
add('fontawesome-brands', 'Font Awesome Brands', 'fa7-brands', r'.*', None, None, 'logo')
add('boxicons-regular', 'Boxicons Regular', 'bx', r'.*', None, r'^(bxs|bxl)-')
add('boxicons-solid', 'Boxicons Solid', 'bxs', r'.*')
add('mingcute-line', 'MingCute Line', 'mingcute', r'-line$', r'-line$')
add('mingcute-fill', 'MingCute Fill', 'mingcute', r'-fill$', r'-fill$')
add('hugeicons', 'Hugeicons Stroke', 'hugeicons', r'.*')
add('iconpark-outline', 'IconPark Outline', 'icon-park-outline', r'.*')
add('iconpark-solid', 'IconPark Solid', 'icon-park-solid', r'.*')
add('iconpark-twotone', 'IconPark Two-tone', 'icon-park-twotone', r'.*')
add('iconpark-color', 'IconPark Multicolor', 'icon-park', r'.*', None, None, 'color')
add('carbon', 'Carbon (IBM)', 'carbon', r'.*', None, r'^(ibm|logo)-')
add('antd-outlined', 'Ant Design Outlined', 'ant-design', r'-outlined$', r'-outlined$')
add('antd-filled', 'Ant Design Filled', 'ant-design', r'-filled$', r'-filled$')
add('antd-twotone', 'Ant Design Two-tone', 'ant-design', r'-twotone$', r'-twotone$')
add('unicons-line', 'Unicons Line', 'uil', r'.*')
add('unicons-monochrome', 'Unicons Monochrome', 'uim', r'.*')
add('unicons-solid', 'Unicons Solid', 'uis', r'.*')
add('eva-outline', 'Eva Outline', 'eva', r'-outline$', r'-outline$')
add('eva-fill', 'Eva Fill', 'eva', r'-fill$', r'-fill$')
add('radix', 'Radix Icons', 'radix-icons', r'.*')
add('octicons', 'Octicons (GitHub)', 'octicon', r'-24$', r'-24$')
add('clarity-line', 'Clarity Line', 'clarity', r'-line$', r'-line$')
add('clarity-solid', 'Clarity Solid', 'clarity', r'-solid$', r'-solid$')
add('pixelarticons', 'Pixelarticons', 'pixelarticons', r'.*', None, r'-(sharp|solid)$')
add('cssgg', 'css.gg', 'gg', r'.*')
add('codicons', 'Codicons (VS Code)', 'codicon', r'.*')
add('tdesign', 'TDesign', 'tdesign', r'.*', None, r'-filled$|^logo-')
add('gravity-ui', 'Gravity UI', 'gravity-ui', r'.*', None, r'^logo-')
add('lets-icons-light', 'Lets Icons Light', 'lets-icons', r'-light$', r'-light$')
add('lets-icons-duotone', 'Lets Icons Duotone', 'lets-icons', r'-duotone$', r'-duotone$')
add('healthicons', 'Health Icons', 'healthicons', r'.*', None, r'-(outline|negative|24px)$', 'theme')
add('game-icons', 'Game Icons', 'game-icons', r'.*', None, None, 'theme')
add('simple-icons', 'Simple Icons (브랜드)', 'simple-icons', r'.*', None, None, 'logo')
add('svg-logos', 'SVG Logos (컬러 브랜드)', 'logos', r'-icon$', r'-icon$', None, 'logo')
add('devicon', 'Devicon (개발 도구 컬러)', 'devicon', r'.*', None, r'-wordmark$', 'logo')
add('twemoji', 'Twemoji (이모지)', 'twemoji', r'.*', None, r'tone|^flag-', 'emoji')

for v, n, inc, strip in [('filled', 'Filled', r'.*', None), ('outlined', 'Outlined', r'^(?!.*-outline-(rounded|sharp)$).*-outline$', r'-outline$'),
                         ('rounded', 'Rounded Filled', r'^(?!.*-outline-rounded$).*-rounded$', r'-rounded$'), ('outline-rounded', 'Rounded', r'-outline-rounded$', r'-outline-rounded$'),
                         ('sharp', 'Sharp Filled', r'^(?!.*-outline-sharp$).*-sharp$', r'-sharp$'), ('outline-sharp', 'Sharp', r'-outline-sharp$', r'-outline-sharp$')]:
    add(f'material-symbols-light-{v}', f'Material Symbols Light {n}', 'material-symbols-light', inc, strip, r'-(outline|rounded|sharp)$' if v == 'filled' else None, 'material')
add('lets-icons-fill', 'Lets Icons Fill', 'lets-icons', r'-fill$', r'-fill$')
add('lets-icons-line', 'Lets Icons Line', 'lets-icons', r'-line$', r'-line$')
add('octicons-16', 'Octicons 16px', 'octicon', r'-16$', r'-16$')
add('tdesign-filled', 'TDesign Filled', 'tdesign', r'-filled$', r'-filled$', r'^logo-')
add('healthicons-outline', 'Health Icons Outline', 'healthicons', r'-outline$', r'-outline$', None, 'theme')
add('fluent-regular-20', 'Fluent UI Regular (20px)', 'fluent', r'-20-regular$', r'-20-regular$')
add('fluent-light', 'Fluent UI Light (32px)', 'fluent', r'-32-light$', r'-32-light$')
add('tabler-brands', 'Tabler Brands', 'tabler', r'^brand-', r'^brand-', None, 'logo')
add('fluent-filled-20', 'Fluent UI Filled (20px)', 'fluent', r'-20-filled$', r'-20-filled$')
add('ionicons-logos', 'Ionicons Logos', 'ion', r'^logo-', r'^logo-', None, 'logo')
add('svg-logos-wordmark', 'SVG Logos 워드마크 (컬러)', 'logos', r'.*', None, r'-icon$', 'logo')
add('devicon-plain', 'Devicon Plain (단색)', 'devicon-plain', r'.*', None, r'-wordmark$', 'logo')

# 인기·신뢰 지표 (2026-11-14 조회; GitHub 스타는 github.com/api.github.com, 주간 다운로드는 api.npmjs.org last-week)
POP = {
 'material-symbols': ('google/material-design-icons', '53.9k', 'material-symbols', 312227),
 'material-symbols-light': ('google/material-design-icons', '53.9k', 'material-symbols', 312227),
 'ic': ('google/material-design-icons', '53.9k', '@mui/icons-material', 10010835),
 'mdi': ('Templarian/MaterialDesign', '11.3k', '@mdi/js', 834290),
 'ph': ('phosphor-icons/homepage', '7.7k', '@phosphor-icons/react', 3146181),
 'solar': ('480-Design/Solar-Icon-Set', '391', '@iconify-json/solar', 236692),
 'tabler': ('tabler/tabler-icons', '21.6k', '@tabler/icons-react', 5234500),
 'heroicons': ('tailwindlabs/heroicons', '23.8k', '@heroicons/react', 6122456),
 'fluent': ('microsoft/fluentui-system-icons', '10.9k', '@fluentui/react-icons', 388167),
 'fluent-color': ('microsoft/fluentui-system-icons', '10.9k', '@fluentui/react-icons', 388167),
 'lucide': ('lucide-icons/lucide', '24.4k', 'lucide-react', 131759453),
 'iconoir': ('iconoir-icons/iconoir', '4.6k', 'iconoir-react', 145819),
 'ri': ('Remix-Design/RemixIcon', '8.4k', 'remixicon', 217896),
 'bi': ('twbs/icons', '8.1k', 'bootstrap-icons', 813038),
 'ion': ('ionic-team/ionicons', '18.2k', 'ionicons', 890781),
 'fa7-solid': ('FortAwesome/Font-Awesome', '77.0k', '@fortawesome/fontawesome-free', 2907599),
 'fa7-regular': ('FortAwesome/Font-Awesome', '77.0k', '@fortawesome/fontawesome-free', 2907599),
 'fa7-brands': ('FortAwesome/Font-Awesome', '77.0k', '@fortawesome/fontawesome-free', 2907599),
 'bx': ('box-icons/boxicons', '3.2k', 'boxicons', 63228),
 'bxs': ('box-icons/boxicons', '3.2k', 'boxicons', 63228),
 'mingcute': ('mingcute-design/mingcute-icons', '1.7k', '@mingcute/react', 8914),
 'hugeicons': (None, None, '@hugeicons/core-free-icons', 1943362),
 'icon-park-outline': ('bytedance/IconPark', '9.1k', '@icon-park/react', 75474),
 'icon-park-solid': ('bytedance/IconPark', '9.1k', '@icon-park/react', 75474),
 'icon-park-twotone': ('bytedance/IconPark', '9.1k', '@icon-park/react', 75474),
 'icon-park': ('bytedance/IconPark', '9.1k', '@icon-park/react', 75474),
 'carbon': ('carbon-design-system/carbon', '9.5k', '@carbon/icons', 97144),
 'ant-design': ('ant-design/ant-design-icons', '1.1k', '@ant-design/icons', 5901143),
 'uil': ('Iconscout/unicons', '1.5k', None, None),
 'uim': ('Iconscout/unicons', '1.5k', None, None),
 'uis': ('Iconscout/unicons', '1.5k', None, None),
 'eva': ('akveo/eva-icons', '8.8k', 'eva-icons', 24875),
 'radix-icons': ('radix-ui/icons', '2.7k', '@radix-ui/react-icons', 3241164),
 'octicon': ('primer/octicons', '8.8k', '@primer/octicons', 327924),
 'clarity': ('vmware-clarity/core', '184', '@cds/core', 29254),
 'pixelarticons': ('halfmage/pixelarticons', '891', 'pixelarticons', 77723),
 'gg': ('astrit/css.gg', '10.1k', 'css.gg', 3619),
 'codicon': ('microsoft/vscode-codicons', '1.2k', '@vscode/codicons', 708546),
 'tdesign': ('Tencent/tdesign-icons', '99', 'tdesign-icons-react', 10024),
 'gravity-ui': ('gravity-ui/icons', '145', '@gravity-ui/icons', 150707),
 'lets-icons': (None, None, '@iconify-json/lets-icons', 14736),
 'healthicons': ('resolvetosavelives/healthicons', '866', 'healthicons-react', 19097),
 'game-icons': ('game-icons/icons', '1.4k', '@iconify-json/game-icons', 31254),
 'simple-icons': ('simple-icons/simple-icons', '25.8k', 'simple-icons', 2560104),
 'logos': ('gilbarbara/logos', '6.8k', '@iconify-json/logos', 448255),
 'devicon': ('devicons/devicon', '11.8k', 'devicon', 93370),
 'devicon-plain': ('devicons/devicon', '11.8k', 'devicon', 93370),
 'twemoji': ('twitter/twemoji', '17.8k', '@twemoji/api', 51613),
}

KEY = """home house|search magnifying-glass magnifier zoom|user person account profile|users people group|settings setting gear cog|menu hamburger bars|close x xmark cancel|check checkmark tick done|plus add|minus remove subtract|edit pencil pen|trash delete bin|heart favorite like|star|bell notification alarm|mail email envelope|phone call|chat message comment|send paper-plane|calendar|clock time|camera|image photo picture|video film|music|play|pause|stop|download|upload|share|link|lock|unlock|key|eye view visible|eye-off eye-slash hidden|info information|alert warning|help question|cart shopping-cart|bag shopping-bag|credit-card card|wallet|gift|tag|bookmark|flag|map|location map-pin pin marker|globe world earth|cloud|sun|moon|wifi|bluetooth|battery|power|refresh reload|filter|sort|grid|list|copy|clipboard|file document|folder|save floppy|print printer|attachment paperclip|arrow-left|arrow-right|arrow-up|arrow-down|chevron-left|chevron-right|chevron-up|chevron-down|external-link open-in-new|log-in login sign-in|log-out logout sign-out|dashboard|chart chart-bar bar-chart|pie-chart chart-pie|trending-up|database|server|code|terminal|bug|cpu chip|monitor desktop|laptop|smartphone mobile|tablet|keyboard|mouse|headphones|microphone mic|volume speaker|book|briefcase|building office|car|truck|plane airplane|rocket|bike bicycle|coffee|cake|leaf|fire flame|water drop|umbrella|thumbs-up thumb-up like|smile happy|shield|award trophy|lightbulb bulb idea|puzzle|palette|brush|scissors|wrench tool|hammer|target|compass|anchor|crown|diamond|box package|layers|qr-code qrcode|zap flash bolt""".split('|')
BRANDS = 'google apple microsoft facebook instagram x twitter youtube github gitlab linkedin tiktok whatsapp telegram slack discord figma notion spotify netflix amazon amazonwebservices aws android windows linux ubuntu chrome googlechrome firefox safari react vuejs vue angular svelte nextdotjs nextjs nodejs node javascript typescript python java kotlin swift go rust php ruby html5 html css3 css tailwindcss tailwind bootstrap sass docker kubernetes git npm yarn vercel netlify cloudflare firebase supabase mongodb mysql postgresql redis graphql openai anthropic claude stripe paypal visa mastercard shopify wordpress medium reddit pinterest snapchat twitch dribbble behance kakao kakaotalk naver line wechat zoom trello jira atlassian dropbox googledrive gmail youtube vscode visualstudiocode intellijidea webpack vite babel eslint prettier jest flutter dart unity unrealengine blender adobe photoshop illustrator'.split()

def load(prefix):
    for f in glob.glob(f'{SRC}/*/package/icons.json'):
        j = json.load(open(f))
        if j['prefix'] == prefix:
            info = json.load(open(os.path.dirname(f) + '/info.json'))
            ver = json.load(open(os.path.dirname(f) + '/package.json'))['version']
            return j, info, ver
    raise SystemExit('missing ' + prefix)

cache = {}
os.makedirs(OUT, exist_ok=True)
index = []
for s in S:
    if s['prefix'] not in cache:
        cache[s['prefix']] = load(s['prefix'])
    j, info, ver = cache[s['prefix']]
    W, H = j.get('width', 16), j.get('height', 16)
    cand = {}
    for n, ic in j['icons'].items():
        if ic.get('hidden'): continue
        if not re.search(s['inc'], n): continue
        if s['exc'] and re.search(s['exc'], n): continue
        base = re.sub(s['strip'], '', n) if s['strip'] else n
        cand.setdefault(base, n)
    picked = []
    used = set()
    if s['cat'] == 'logo':
        for b in BRANDS:
            for k in (b, b + '-original', b + '-plain'):
                if k in cand and cand[k] not in used:
                    picked.append(cand[k]); used.add(cand[k]); break
    elif s['cat'] == 'emoji':
        pass
    else:
        for grp in KEY:
            for w in grp.split():
                hit = None
                for k in (w, w + '-outline', w + '-1', w + '-2', w + '-alt', w + '-01'):
                    if k in cand and cand[k] not in used: hit = cand[k]; break
                if hit: picked.append(hit); used.add(hit); break
            if len(picked) >= PER_STYLE: break
    rest = sorted((b for b in cand if cand[b] not in used), key=lambda b: (bool(re.search(r'\d', b)), b.count('-'), b))
    if s['cat'] == 'emoji':
        rest.sort(key=lambda b: (0 if b.endswith('-face') or 'smiling' in b else 1, b.count('-'), b))
    for b in rest:
        if len(picked) >= PER_STYLE: break
        picked.append(cand[b]); used.add(cand[b])
    icons = []
    for n in picked:
        ic = j['icons'][n]
        base = re.sub(s['strip'], '', n) if s['strip'] else n
        w, h = ic.get('width', W), ic.get('height', H)
        l, t = ic.get('left', 0), ic.get('top', 0)
        body = ic['body']
        icons.append([base, f'{l} {t} {w} {h}', body])
    color = s['cat'] in ('color', 'emoji') or (s['cat'] == 'logo' and info.get('palette'))
    a = info.get('author', {}); lic = info.get('license', {})
    meta = dict(id=s['id'], name=s['name'], set=info['name'], prefix=s['prefix'], cat=s['cat'], color=bool(color),
                count=len(icons), author=a.get('name'), url=a.get('url'), license=lic.get('title'), spdx=lic.get('spdx'),
                licenseUrl=lic.get('url'), version=ver,
                pop=dict(zip(('repo', 'stars', 'npm', 'weekly'), POP[s['prefix']])))
    json.dump(dict(meta=meta, icons=icons), open(f"{OUT}/{s['id']}.json", 'w'), ensure_ascii=False, separators=(',', ':'))
    meta = dict(meta, sample=icons[:3])
    index.append(meta)
json.dump(index, open(f'{OUT}/index.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('styles', len(index))
missing=[m['id'] for m in index if not m['pop']]
print('nopop', missing)
for m in index:
    if m['count'] < 100: print('LOW', m['id'], m['count'])

# ---- LICENSES.md ----
L = ['# 아이콘 갤러리 라이선스·출처', '',
     '모든 아이콘은 상업적 이용이 가능한 오픈소스 라이선스(MIT, Apache-2.0, ISC, CC0-1.0, CC-BY-4.0, CC-BY-3.0)로 배포된 세트에서 가져왔습니다.',
     'SVG 데이터는 [Iconify](https://iconify.design)가 각 세트를 정리해 npm에 올린 `@iconify-json/<prefix>` 패키지에서 추출했습니다 (원본 세트의 라이선스를 그대로 따름).', '',
     '## 사용 시 주의', '',
     '- **CC BY**¹ 세트(Font Awesome, Solar, Codicons, Lets Icons, Game Icons, Twemoji 등): 사용하는 곳에 제작자·라이선스를 표기해야 합니다.',
     '- **Apache-2.0**² / **MIT**³ / **ISC**: 재배포 시 저작권·라이선스 고지를 함께 두면 됩니다. 스타일별 ZIP에 `LICENSE.txt`가 들어 있습니다.',
     '- **브랜드 로고**(Simple Icons, SVG Logos, Devicon, Font Awesome Brands, Tabler Brands, Ionicons Logos): 파일 라이선스와 별개로 각 회사의 상표입니다. 상표 사용 규정을 따르세요.', '',
     '## 선정 기준 (신뢰 지표)', '',
     'GitHub 스타 1,000개 이상 **또는** npm 주간 다운로드 10,000회 이상인 세트만 넣었습니다. 2026-11-14 조회 (GitHub: github.com·api.github.com, npm: api.npmjs.org `downloads/point/last-week`).',
     '세트마다 대표 npm 패키지 하나의 수치이며, npm 집계 주간은 패키지별로 조금씩 다를 수 있습니다.', '',
     '제외한 세트: Streamline 무료 세트(GitHub ★108, npm 주간 107), Teenyicons(npm 주간 210), Majesticons(★190, 주간 582), Akar Icons(★422, 주간 402), Pepicons(★60, 주간 396), Mage Icons(★90, 주간 9,831), Feather Icon fe(★196, 주간 5,430).', '',
     '## 스타일별 목록', '',
     '| # | 스타일 | 세트 | 라이선스 | 제작 | GitHub ★ | npm 주간 다운로드 |', '|---|---|---|---|---|---|---|']
for i, m in enumerate(index, 1):
    pp = m['pop']
    gh = f"[{pp['stars']}](https://github.com/{pp['repo']})" if pp['repo'] else '-'
    npm = f"[{pp['weekly']:,}](https://www.npmjs.com/package/{pp['npm']}) `{pp['npm']}`" if pp['npm'] else '-'
    home = f"[{m['set']}]({m['url']})" if m['url'] else m['set']
    lic = f"[{m['license']}]({m['licenseUrl']})" if m['licenseUrl'] else m['license']
    L.append(f"| {i} | {m['name']} | {home} | {lic} | {m['author'] or '-'} | {gh} | {npm} |")
L += ['', '---', '', '¹ CC BY: 크리에이티브 커먼즈 저작자표시. 출처만 밝히면 상업 이용·수정 가능.',
      '² Apache-2.0: 아파치 라이선스. 고지문 유지 조건으로 상업 이용·수정 가능.',
      '³ MIT / ISC: 가장 느슨한 허용 라이선스. 저작권 고지만 유지하면 됨.', '',
      '갤러리 코드에 포함된 JSZip은 MIT(또는 GPLv3 중 선택) 라이선스입니다 — `vendor/jszip.LICENSE.md`.']
open(os.path.join(os.path.dirname(OUT.rstrip('/')), 'LICENSES.md'), 'w').write('\n'.join(L) + '\n')
