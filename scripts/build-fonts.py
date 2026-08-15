#!/usr/bin/env python3
"""
Genera las fuentes de Caudal.

React Native no soporta ejes de fuentes variables, asi que el eje de ancho de
Archivo (wdth 62-125) que pide el manual de marca no se puede mover en runtime.
Este script corta instancias estaticas exactas del Archivo variable y les pone
un nombre de familia unico para que iOS no las confunda entre si.

Uso:  python3 scripts/build-fonts.py
Salida: assets/fonts/*.ttf
"""

import os
import sys
import urllib.request

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS_DIR = os.path.join(ROOT, "assets", "fonts")
CACHE_DIR = os.path.join(ROOT, ".cache", "fonts")

GF = "https://raw.githubusercontent.com/google/fonts/main"
ARCHIVO_VF = f"{GF}/ofl/archivo/Archivo%5Bwdth,wght%5D.ttf"
PLEX_MONO = {
    "IBMPlexMono-Regular.ttf": f"{GF}/ofl/ibmplexmono/IBMPlexMono-Regular.ttf",
    "IBMPlexMono-Medium.ttf": f"{GF}/ofl/ibmplexmono/IBMPlexMono-Medium.ttf",
}

# (familia, subfamilia, wdth, wght) — valores del manual de marca, seccion 04.
# El archivo se llama igual que el nombre PostScript a proposito: iOS resuelve la
# fuente por su nombre PostScript y Android por el nombre del archivo, asi que el
# mismo string de fontFamily funciona en las dos plataformas.
INSTANCES = [
    ("Caudal Display", "Bold", 118, 700),
    ("Caudal Title", "SemiBold", 106, 620),
    ("Caudal Text", "Regular", 100, 400),
    ("Caudal Text", "Medium", 100, 550),
    ("Caudal Micro", "Bold", 100, 650),
]

MAC = dict(platformID=1, platEncID=0, langID=0x0)
WIN = dict(platformID=3, platEncID=1, langID=0x409)


def download(url: str, dest: str) -> str:
    if os.path.exists(dest):
        return dest
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    print(f"  bajando {os.path.basename(dest)}")
    req = urllib.request.Request(url, headers={"User-Agent": "caudal-build"})
    with urllib.request.urlopen(req) as r, open(dest, "wb") as f:
        f.write(r.read())
    return dest


def rename(font: TTFont, family: str, subfamily: str) -> None:
    """Reescribe la tabla de nombres para que cada instancia sea una familia propia."""
    full = f"{family} {subfamily}"
    ps = full.replace(" ", "")
    name = font["name"]
    # 16/17 (typographic family) haria que iOS reagrupe las instancias: fuera.
    name.names = [n for n in name.names if n.nameID not in (1, 2, 3, 4, 6, 16, 17, 21, 22)]
    for ids in (MAC, WIN):
        name.setName(family, 1, **ids)
        name.setName(subfamily, 2, **ids)
        name.setName(f"{ps};caudal", 3, **ids)
        name.setName(full, 4, **ids)
        name.setName(ps, 6, **ids)


def main() -> int:
    os.makedirs(FONTS_DIR, exist_ok=True)
    vf_path = download(ARCHIVO_VF, os.path.join(CACHE_DIR, "Archivo-VF.ttf"))

    for family, subfamily, wdth, wght in INSTANCES:
        out_name = f"{family}{subfamily}".replace(" ", "") + ".ttf"
        print(f"  instanciando {out_name}  (wdth {wdth}, wght {wght})")
        font = TTFont(vf_path)
        instancer.instantiateVariableFont(
            font, {"wdth": wdth, "wght": wght}, inplace=True, updateFontNames=False
        )
        rename(font, family, subfamily)
        font.save(os.path.join(FONTS_DIR, out_name))

    for out_name, url in PLEX_MONO.items():
        download(url, os.path.join(FONTS_DIR, out_name))

    print("\nfuentes en assets/fonts:")
    for f in sorted(os.listdir(FONTS_DIR)):
        size = os.path.getsize(os.path.join(FONTS_DIR, f)) // 1024
        print(f"  {f}  {size} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
