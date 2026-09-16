import re
import json
from typing import Dict, Any, Union

REDACTED_TEXT = "[REDACTED]"
MASKED_SECRET = "********"

# Sensitive header names (case-insensitive match)
SENSITIVE_HEADER_PATTERNS = re.compile(
    r"^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|x-auth-token|api-key|token)$",
    re.IGNORECASE,
)

# Sensitive dictionary/JSON key names
SENSITIVE_KEY_PATTERNS = re.compile(
    r"^(password|passwd|secret|token|access_token|refresh_token|api_key|apikey|private_key|credit_card|card_number|cvv|cvc|ssn|auth)$",
    re.IGNORECASE,
)

# High entropy or known secret patterns in text
BEARER_PATTERN = re.compile(r"Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*", re.IGNORECASE)
CREDIT_CARD_PATTERN = re.compile(r"\b(?:\d{4}[ -]?){3}\d{4}\b")
EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b")

class RedactionEngine:
    @staticmethod
    def redact_headers(headers: Dict[str, str]) -> Dict[str, str]:
        """Redact sensitive HTTP headers."""
        if not headers:
            return {}
        sanitized = {}
        for key, value in headers.items():
            if SENSITIVE_HEADER_PATTERNS.match(key):
                sanitized[key] = REDACTED_TEXT
            else:
                sanitized[key] = value
        return sanitized

    @classmethod
    def redact_data_structure(cls, data: Any) -> Any:
        """Recursively redact nested dicts and lists."""
        if isinstance(data, dict):
            new_dict = {}
            for k, v in data.items():
                if SENSITIVE_KEY_PATTERNS.search(str(k)):
                    new_dict[k] = MASKED_SECRET
                else:
                    new_dict[k] = cls.redact_data_structure(v)
            return new_dict
        elif isinstance(data, list):
            return [cls.redact_data_structure(item) for item in data]
        elif isinstance(data, str):
            return cls.redact_text(data)
        return data

    @classmethod
    def redact_text(cls, text: str) -> str:
        """Redact known sensitive text patterns like Bearer tokens and credit cards."""
        if not text:
            return text
        text = BEARER_PATTERN.sub("Bearer [REDACTED_TOKEN]", text)
        text = CREDIT_CARD_PATTERN.sub("[REDACTED_CARD]", text)
        return text

    @classmethod
    def redact_payload_string(cls, payload_str: Optional[str]) -> Optional[str]:
        """Attempt to parse as JSON and redact keys, or fallback to regex redaction."""
        if not payload_str:
            return payload_str
        try:
            parsed = json.loads(payload_str)
            redacted = cls.redact_data_structure(parsed)
            return json.dumps(redacted)
        except Exception:
            return cls.redact_text(payload_str)
