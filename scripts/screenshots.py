"""Captura screenshots de cada tela do vetta para o README (Playwright)."""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8000"
OUT = Path(__file__).resolve().parent.parent / "docs" / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)


def shot(page, name, full=False):
    page.screenshot(path=str(OUT / f"{name}.png"), full_page=full)
    print("saved", name)


with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=2)

    # 1. landing (hero) + landing completa
    page.goto(BASE, wait_until="networkidle")
    time.sleep(2.0)  # deixa a animacao reveal-up assentar
    shot(page, "01-landing-hero")
    shot(page, "02-landing-full", full=True)

    # 2. app vazio
    page.get_by_role("button", name="See the evidence").click()
    time.sleep(1.0)
    shot(page, "03-app-empty")

    # 3. wizard — passo "The process"
    page.get_by_role("button", name="+ New evaluation").first.click()
    time.sleep(0.8)
    shot(page, "04-wizard-process")
    # passo Name
    page.get_by_role("button", name="Continue").click()
    time.sleep(0.7)
    page.get_by_placeholder("evaluation name").fill("Senior DS — September")
    shot(page, "05-wizard-name")
    # passo Profile
    page.get_by_role("button", name="Continue").click()
    time.sleep(0.7)
    page.get_by_role("button", name="Rigorous methodology").click()
    page.get_by_role("button", name="Honest reporting").click()
    shot(page, "06-wizard-profile")
    # passo Notebooks (dropzone)
    page.get_by_role("button", name="Continue").click()
    time.sleep(0.7)
    shot(page, "07-wizard-dropzone")
    # sai do wizard
    page.get_by_role("button", name="exit").click()
    time.sleep(0.6)

    # 4. queue — abre official_a
    page.get_by_role("button", name="Official A").first.click()
    time.sleep(1.2)
    shot(page, "08-queue", full=True)

    # 5. detail / conversa — abre o primeiro "open evidence"
    page.get_by_role("button", name="open evidence ›").first.click()
    time.sleep(2.0)  # bolhas slide-in
    shot(page, "09-detail-conversation", full=True)

    # 6. comparison
    page.get_by_role("button", name="Baseline vs. vetta").click()
    time.sleep(1.2)
    shot(page, "10-comparison", full=True)

    # 7. quarantine — abre security-demo e o candidato quarentinado
    page.get_by_role("button", name="Security Demo").first.click()
    time.sleep(1.2)
    shot(page, "11-queue-quarantine", full=True)
    try:
        page.get_by_role("button", name="open evidence ›").first.click()
        time.sleep(1.5)
        shot(page, "12-detail-quarantine", full=True)
    except Exception as e:
        print("quarantine detail skipped:", e)

    b.close()
print("done")
