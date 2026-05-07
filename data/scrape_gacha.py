"""
Gacha Planner — Scraper de personnages
Sources :
  - Genshin  : genshin.akademiya.app
  - HSR      : starrail.akademiya.app
  - ZZZ      : zzz.akademiya.app
  - WuWa     : wuwa.akademiya.app  (images via api-v2.encore.moe)

Usage :
  pip install requests beautifulsoup4
  python scrape_gacha.py

Output :
  characters_genshin.json
  characters_hsr.json
  characters_zzz.json
  characters_wuwa.json
  images/<game>/<slug>.webp   (si --download-images)
"""

import json
import re
import time
import argparse
from pathlib import Path
from urllib.parse import unquote

import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://google.com",
}

SESSION = requests.Session()
SESSION.headers.update(HEADERS)


# ─── Helpers ────────────────────────────────────────────────────────────────

def fetch(url: str, retries=3, delay=1.5) -> requests.Response | None:
    for attempt in range(retries):
        try:
            r = SESSION.get(url, timeout=15)
            if r.status_code == 200:
                return r
            print(f"  [!] {url} → {r.status_code}")
            time.sleep(delay)
        except Exception as e:
            print(f"  [!] {url} → {e}")
            time.sleep(delay)
    return None


def save_json(data: list, path: str):
    Path(path).write_text(json.dumps(data, ensure_ascii=False, indent=2))
    print(f"  ✓ Saved {len(data)} chars → {path}")


def download_image(url: str, dest: Path):
    if dest.exists():
        return
    r = fetch(url)
    if r:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(r.content)


def next_image_to_real_url(next_img_url: str) -> str:
    """
    Akademiya uses Next.js image optimization:
    /_next/image?url=<encoded_url>&w=128&q=75
    → decode to get the real asset URL
    """
    m = re.search(r"url=([^&]+)", next_img_url)
    if m:
        return unquote(m.group(1))
    return next_img_url


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


# ─── Generic Akademiya parser ────────────────────────────────────────────────

def parse_akademiya_chars(game: str, base_url: str, image_cdn: str = "static.nanoka.cc") -> list:
    """
    Parses the /en/characters page of an Akademiya site.
    Returns list of dicts: id, name, rarity, element, specialty, image_url, page_url
    """
    list_url = f"{base_url}/en/characters"
    print(f"\n[{game.upper()}] Fetching list: {list_url}")
    r = fetch(list_url)
    if not r:
        print(f"  [!] Failed to fetch {list_url}")
        return []

    soup = BeautifulSoup(r.text, "html.parser")
    chars = []

    # Character cards are <a href="/en/characters/ID"> with nested img tags
    for a in soup.find_all("a", href=re.compile(r"/en/characters/\d+")):
        href = a.get("href", "")
        char_id = href.split("/")[-1]
        page_url = base_url + href

        # Extract text nodes (name, element, specialty, rarity)
        texts = [t.strip() for t in a.stripped_strings]
        # Filter out empty strings and icon alt texts that are duplicates
        texts = [t for t in texts if t and not t.endswith("icon")]

        name = texts[0] if texts else "Unknown"

        # Rarity — look for "5" or "4" in texts
        rarity = 5
        for t in texts:
            if t in ("5", "4"):
                rarity = int(t)
                break

        # Element / specialty — varies by game
        # For ZZZ: element + specialty (Attack, Stun, Anomaly...)
        # For WuWa: weapon type
        # For GI/HSR: element
        element = None
        specialty = None
        for t in texts:
            if t in (
                # ZZZ elements
                "Electric", "Physical", "Ether", "Fire", "Ice", "Wind",
                # GI elements
                "Pyro", "Hydro", "Anemo", "Electro", "Dendro", "Cryo", "Geo",
                # HSR elements
                "Lightning", "Quantum", "Imaginary",
                # WuWa elements
                "Glacio", "Fusion", "Havoc", "Spectro", "Aero",
            ):
                element = t
            elif t in (
                # ZZZ specialties
                "Attack", "Stun", "Anomaly", "Support", "Defense", "Rupture",
                # WuWa weapons
                "Sword", "Broadblade", "Pistols", "Gauntlets", "Rectifier",
                # HSR paths
                "Hunt", "Erudition", "Harmony", "Nihility", "Preservation",
                "Abundance", "Destruction", "Remembrance", "Propagation",
            ):
                specialty = t

        # Image — find the first <img> inside the link
        img_tag = a.find("img")
        image_url = ""
        if img_tag:
            src = img_tag.get("src", "")
            if "_next/image" in src:
                image_url = next_image_to_real_url(src)
            else:
                image_url = src

        chars.append({
            "id": char_id,
            "name": name,
            "rarity": rarity,
            "element": element,
            "specialty": specialty,
            "image_url": image_url,
            "page_url": page_url,
        })

    print(f"  → Found {len(chars)} characters")
    return chars


# ─── Detail page enrichment ──────────────────────────────────────────────────

def enrich_from_detail(char: dict, delay=0.5) -> dict:
    """
    Optionally fetch the detail page to get a higher-res portrait and
    confirm element/specialty if missing from list page.
    """
    r = fetch(char["page_url"])
    if not r:
        return char

    soup = BeautifulSoup(r.text, "html.parser")

    # Try to find a larger portrait image
    for img in soup.find_all("img"):
        src = img.get("src", "")
        alt = img.get("alt", "").lower()
        if char["name"].lower() in alt and "portrait" in alt:
            if "_next/image" in src:
                char["image_url_hd"] = next_image_to_real_url(src)
            else:
                char["image_url_hd"] = src
            break

    time.sleep(delay)
    return char


# ─── Game-specific scrapers ──────────────────────────────────────────────────

def scrape_genshin(download_images=False) -> list:
    chars = parse_akademiya_chars("genshin", "https://genshin.akademiya.app")
    if download_images:
        for c in chars:
            if c["image_url"]:
                download_image(c["image_url"], Path(f"images/genshin/{slug(c['name'])}.webp"))
                time.sleep(0.3)
    save_json(chars, "characters_genshin.json")
    return chars


def scrape_hsr(download_images=False) -> list:
    chars = parse_akademiya_chars("hsr", "https://starrail.akademiya.app")
    if download_images:
        for c in chars:
            if c["image_url"]:
                download_image(c["image_url"], Path(f"images/hsr/{slug(c['name'])}.webp"))
                time.sleep(0.3)
    save_json(chars, "characters_hsr.json")
    return chars


def scrape_zzz(download_images=False) -> list:
    chars = parse_akademiya_chars("zzz", "https://zzz.akademiya.app")
    if download_images:
        for c in chars:
            if c["image_url"]:
                download_image(c["image_url"], Path(f"images/zzz/{slug(c['name'])}.webp"))
                time.sleep(0.3)
    save_json(chars, "characters_zzz.json")
    return chars


def scrape_wuwa(download_images=False) -> list:
    """
    WuWa uses api-v2.encore.moe for assets.
    The character list page already embeds the encore.moe image URLs.
    """
    chars = parse_akademiya_chars("wuwa", "https://wuwa.akademiya.app")

    # encore.moe image pattern for character portraits:
    # https://api-v2.encore.moe/resource/...
    # If image_url is already an encore.moe URL, keep it.
    # Otherwise try to build one from the char ID.
    ENCORE_BASE = "https://api-v2.encore.moe"
    for c in chars:
        if not c["image_url"] or "encore.moe" not in c["image_url"]:
            # Fallback pattern (encore.moe uses role IDs)
            c["image_url_encore"] = f"{ENCORE_BASE}/role/{c['id']}/icon"
        else:
            c["image_url_encore"] = c["image_url"]

    if download_images:
        for c in chars:
            url = c.get("image_url_encore") or c.get("image_url")
            if url:
                download_image(url, Path(f"images/wuwa/{slug(c['name'])}.webp"))
                time.sleep(0.3)

    save_json(chars, "characters_wuwa.json")
    return chars


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Gacha Planner character scraper")
    parser.add_argument("--games", nargs="+",
                        choices=["genshin", "hsr", "zzz", "wuwa", "all"],
                        default=["all"], help="Which games to scrape")
    parser.add_argument("--download-images", action="store_true",
                        help="Also download character images locally")
    args = parser.parse_args()

    games = args.games
    if "all" in games:
        games = ["genshin", "hsr", "zzz", "wuwa"]

    print("=== Gacha Planner Scraper ===")
    print(f"Games: {', '.join(games)}")
    print(f"Download images: {args.download_images}\n")

    scrapers = {
        "genshin": scrape_genshin,
        "hsr": scrape_hsr,
        "zzz": scrape_zzz,
        "wuwa": scrape_wuwa,
    }

    results = {}
    for game in games:
        results[game] = scrapers[game](download_images=args.download_images)
        time.sleep(1)  # polite delay between games

    print("\n=== Done ===")
    for game, chars in results.items():
        print(f"  {game}: {len(chars)} characters")

    # Merge all into one file for the planner
    all_chars = {}
    for game, chars in results.items():
        all_chars[game] = chars
    Path("characters_all.json").write_text(
        json.dumps(all_chars, ensure_ascii=False, indent=2)
    )
    print("\n  ✓ Merged → characters_all.json")


if __name__ == "__main__":
    main()
