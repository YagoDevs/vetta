"""Safety gate — static screening BEFORE any candidate code runs.

We execute code written by strangers. This gate scans every code cell for
patterns that could exfiltrate data, touch credentials or damage the machine,
and quarantines the notebook instead of executing it. Deterministic, no LLM:
a security decision should not depend on a model's mood.

False positives are acceptable here (a human reviews quarantined notebooks);
false negatives are the expensive error. Still, patterns are scoped to what a
churn-analysis take-home has no business doing.
"""
import re
from dataclasses import dataclass

# (category, severity, regex, human explanation)
RULES = [
    ("network", "critical",
     r"\b(requests|urllib|http\.client|socket|ftplib|smtplib|paramiko|websocket)\b",
     "network access: a take-home analysis has no reason to call the internet; data could be exfiltrated"),
    ("process", "critical",
     r"\b(subprocess|os\.system|os\.popen|os\.exec\w*|pty\.spawn)\b",
     "spawns system processes: can run arbitrary commands on the reviewer's machine"),
    ("shell-magic", "critical",
     r"^\s*[!%]\s*(sh|bash|curl|wget|pip|python|rm|chmod|nc)\b",
     "shell escape from the notebook: runs commands outside Python"),
    ("credentials", "critical",
     r"(os\.environ|\.ssh|\.aws|\.env\b|id_rsa|api[_-]?key|keychain|credentials)",
     "touches environment variables or credential files"),
    ("obfuscation", "critical",
     r"\b(eval|exec|compile)\s*\(|base64\.b64decode|codecs\.decode|marshal\.loads|pickle\.loads",
     "dynamic/obfuscated code execution: hides what actually runs from any reader"),
    ("destructive-fs", "critical",
     r"shutil\.rmtree|os\.remove|os\.unlink|os\.rmdir|pathlib\.Path\([^)]*\)\.unlink",
     "deletes files: destructive filesystem access"),
    ("fs-traversal", "major",
     r"open\s*\(\s*['\"](/|~|\.\./\.\.)",
     "reads files outside the working folder"),
]


@dataclass
class SafetyFlag:
    category: str
    severity: str
    cell: int
    line: int
    snippet: str
    reason: str

    def to_dict(self):
        return self.__dict__.copy()


def scan_cells(cells: list[tuple[int, str]]) -> list[SafetyFlag]:
    """cells: [(cell_index, source)] apenas de celulas de codigo."""
    flags = []
    for idx, source in cells:
        for n, line in enumerate(source.splitlines()):
            stripped = line.strip()
            if stripped.startswith("#"):
                continue
            for cat, sev, pat, reason in RULES:
                if re.search(pat, line):
                    flags.append(SafetyFlag(cat, sev, idx, n + 1, stripped[:120], reason))
    return flags


def is_quarantined(flags: list[SafetyFlag]) -> bool:
    return any(f.severity == "critical" for f in flags)
