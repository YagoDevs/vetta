"""Grava um screencast silencioso do fluxo do vetta (B-roll para dublar depois)."""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8000"
VID = Path(__file__).resolve().parent.parent / "docs" / "video"
VID.mkdir(parents=True, exist_ok=True)
DEMO = Path(__file__).resolve().parent.parent / "demo_candidates"
FILES = [str(DEMO / f) for f in ["ana_ferreira.ipynb", "carla_mendes.ipynb",
                                 "elisa_martins.ipynb", "gabriela_lima.ipynb"]]


def smooth_scroll(page, to, steps=40, pause=0.10):
    cur = page.evaluate("window.scrollY")
    for i in range(1, steps + 1):
        y = cur + (to - cur) * i / steps
        page.evaluate(f"window.scrollTo(0, {y})")
        time.sleep(pause)


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1440, "height": 900},
                        record_video_dir=str(VID),
                        record_video_size={"width": 1440, "height": 900})
    page = ctx.new_page()

    # 1. LANDING — scroll lento topo -> rodape
    page.goto(BASE, wait_until="networkidle")
    time.sleep(4.75)
    full = page.evaluate("document.body.scrollHeight")
    smooth_scroll(page, full * 0.30); time.sleep(2.28)
    smooth_scroll(page, full * 0.55); time.sleep(2.28)
    smooth_scroll(page, full * 0.80); time.sleep(2.28)
    smooth_scroll(page, full); time.sleep(2.85)
    smooth_scroll(page, 0, steps=12); time.sleep(1.52)

    # 2. entra no app
    page.get_by_role("button", name="See the evidence").click()
    time.sleep(2.85)

    # 3. WIZARD — passo a passo ate a dropzone (sem submeter, evita run ao vivo)
    page.get_by_role("button", name="+ New evaluation").first.click(); time.sleep(2.85)
    page.get_by_role("button", name="Continue").click(); time.sleep(2.28)          # -> Name
    page.get_by_placeholder("evaluation name").type("DS Screening", delay=110); time.sleep(1.9)
    page.get_by_role("button", name="Continue").click(); time.sleep(2.28)          # -> Profile
    page.get_by_role("button", name="Rigorous methodology").click()
    page.get_by_role("button", name="Honest reporting").click(); time.sleep(2.28)
    page.get_by_role("button", name="Continue").click(); time.sleep(2.28)          # -> Notebooks
    page.set_input_files("input[type=file]", FILES); time.sleep(3.8)             # arquivos aparecem na lista
    page.get_by_role("button", name="exit").click(); time.sleep(1.9)            # sai sem gastar API

    # 4. QUEUE — abre Official A e rola
    page.get_by_role("button", name="Official A").first.click(); time.sleep(2.85)
    smooth_scroll(page, 700); time.sleep(1.9)
    smooth_scroll(page, 1500); time.sleep(1.9)
    smooth_scroll(page, 0, steps=10); time.sleep(1.52)

    # 5. CARLA MENDES — a evidencia
    page.locator("article", has_text="Carla Mendes").get_by_role("button", name="open evidence ›").click()
    time.sleep(4.75)  # bolhas slide-in
    smooth_scroll(page, 500); time.sleep(3.8)   # para na evidencia da metrica
    smooth_scroll(page, 950); time.sleep(2.85)
    # registra decisao
    page.get_by_role("button", name="Reject").first.click(); time.sleep(2.85)
    # trajetoria do agente
    page.get_by_role("button", name="what the agent did").click(); time.sleep(2.28)
    smooth_scroll(page, 1400); time.sleep(3.42)
    smooth_scroll(page, 0, steps=10); time.sleep(1.14)

    # 6. BASELINE vs VETTA
    page.get_by_role("button", name="Baseline vs. vetta").click(); time.sleep(3.42)
    smooth_scroll(page, 500); time.sleep(2.85)
    smooth_scroll(page, 1000); time.sleep(2.85)
    smooth_scroll(page, 0, steps=8); time.sleep(1.14)

    # 7. SEGURANCA — Mallory quarentinada
    page.get_by_role("button", name="Security Demo").first.click(); time.sleep(2.85)
    page.locator("article", has_text="Mallory Hacker").get_by_role("button", name="open evidence ›").click()
    time.sleep(4.75)
    smooth_scroll(page, 600); time.sleep(3.8)
    smooth_scroll(page, 1100); time.sleep(2.85)

    # 8. FECHO — volta a landing
    page.get_by_role("button", name="vetta").first.click(); time.sleep(2.85)
    full = page.evaluate("document.body.scrollHeight")
    smooth_scroll(page, full, steps=30); time.sleep(3.8)

    ctx.close()   # finaliza o video
    b.close()

# renomeia o webm gerado
webm = sorted(VID.glob("*.webm"))[-1]
print("VIDEO_WEBM:", webm)
