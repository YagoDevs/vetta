"""Port LLMClient + adapters: OpenAI real e Replay offline.

Toda chamada real e gravada em runs/<run_id>/calls/ — o adapter de replay
serve essas respostas sem rede nem chave, tornando `make reproduce`
deterministico e gratuito para o juiz.
"""
import hashlib
import json
import os
from pathlib import Path
from typing import Protocol

MODEL = "gpt-5.2-2025-12-11"  # snapshot datado, pinado (reprodutibilidade)


class LLMClient(Protocol):
    def complete(self, system: str, user: str, tag: str) -> dict: ...


def _call_key(system: str, user: str, tag: str) -> str:
    h = hashlib.sha256(f"{MODEL}\n{system}\n{user}".encode()).hexdigest()[:16]
    return f"{tag}_{h}"


class OpenAIClient:
    """Adapter real. Grava cada resposta para replay posterior."""

    def __init__(self, record_dir: Path):
        from dotenv import load_dotenv
        from openai import OpenAI
        load_dotenv()
        self._client = OpenAI()
        self.record_dir = record_dir
        record_dir.mkdir(parents=True, exist_ok=True)

    def complete(self, system: str, user: str, tag: str) -> dict:
        resp = self._client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "system", "content": system},
                      {"role": "user", "content": user}],
            response_format={"type": "json_object"},
        )
        out = json.loads(resp.choices[0].message.content)
        rec = {
            "model": MODEL, "tag": tag, "system": system, "user": user,
            "response": out,
            "usage": {"prompt": resp.usage.prompt_tokens, "completion": resp.usage.completion_tokens},
        }
        path = self.record_dir / f"{_call_key(system, user, tag)}.json"
        path.write_text(json.dumps(rec, indent=2, ensure_ascii=False))
        return out


class ReplayClient:
    """Adapter offline: responde com as gravacoes de uma run oficial.

    Sem rede, sem chave, deterministico — o modo padrao de reproducao.
    """

    def __init__(self, record_dir: Path):
        self.record_dir = record_dir

    def complete(self, system: str, user: str, tag: str) -> dict:
        path = self.record_dir / f"{_call_key(system, user, tag)}.json"
        if not path.exists():
            raise FileNotFoundError(
                f"Sem gravacao para {tag} ({path.name}). Os inputs mudaram desde a "
                "run oficial — rode com --live (requer OPENAI_API_KEY) ou restaure os inputs.")
        return json.loads(path.read_text())["response"]


def make_client(mode: str, record_dir: Path) -> LLMClient:
    if mode == "live":
        return OpenAIClient(record_dir)
    if mode == "replay":
        return ReplayClient(record_dir)
    raise ValueError(f"modo LLM desconhecido: {mode}")
