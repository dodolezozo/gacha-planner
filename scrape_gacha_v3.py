"""
Gacha Planner — Scraper v3 (Playwright)
========================================
Fixes v3 :
  - Rareté détectée depuis la page de détail (balise dédiée, pas les textes flottants)
  - ZZZ : S-Rank → 5★, A-Rank → 4★
  - Ajout Polearm (GI), The Hunt + Elation (HSR)
  - Fallback rareté via couleur de fond de l'icône (attribut style/class)

Installation :
    pip install playwright httpx
    playwright install chromium

Usage :
    python scrape_gacha_v3.py                    # tout scraper
    python scrape_gacha_v3.py --games genshin hsr
    python scrape_gacha_v3.py --no-images        # JSON seulement
"""

import asyncio
import json
import re
import argparse
import httpx
from pathlib import Path
from playwright.async_api import async_playwright, Page, TimeoutError as PWTimeout

# ── Config ────────────────────────────────────────────────────────────────────

SITES = {
    "genshin": "https://genshin.akademiya.app",
    "hsr":     "https://starrail.akademiya.app",
    "zzz":     "https://zzz.akademiya.app",
    "wuwa":    "https://wuwa.akademiya.app",
}

SPECIALTY_KEY = {
    "genshin": "weapon",
    "hsr":     "path",
    "zzz":     "specialty",
    "wuwa":    "weapon",
}

ENCORE_ICON_URL = "https://api-v2.encore.moe/role/{id}/icon"

# ── Vocabulary ────────────────────────────────────────────────────────────────

ELEMENTS = {
    "genshin": {"Pyro","Hydro","Anemo","Electro","Dendro","Cryo","Geo"},
    "hsr":     {"Fire","Ice","Wind","Lightning","Quantum","Imaginary","Physical"},
    "zzz":     {"Fire","Ice","Electric","Physical","Ether","Wind"},
    "wuwa":    {"Glacio","Fusion","Electro","Aero","Spectro","Havoc"},
}

SPECIALTIES = {
    "genshin": {"Sword","Claymore","Pole","Bow","Catalyst"},
    "hsr":     {"The Hunt","Erudition","Harmony","Nihility","Preservation",
                "Abundance","Destruction","Remembrance","Propagation",
                "Elation","Follow-up"},
    "zzz":     {"Attack","Stun","Anomaly","Support","Defense","Rupture"},
    "wuwa":    {"Sword","Broadblade","Pistols","Gauntlets","Rectifier"},
}

# ZZZ rank labels → numeric rarity
ZZZ_RANK_MAP = {"S-Rank": 5, "S Rank": 5, "A-Rank": 4, "A Rank": 4}

# ── Helpers ───────────────────────────────────────────────────────────────────

def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")

def next_decode(url: str) -> str:
    from urllib.parse import unquote
    m = re.search(r"[?&]url=([^&]+)", url)
    return unquote(m.group(1)) if m else url

async def download_image(url: str, dest: Path, client: httpx.AsyncClient) -> bool:
    if dest.exists():
        return True
    try:
        r = await client.get(url, timeout=15, follow_redirects=True)
        if r.status_code == 200 and len(r.content) > 500:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(r.content)
            return True
        print(f"    [img] {r.status_code} — {url[:80]}")
        return False
    except Exception as e:
        print(f"    [img] ERR — {e}")
        return False

# ── Detail page scraper ───────────────────────────────────────────────────────

async def scrape_detail(page: Page, url: str, game: str) -> dict:
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=25000)
        await page.wait_for_selector("h1", timeout=12000)
        await page.wait_for_timeout(900)
    except PWTimeout:
        print(f" [timeout]", end="")
        return {}

    data = await page.evaluate("""() => {
        // ── All visible text nodes ──────────────────────────────────────────
        const texts = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            const t = node.textContent.trim();
            const parent = node.parentElement;
            if (!t || t.length > 80 || !parent) continue;
            // skip hidden elements
            const style = window.getComputedStyle(parent);
            if (style.display === 'none' || style.visibility === 'hidden') continue;
            texts.push({
                text:  t,
                tag:   parent.tagName.toLowerCase(),
                cls:   parent.className || '',
            });
        }

        // ── Images ──────────────────────────────────────────────────────────
        const imgs = [...document.querySelectorAll('img')].map(img => ({
            src:    img.src || img.getAttribute('src') || '',
            alt:    img.alt || '',
            w:      img.naturalWidth  || img.width  || 0,
            h:      img.naturalHeight || img.height || 0,
            cls:    img.className || '',
        }));

        // ── Rarity: look for star/rank indicators ────────────────────────────
        const rarityHints = [];
        document.querySelectorAll('*').forEach(el => {
            // 1. Text-node star counting (Unicode ★)
            const direct = [...el.childNodes]
                .filter(n => n.nodeType === 3)
                .map(n => n.textContent.trim())
                .join('');
            const stars = (direct.match(/★/g) || []).length;
            if (stars >= 4 && stars <= 5) rarityHints.push(stars);
            const m = direct.match(/^([45])★$/);
            if (m) rarityHints.push(parseInt(m[1]));
            if (/S[-\s]?Rank/i.test(direct)) rarityHints.push('S');
            if (/A[-\s]?Rank/i.test(direct)) rarityHints.push('A');

            // 2. CSS class-name patterns: rarity-5, star-5, grade-5, rank-s …
            const cls = typeof el.className === 'string' ? el.className : '';
            const cm = cls.match(/(?:rarity|star|grade)[_\-]?([45])/i);
            if (cm) rarityHints.push(parseInt(cm[1]));
            if (/(?:rank[-_]?s|s[-_]?rank)\\b/i.test(cls)) rarityHints.push('S');
            if (/(?:rank[-_]?a|a[-_]?rank)\\b/i.test(cls)) rarityHints.push('A');

            // 3. data-* attributes
            const dr = el.getAttribute('data-rarity') || el.getAttribute('data-grade') || el.getAttribute('data-rank');
            if (dr) {
                if (dr === '5' || dr === '4') rarityHints.push(parseInt(dr));
                if (/^s/i.test(dr)) rarityHints.push('S');
                if (/^a$/i.test(dr)) rarityHints.push('A');
            }

            // 4. img alt text: "5 star", "S-rank" etc.
            if (el.tagName === 'IMG') {
                const alt = el.alt || '';
                const am = alt.match(/([45])[_\s\-]?star/i);
                if (am) rarityHints.push(parseInt(am[1]));
                if (/s[ _-]?rank/i.test(alt)) rarityHints.push('S');
                if (/a[ _-]?rank/i.test(alt)) rarityHints.push('A');
            }
        });

        // 5. Count star-shaped SVG icons in the page (akademiya renders stars as SVGs)
        const starSvgCount = document.querySelectorAll(
            'svg[class*="star" i], svg[class*="rarity" i], ' +
            'img[src*="star" i][src*="icon"], ' +
            '[class*="StarIcon"], [class*="star-icon"], [class*="RarityIcon"]'
        ).length;
        if (starSvgCount === 5) rarityHints.push(5);
        else if (starSvgCount === 4) rarityHints.push(4);

        // Also check page background colors for rarity tints
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;

        return { texts, imgs, rarityHints, bodyBg };
    }""")

    result = {}
    texts       = [t['text'] for t in data['texts']]
    imgs        = data['imgs']
    rarity_hints= data['rarityHints']

    # ── Rarity ──────────────────────────────────────────────────────────────
    if game == 'zzz':
        for h in rarity_hints:
            if h == 'S': result['rarity'] = 5; break
            if h == 'A': result['rarity'] = 4; break
        # Also check raw text
        if 'rarity' not in result:
            for t in texts:
                if re.search(r'S[-\s]?Rank', t, re.I): result['rarity'] = 5; break
                if re.search(r'A[-\s]?Rank', t, re.I): result['rarity'] = 4; break
    else:
        # Standard: look for ★ count or "X★" pattern
        for h in rarity_hints:
            if isinstance(h, int) and h in (4, 5):
                result['rarity'] = h
                break
        # Also scan texts
        if 'rarity' not in result:
            for t in texts:
                m = re.match(r'^([45])★?$', t)
                if m:
                    result['rarity'] = int(m.group(1))
                    break
                if t.count('★') in (4, 5):
                    result['rarity'] = t.count('★')
                    break

    # ── Element ──────────────────────────────────────────────────────────────
    for t in texts:
        if t in ELEMENTS[game]:
            result['element'] = t
            break

    # ── Specialty / Weapon / Path ────────────────────────────────────────────
    for t in texts:
        if t in SPECIALTIES[game]:
            result['specialty'] = t
            break

    # ── Best icon image ──────────────────────────────────────────────────────
    best_url   = None
    best_score = -1

    SKIP_PATTERNS = [
        'logo','favicon','banner','background','bg_','_bg',
        'icon_element','iconpath','iconattribute','iconweapon',
        'arrow','chevron','next','vercel','_next/static',
        'ui_icon','uiicon',
    ]

    for img in imgs:
        src = img['src']
        if not src or src.startswith('data:'):
            continue
        real = next_decode(src) if '_next/image' in src else src
        rl = real.lower()
        if any(p in rl for p in SKIP_PATTERNS):
            continue

        score = 0
        # CDN preference
        if 'nanoka.cc'   in rl: score += 12
        if 'encore.moe'  in rl: score += 12
        # Path keywords suggesting character icons
        if 'avataricon'  in rl: score += 8
        if 'avatarshopicon' in rl: score += 6
        if 'iconrolecrop' in rl: score += 8
        if 'iconrole'    in rl: score += 6
        if '/role/'      in rl: score += 10
        if 'sp_icon'     in rl: score += 4
        # Generic icon pattern (ZZZ: SP_IconNorXxx)
        if re.search(r'sp_icon\w+', rl): score += 3
        # Size: prefer images in 64–256px square range
        w, h = img['w'], img['h']
        if 50 < w < 300 and 50 < h < 300: score += 4
        if w > 0 and h > 0 and abs(w - h) < w * 0.3: score += 2  # roughly square

        if score > best_score:
            best_score = score
            best_url   = real

    if best_url:
        result['image_url'] = best_url

    return result

# ── List page: collect char links + list-level rarity ────────────────────────

async def collect_char_links(page: Page, base_url: str, game: str) -> list:
    list_url = f"{base_url}/en/characters"
    print(f"  → {list_url}")
    try:
        await page.goto(list_url, wait_until="domcontentloaded", timeout=25000)
        await page.wait_for_selector("a[href*='/characters/']", timeout=15000)
        await page.wait_for_timeout(1500)
    except PWTimeout:
        print("  [!] List timeout")
        return []

    links = await page.evaluate("""() => {
        const seen = new Set();
        return [...document.querySelectorAll("a[href*='/characters/']")]
            .filter(a => /\\/characters\\/[\\w-]+$/.test(a.pathname))
            .filter(a => {
                if (seen.has(a.pathname)) return false;
                seen.add(a.pathname);
                return true;
            })
            .map(a => {
                // ── List-card texts ──────────────────────────────────────
                const texts = [...a.querySelectorAll('*')]
                    .flatMap(el => [...el.childNodes]
                        .filter(n => n.nodeType === 3)
                        .map(n => n.textContent.trim()))
                    .filter(t => t.length > 0 && t.length < 80);

                // ── List-card images ─────────────────────────────────────
                const imgs = [...a.querySelectorAll('img')]
                    .map(i => i.src || i.getAttribute('src') || '')
                    .filter(Boolean);

                // ── Rarity from card ─────────────────────────────────────
                let rarityFromCard = null;

                // 1. Unicode ★ sequences in innerHTML
                const html = a.innerHTML;
                if (!rarityFromCard && (html.match(/★★★★★/g) || []).length > 0) rarityFromCard = 5;
                if (!rarityFromCard && (html.match(/★★★★(?!★)/g) || []).length > 0) rarityFromCard = 4;

                // 2. ZZZ rank text
                if (!rarityFromCard && /S[-\s]?Rank/i.test(a.innerText)) rarityFromCard = 5;
                if (!rarityFromCard && /A[-\s]?Rank/i.test(a.innerText)) rarityFromCard = 4;

                // 3. CSS class names on the card and its descendants
                [a, ...a.querySelectorAll('*')].forEach(el => {
                    if (rarityFromCard) return;
                    const cls = typeof el.className === 'string' ? el.className : '';
                    const cm = cls.match(/(?:rarity|star|grade)[_\-]?([45])/i);
                    if (cm) { rarityFromCard = parseInt(cm[1]); return; }
                    if (/(?:rank[-_]?s|s[-_]?rank)\\b/i.test(cls)) { rarityFromCard = 5; return; }
                    if (/(?:rank[-_]?a|a[-_]?rank)\\b/i.test(cls)) { rarityFromCard = 4; return; }
                    // data-rarity / data-grade
                    const dr = el.getAttribute('data-rarity') || el.getAttribute('data-grade');
                    if (dr === '5') { rarityFromCard = 5; return; }
                    if (dr === '4') { rarityFromCard = 4; return; }
                });

                return { href: a.pathname, texts, imgs, rarityFromCard };
            });
    }""")

    print(f"  → {len(links)} characters found")
    return links

# ── Full game scrape ──────────────────────────────────────────────────────────

async def scrape_game(game: str, base_url: str, page: Page,
                      download_images: bool, http: httpx.AsyncClient) -> list:
    print(f"\n{'═'*58}")
    print(f"  {game.upper():8s}  {base_url}")
    print(f"{'═'*58}")

    raw_links = await collect_char_links(page, base_url, game)
    if not raw_links:
        return []

    characters = []

    for i, raw in enumerate(raw_links):
        char_id = raw['href'].rstrip('/').split('/')[-1]
        detail_url = base_url + raw['href']

        # Guess name: first text > 1 char, not a number / star / rank glyph
        name = None
        for t in raw['texts']:
            if (len(t) > 1
                    and not re.match(r'^[\d★✦•\-]+$', t)
                    and not re.match(r'^[45]$', t)
                    and 'Rank' not in t):
                name = t
                break
        if not name:
            name = f"Unknown_{char_id}"

        print(f"  [{i+1:3}/{len(raw_links)}] {name:<28}", end="", flush=True)

        # Scrape detail page
        detail = await scrape_detail(page, detail_url, game)

        # ── Rarity resolution (detail > card > default 5) ────────────────
        rarity = (
            detail.get('rarity')
            or raw.get('rarityFromCard')
            or 5
        )

        # ── Build char record ─────────────────────────────────────────────
        char = {
            "id":      char_id,
            "name":    name,
            "rarity":  rarity,
            "element": detail.get('element'),
            SPECIALTY_KEY[game]: detail.get('specialty'),
            "image_url": "",
            "page_url":  detail_url,
        }

        # ── Image URL ─────────────────────────────────────────────────────
        if game == 'wuwa':
            char['image_url'] = ENCORE_ICON_URL.format(id=char_id)
        elif detail.get('image_url'):
            char['image_url'] = detail['image_url']
        else:
            for src in raw['imgs']:
                real = next_decode(src) if '_next/image' in src else src
                if real and not real.startswith('data:'):
                    char['image_url'] = real
                    break

        # ── Download image ────────────────────────────────────────────────
        img_status = ''
        if download_images and char['image_url']:
            ext  = Path(char['image_url'].split('?')[0]).suffix or '.webp'
            dest = Path(f"images/{game}/{slugify(name)}{ext}")
            ok   = await download_image(char['image_url'], dest, http)
            char['image_local'] = str(dest) if ok else ''
            img_status = ' ✓img' if ok else ' ✗img'

        elem_str = char.get('element') or '—'
        spec_str = char.get(SPECIALTY_KEY[game]) or '—'
        print(f"  {rarity}★  {elem_str:<12} {spec_str:<14}{img_status}")

        characters.append(char)
        await asyncio.sleep(0.35)

    return characters

# ── Main ──────────────────────────────────────────────────────────────────────

async def main(games: list, download_images: bool):
    Path("data").mkdir(exist_ok=True)
    if download_images:
        for g in games:
            Path(f"images/{g}").mkdir(parents=True, exist_ok=True)

    results = {}

    async with httpx.AsyncClient(
        headers={"User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        )},
        limits=httpx.Limits(max_connections=6),
        timeout=20.0,
    ) as http:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            ctx = await browser.new_context(
                viewport={"width": 1280, "height": 900},
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                locale="en-US",
            )
            page = await ctx.new_page()

            # Block fonts & analytics to speed things up
            await page.route("**/*.{woff,woff2,ttf,otf}", lambda r: r.abort())
            await page.route("**/{gtag,analytics,clarity}/**", lambda r: r.abort())

            for game in games:
                chars = await scrape_game(
                    game, SITES[game], page,
                    download_images=download_images,
                    http=http,
                )
                results[game] = chars

                # Checkpoint save
                p = Path(f"data/characters_{game}.json")
                p.write_text(json.dumps(chars, ensure_ascii=False, indent=2), encoding='utf-8')
                print(f"\n  ✓ Saved {len(chars)} → {p}\n")

            await browser.close()

    # Merge
    merged = Path("data/characters_all.json")
    merged.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')

    print(f"\n{'═'*58}")
    print(f"  ✓ characters_all.json")
    for game, chars in results.items():
        spec   = SPECIALTY_KEY[game]
        e_ok   = sum(1 for c in chars if c.get('element'))
        s_ok   = sum(1 for c in chars if c.get(spec))
        r_dist = {}
        for c in chars:
            r_dist[c['rarity']] = r_dist.get(c['rarity'], 0) + 1
        r_str  = '  '.join(f"{r}★×{n}" for r, n in sorted(r_dist.items(), reverse=True))
        print(f"  {game:8s}: {len(chars):3d} chars | rarity: {r_str} | "
              f"elem:{e_ok:3d} {spec}:{s_ok:3d}")
    print(f"{'═'*58}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Gacha Planner scraper v3")
    parser.add_argument("--games", nargs="+",
                        choices=["genshin","hsr","zzz","wuwa","all"],
                        default=["all"])
    parser.add_argument("--no-images", action="store_true",
                        help="Skip image downloads")
    args = parser.parse_args()

    games = args.games
    if "all" in games:
        games = ["genshin","hsr","zzz","wuwa"]

    print(f"Games: {', '.join(games)} | Images: {not args.no_images}\n")
    asyncio.run(main(games=games, download_images=not args.no_images))
