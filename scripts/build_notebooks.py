"""Constroi os 8 notebooks de teste + ground_truth/defects.json.

Estrategia: um notebook "ouro" e definido como lista de celulas; cada variante
aplica transformacoes (defeitos) sobre ele. Os defeitos plantados sao
registrados no gabarito no momento da injecao — nunca depois.

Apos construir, cada notebook e executado (nbclient) para: (a) capturar a
metrica REAL e escrever o markdown de conclusao coerente (ou deliberadamente
divergente, defeito E1); (b) confirmar que os quebrados quebram e os limpos
executam.
"""
import copy
import json
import re
from pathlib import Path

import nbformat as nbf
from nbclient import NotebookClient

ROOT = Path(__file__).resolve().parent.parent
NB_DIR = ROOT / "notebooks"
GT = ROOT / "ground_truth" / "defects.json"
DATA_REL = "../data/churn.csv"

# ---------------------------------------------------------------- celulas base

def md(text):
    return nbf.v4.new_markdown_cell(text)

def code(src):
    return nbf.v4.new_code_cell(src)

def gold_cells(seeded=True, stratify=True):
    seed = ", random_state=42" if seeded else ""
    strat = ", stratify=y" if stratify else ""
    return [
        md("# Case Telecom — Previsão de Churn\n\nAnálise do dataset de retenção: limpeza, EDA, modelo e recomendação."),
        code(
            "import pandas as pd\nimport numpy as np\n"
            f"df = pd.read_csv('{DATA_REL}', sep=';')\n"
            "print(df.shape)"
        ),
        md("## Limpeza\nO CSV tem decimais com vírgula, datas em dois formatos e categorias inconsistentes — tratamos tudo explicitamente."),
        code(
            "for col in ['monthly_charges', 'total_charges']:\n"
            "    df[col] = pd.to_numeric(df[col].astype(str).str.replace(',', '.'), errors='coerce')\n"
            "df['reference_date'] = pd.to_datetime(df['reference_date'], format='mixed', dayfirst=True)\n"
            "df['internet_tech'] = df['internet_tech'].str.strip().str.lower().replace({'fibre': 'fiber'})\n"
            "df['avg_data_gb'] = df['avg_data_gb'].fillna(df['avg_data_gb'].median())\n"
            "df['total_charges'] = df['total_charges'].fillna(df['monthly_charges'] * df['tenure_months'])\n"
            "print(df.isna().sum().sum(), 'nulos restantes')"
        ),
        md("## EDA rápida"),
        code(
            "print('churn rate:', round(df.churned.mean(), 3))\n"
            "print(df.groupby('contract_type').churned.mean().round(3))"
        ),
        md("## Modelo\nSplit estratificado ANTES de qualquer transformação; pré-processamento aprende só no treino."),
        code(
            "from sklearn.model_selection import train_test_split\n"
            "from sklearn.pipeline import Pipeline\n"
            "from sklearn.compose import ColumnTransformer\n"
            "from sklearn.preprocessing import OneHotEncoder, StandardScaler\n"
            "from sklearn.linear_model import LogisticRegression\n"
            "num = ['tenure_months','monthly_charges','total_charges','avg_data_gb','n_support_calls','n_complaints','late_payment','has_autopay']\n"
            "cat = ['region','plan_type','contract_type','internet_tech']\n"
            "X, y = df[num + cat], df['churned']\n"
            f"X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25{seed}{strat})\n"
            "pre = ColumnTransformer([('n', StandardScaler(), num), ('c', OneHotEncoder(handle_unknown='ignore'), cat)])\n"
            f"model = Pipeline([('pre', pre), ('clf', LogisticRegression(max_iter=1000{seed}))])\n"
            "model.fit(X_tr, y_tr)"
        ),
        code(
            "from sklearn.metrics import roc_auc_score, recall_score, accuracy_score\n"
            "proba = model.predict_proba(X_te)[:, 1]\n"
            "pred = (proba >= 0.5).astype(int)\n"
            "print(f'AUC_TEST={roc_auc_score(y_te, proba):.3f}')\n"
            "print(f'RECALL_TEST={recall_score(y_te, pred):.3f}')\n"
            "print(f'ACC_TEST={accuracy_score(y_te, pred):.3f}')"
        ),
        md("__CONCLUSION__"),  # preenchido apos execucao com a metrica real
    ]

CONCLUSION_HONEST = (
    "## Conclusão\n\nO modelo atinge **AUC {auc}** no teste. Contrato mensal, reclamações e "
    "atraso de pagamento são os principais sinais de churn. Recomendo priorizar retenção "
    "proativa nos clientes de contrato mensal com reclamação recente. Limitações: sem "
    "validação temporal; próximo passo seria backtesting por mês de referência."
)

# ------------------------------------------------------------------- variantes
# Cada variante: (id, descricao, transform(cells)->(cells, defects))
# defects: lista de dicts {type, cell, note} — indices de celula 0-based FINAIS.

def v_gold(cells):
    return cells, []

def v_mediocre(cells):
    cells = copy.deepcopy(cells)
    c = gold_cells(seeded=True, stratify=False)
    c[3] = code(  # limpeza mais preguicosa, mas honesta e sem perda silenciosa
        "for col in ['monthly_charges', 'total_charges']:\n"
        "    df[col] = pd.to_numeric(df[col].astype(str).str.replace(',', '.'), errors='coerce')\n"
        "df = df.dropna(subset=['monthly_charges'])\n"
        "df['internet_tech'] = df['internet_tech'].str.strip().str.lower().replace({'fibre': 'fiber'})\n"
        "df = df.fillna(0)\n"
        "print('shape apos limpeza:', df.shape)  # perda reportada"
    )
    return c, []

def v_e1(cells):  # metrica declarada inflada
    cells = copy.deepcopy(cells)
    cells[-1] = md("__CONCLUSION_INFLATED__")
    return cells, [{"type": "E1", "cell": len(cells) - 1,
                    "note": "AUC declarado no markdown inflado em +0.20 vs execucao real"}]

def v_s1_s3(cells):  # scaler antes do split + celebracao de accuracy
    cells = copy.deepcopy(cells)
    cells[7] = code(
        "from sklearn.model_selection import train_test_split\n"
        "from sklearn.preprocessing import StandardScaler, OneHotEncoder\n"
        "from sklearn.linear_model import LogisticRegression\n"
        "from sklearn.compose import ColumnTransformer\n"
        "from sklearn.pipeline import Pipeline\n"
        "num = ['tenure_months','monthly_charges','total_charges','avg_data_gb','n_support_calls','n_complaints','late_payment','has_autopay']\n"
        "cat = ['region','plan_type','contract_type','internet_tech']\n"
        "# normaliza o dataset inteiro de uma vez para simplificar\n"
        "df[num] = StandardScaler().fit_transform(df[num])\n"
        "X, y = df[num + cat], df['churned']\n"
        "X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)\n"
        "pre = ColumnTransformer([('c', OneHotEncoder(handle_unknown='ignore'), cat)], remainder='passthrough')\n"
        "model = Pipeline([('pre', pre), ('clf', LogisticRegression(max_iter=1000, random_state=42))])\n"
        "model.fit(X_tr, y_tr)"
    )
    cells[-1] = md(
        "## Conclusão\n\nO modelo alcança **accuracy de __ACC__** — desempenho excelente, "
        "acertando a grande maioria dos clientes. O modelo está pronto para produção."
    )
    return cells, [
        {"type": "S1", "cell": 7, "note": "StandardScaler.fit_transform no dataset inteiro antes do split (leakage)"},
        {"type": "S3", "cell": len(cells) - 1, "note": "celebra accuracy em base ~84/16 sem discutir desbalanceamento nem recall"},
    ]

def v_e2_e4(cells):  # celula quebrada + conclusao orfa
    cells = copy.deepcopy(cells)
    cells.insert(8, code(
        "# analise por segmento\n"
        "seg = importancias.sort_values(ascending=False)  # 'importancias' nunca foi definida\n"
        "print(seg.head())"
    ))
    cells[-1] = md(
        "## Conclusão\n\nO modelo tem bom desempenho e o **recall de 0.80 no segmento prepaid** "
        "mostra que capturamos bem o churn onde ele mais dói. As importâncias de variáveis "
        "confirmam tenure e reclamações como principais fatores."
    )
    return cells, [
        {"type": "E2", "cell": 8, "note": "usa variavel 'importancias' nunca definida — quebra em execucao limpa"},
        {"type": "E4", "cell": len(cells) - 1, "note": "cita 'recall 0.80 no segmento prepaid'; nenhuma celula computa recall por segmento"},
    ]

def v_s2_e1(cells):  # feature derivada do target + metrica inflada
    cells = copy.deepcopy(cells)
    cells.insert(6, code(
        "# feature de risco composta\n"
        "df['risk_score'] = df['churned'] * df['n_complaints'] + df['late_payment']\n"
        "print(df['risk_score'].describe())"
    ))
    src = cells[8].source.replace(
        "num = ['tenure_months'", "num = ['risk_score','tenure_months'")
    cells[8] = code(src)
    cells[-1] = md("__CONCLUSION_INFLATED_SMALL__")
    return cells, [
        {"type": "S2", "cell": 6, "note": "feature 'risk_score' construida a partir do proprio target churned"},
        {"type": "E1", "cell": len(cells) - 1, "note": "AUC declarado nao bate com o executado (gap > 0.15)"},
    ]

def v_e3_s4(cells):  # sem seed + perda silenciosa de linhas
    c = gold_cells(seeded=False, stratify=True)
    c[3] = code(
        "for col in ['monthly_charges', 'total_charges']:\n"
        "    df[col] = pd.to_numeric(df[col].astype(str).str.replace(',', '.'), errors='coerce')\n"
        "# padroniza datas assumindo ISO; o que nao encaixar vira NaT\n"
        "df['reference_date'] = pd.to_datetime(df['reference_date'], format='%Y-%m-%d', errors='coerce')\n"
        "df = df.dropna(subset=['reference_date', 'total_charges'])\n"
        "df['internet_tech'] = df['internet_tech'].str.strip().str.lower().replace({'fibre': 'fiber'})\n"
        "df = df.fillna(0)\n"
        "print('ok')"
    )
    c[-1] = md(
        "## Conclusão\n\nModelo com **AUC __AUC__** no teste. Dados estavam razoavelmente "
        "limpos; contrato mensal e reclamações lideram o churn."
    )
    return c, [
        {"type": "S4", "cell": 3, "note": "to_datetime assume formato ISO com errors='coerce'; ~30% das linhas (datas dd/mm/YYYY) viram NaT e sao descartadas silenciosamente pelo dropna, sem qualquer mencao"},
        {"type": "E3", "cell": 7, "note": "train_test_split e LogisticRegression sem random_state — metrica varia entre execucoes"},
    ]

def v_multi(cells):  # o caso claramente reprovavel: S1 + E1 + E4
    c, d = v_s1_s3(cells)
    c[-1] = md(
        "## Conclusão\n\nExcelente resultado: **AUC de 0.97** e **precision de 0.91 nos clientes fiber** "
        "comprovam que o modelo está pronto. Recomendo deploy imediato."
    )
    d = [d[0],
         {"type": "E1", "cell": len(c) - 1, "note": "AUC 0.97 declarado; execucao real fica muito abaixo"},
         {"type": "E4", "cell": len(c) - 1, "note": "cita 'precision 0.91 nos clientes fiber'; nenhuma celula computa precision por segmento"}]
    return c, d

VARIANTS = [
    ("nb01_strong",    "candidato forte — limpo",                v_gold,     "AVANCAR"),
    ("nb02_honest",    "candidato mediano honesto — limpo",      v_mediocre, "REVISAR"),
    ("nb03_inflated",  "metrica inflada no texto",               v_e1,       "REPROVAR"),
    ("nb04_leak_acc",  "leakage de scaler + accuracy enganosa",  v_s1_s3,    "REPROVAR"),
    ("nb05_broken",    "celula quebrada + conclusao orfa",       v_e2_e4,    "REPROVAR"),
    ("nb06_target",    "feature do target + metrica inflada",    v_s2_e1,    "REPROVAR"),
    ("nb07_unstable",  "sem seed + perda silenciosa de dados",   v_e3_s4,    "REPROVAR"),
    ("nb08_multi",     "multiplos defeitos criticos",            v_multi,    "REPROVAR"),
]

# ------------------------------------------------------------------- execucao

def execute(nb, cwd):
    client = NotebookClient(nb, timeout=120, kernel_name="python3",
                            resources={"metadata": {"path": str(cwd)}},
                            allow_errors=True)
    return client.execute()

def real_metric(nb, name):
    pat = re.compile(rf"{name}=([0-9.]+)")
    for cell in nb.cells:
        for out in cell.get("outputs", []):
            text = out.get("text", "") or "".join(
                out.get("data", {}).get("text/plain", ""))
            m = pat.search(text)
            if m:
                return float(m.group(1))
    return None

def main():
    NB_DIR.mkdir(exist_ok=True)
    gt = {"dataset_note": "notebooks gerados por scripts/build_notebooks.py a partir do notebook ouro; defeitos registrados no momento da injecao", "notebooks": {}}
    for name, desc, fn, decision in VARIANTS:
        cells, defects = fn(gold_cells())
        nb = nbf.v4.new_notebook(cells=cells,
                                 metadata={"kernelspec": {"name": "python3", "language": "python", "display_name": "Python 3"}})
        nb = execute(nb, NB_DIR)
        auc = real_metric(nb, "AUC_TEST")
        acc = real_metric(nb, "ACC_TEST")
        # preenche conclusoes dependentes da metrica real
        last = nb.cells[-1]
        if last.cell_type == "markdown":
            if "__CONCLUSION__" in last.source:
                last.source = CONCLUSION_HONEST.format(auc=f"{auc:.3f}" if auc else "n/d")
            elif "__CONCLUSION_INFLATED__" in last.source:
                declared = round(min(auc + 0.20, 0.99), 2)
                last.source = (f"## Conclusão\n\nO modelo atinge **AUC {declared}** no teste, um resultado "
                               "excelente que supera benchmarks do setor. Pronto para produção.")
            elif "__CONCLUSION_INFLATED_SMALL__" in last.source:
                declared = round(min((auc or 0.7) + 0.17, 0.995), 2)
                last.source = (f"## Conclusão\n\nCom a nova feature de risco, o modelo chega a **AUC {declared}**. "
                               "A engenharia de atributos fez toda a diferença.")
            elif "__AUC__" in last.source:
                last.source = last.source.replace("__AUC__", f"{auc:.3f}" if auc else "n/d")
            elif "__ACC__" in last.source:
                last.source = last.source.replace("__ACC__", f"{acc:.3f}" if acc else "n/d")
        # limpa outputs (candidato entregaria executado, mas queremos que o
        # executor rode do zero; a versao 'entregue' mantem outputs)
        nbf.write(nb, NB_DIR / f"{name}.ipynb")
        gt["notebooks"][name] = {
            "description": desc,
            "expected_decision": decision,
            "defects": defects,
            "real_auc_at_build": auc,
        }
        errs = sum(1 for c in nb.cells for o in c.get("outputs", []) if o.get("output_type") == "error")
        print(f"{name}: auc_real={auc} acc={acc} defeitos={len(defects)} celulas_com_erro={errs}")
    GT.write_text(json.dumps(gt, indent=2, ensure_ascii=False))
    total = sum(len(v["defects"]) for v in gt["notebooks"].values())
    print(f"\nground truth: {GT} — {total} defeitos plantados em {len(VARIANTS)} notebooks")

if __name__ == "__main__":
    main()
