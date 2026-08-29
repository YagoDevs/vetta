"""Gera o dataset sintetico de churn usado pelos notebooks de teste.

Inspirado no formato de um case real de telecom: separador ';', decimais com
virgula, datas em formatos mistos, categorias inconsistentes e nulos — as
sujeiras que um bom candidato precisa tratar. Seed fixa: o CSV gerado e
identico em qualquer maquina (verificado por hash no run_all).
"""
import hashlib
import numpy as np
import pandas as pd
from pathlib import Path

SEED = 42
N = 6000
OUT = Path(__file__).resolve().parent.parent / "data" / "churn.csv"

rng = np.random.default_rng(SEED)

region = rng.choice(["Southeast", "South", "North", "Northeast", "Center-West"], N)
plan = rng.choice(["prepaid", "postpaid"], N, p=[0.45, 0.55])
contract = rng.choice(["monthly", "annual"], N, p=[0.6, 0.4])
tech_clean = rng.choice(["fiber", "dsl", "cable"], N, p=[0.5, 0.3, 0.2])
tenure = rng.integers(1, 72, N)
monthly = np.round(rng.uniform(30, 180, N), 2)
support_calls = rng.poisson(0.8, N)
complaints = rng.poisson(0.3, N)
late_payment = rng.binomial(1, 0.15, N)
autopay = rng.binomial(1, 0.55, N)
data_gb = np.round(rng.gamma(3, 4, N), 2)

# Churn com sinal real: contrato mensal, pouca tenure, reclamacoes e atraso pesam
logit = (
    -2.2
    + 0.9 * (contract == "monthly")
    - 0.03 * tenure
    + 0.55 * complaints
    + 0.35 * support_calls
    + 0.8 * late_payment
    - 0.4 * autopay
    + 0.004 * monthly
)
churned = rng.binomial(1, 1 / (1 + np.exp(-logit)))

df = pd.DataFrame(
    {
        "customer_id": rng.choice(np.arange(10000, 99999), N, replace=False),
        "reference_date": tenure,  # placeholder, vira data suja abaixo
        "region": region,
        "plan_type": plan,
        "contract_type": contract,
        "internet_tech": tech_clean,
        "tenure_months": tenure,
        "has_autopay": autopay,
        "monthly_charges": monthly,
        "total_charges": np.round(monthly * tenure * rng.uniform(0.9, 1.1, N), 2),
        "avg_data_gb": data_gb,
        "n_support_calls": support_calls,
        "n_complaints": complaints,
        "late_payment": late_payment,
        "churned": churned,
    }
)

# --- sujeiras deliberadas (como no case real) -------------------------------
# 1. datas em dois formatos
dates_iso = pd.to_datetime("2024-01-01") + pd.to_timedelta(rng.integers(0, 365, N), "D")
mixed = np.where(
    rng.random(N) < 0.3,
    dates_iso.strftime("%d/%m/%Y"),
    dates_iso.strftime("%Y-%m-%d"),
)
df["reference_date"] = mixed
# 2. categorias inconsistentes: 'fiber', 'FIBRE', ' fiber '
mask = df["internet_tech"] == "fiber"
noise = rng.random(N)
df.loc[mask & (noise < 0.1), "internet_tech"] = "FIBRE"
df.loc[mask & (noise > 0.92), "internet_tech"] = " fiber "
# 3. nulos em colunas numericas
for col in ("avg_data_gb", "total_charges"):
    df.loc[rng.random(N) < 0.04, col] = np.nan
# 4. decimais com virgula (estilo pt-BR) em duas colunas
for col in ("monthly_charges", "total_charges"):
    df[col] = df[col].map(lambda v: str(v).replace(".", ",") if pd.notna(v) else "")

OUT.parent.mkdir(parents=True, exist_ok=True)
df.to_csv(OUT, sep=";", index=False)
digest = hashlib.sha256(OUT.read_bytes()).hexdigest()[:16]
print(f"wrote {OUT} rows={len(df)} churn_rate={churned.mean():.3f} sha256[:16]={digest}")
