# vetta — todos os fluxos do juiz num comando
VENV=.venv/bin

setup:            ## cria venv e instala dependencias pinadas
	python3 -m venv .venv && $(VENV)/pip install -r requirements.txt

data:             ## regenera o dataset sintetico (deterministico, seed 42)
	$(VENV)/python scripts/gen_data.py

notebooks:        ## regenera os 8 notebooks de teste + gabarito
	$(VENV)/python scripts/build_notebooks.py

reproduce:        ## OFFLINE, sem chave: replay das 3 runs oficiais + avaliacao
	for run in official_a official_b official_c; do \
	  $(VENV)/python vetta.py run notebooks/ --mode replay --run-id $$run; \
	  $(VENV)/python baseline.py notebooks/ --mode replay --run-id $$run; \
	  $(VENV)/python evaluate.py --run-id $$run; \
	done

rerun:            ## refaz tudo AO VIVO (requer OPENAI_API_KEY no .env, ~US$2)
	for run in fresh_a fresh_b fresh_c; do \
	  $(VENV)/python vetta.py run notebooks/ --mode live --run-id $$run; \
	  $(VENV)/python baseline.py notebooks/ --mode live --run-id $$run; \
	  $(VENV)/python evaluate.py --run-id $$run; \
	done

smoke:            ## 1 notebook ao vivo, ~30s, ~US$0.05 (valida a chave/setup)
	$(VENV)/python vetta.py run notebooks/ --mode live --run-id smoke || true

serve:            ## dashboard + API em http://localhost:8000
	$(VENV)/uvicorn api.main:app --port 8000

frontend:         ## rebuild do frontend (requer node)
	cd frontend && npm install && npm run build

help:
	@grep -E '^[a-z]+:.*##' Makefile | sed 's/:.*##/ —/'
.PHONY: setup data notebooks reproduce rerun smoke serve frontend help
