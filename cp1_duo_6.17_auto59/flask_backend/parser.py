import re
from dataclasses import dataclass, field
from typing import List, Dict, Tuple


@dataclass
class CSSDeclaration:
    property: str
    value: str
    important: bool = False


@dataclass
class CSSRule:
    selectors: List[str]
    declarations: List[CSSDeclaration]
    specificity: Dict[str, Tuple[int, int, int]] = field(default_factory=dict)
    media_query: str = None


class CSSParser:
    def __init__(self, css_text: str):
        self.css_text = css_text
        self.rules: List[CSSRule] = []

    def remove_comments(self, text: str) -> str:
        return re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)

    def extract_media_queries(self, text: str) -> List[Tuple[str, str]]:
        media_blocks = []
        media_pattern = r'@media\s+([^{]+)\s*\{((?:[^{}]*\{[^{}]*\}[^{}]*)*)\}'
        matches = re.findall(media_pattern, text, flags=re.DOTALL)
        for query, content in matches:
            media_blocks.append((query.strip(), content.strip()))
        cleaned = re.sub(media_pattern, '', text, flags=re.DOTALL)
        return media_blocks, cleaned

    def parse_rules(self, text: str, media_query: str = None) -> List[CSSRule]:
        rules = []
        rule_pattern = r'([^{]+)\s*\{([^}]*)\}'
        matches = re.findall(rule_pattern, text, flags=re.DOTALL)

        for selector_str, decl_str in matches:
            selectors = [s.strip() for s in selector_str.split(',') if s.strip()]
            declarations = self.parse_declarations(decl_str)
            if selectors and declarations:
                rule = CSSRule(
                    selectors=selectors,
                    declarations=declarations,
                    media_query=media_query
                )
                for sel in selectors:
                    rule.specificity[sel] = self.calculate_specificity(sel)
                rules.append(rule)
        return rules

    def parse_declarations(self, decl_text: str) -> List[CSSDeclaration]:
        declarations = []
        decls = decl_text.split(';')
        for decl in decls:
            decl = decl.strip()
            if not decl:
                continue
            if ':' not in decl:
                continue
            prop, _, val = decl.partition(':')
            prop = prop.strip()
            val = val.strip()
            important = False
            if '!important' in val.lower():
                important = True
                val = re.sub(r'!important', '', val, flags=re.IGNORECASE).strip()
            if prop and val:
                declarations.append(CSSDeclaration(
                    property=prop,
                    value=val,
                    important=important
                ))
        return declarations

    def calculate_specificity(self, selector: str) -> Tuple[int, int, int]:
        selector = selector.strip()
        a = 0
        b = 0
        c = 0

        id_pattern = r'#[\w-]+'
        a = len(re.findall(id_pattern, selector))

        class_pattern = r'\.[\w-]+'
        attr_pattern = r'\[[^\]]+\]'
        pseudo_class_pattern = r':(?!:)[\w-]+(?:\([^)]*\))?'
        b = (len(re.findall(class_pattern, selector)) +
             len(re.findall(attr_pattern, selector)) +
             len(re.findall(pseudo_class_pattern, selector)))

        elem_pattern = r'(?<![#.\[:])\b[a-zA-Z][\w-]*\b'
        pseudo_elem_pattern = r'::[\w-]+'
        c = (len(re.findall(elem_pattern, selector)) +
             len(re.findall(pseudo_elem_pattern, selector)))

        return (a, b, c)

    def parse(self) -> List[CSSRule]:
        self.css_text = self.remove_comments(self.css_text)
        media_blocks, remaining = self.extract_media_queries(self.css_text)

        for query, content in media_blocks:
            self.rules.extend(self.parse_rules(content, query))

        self.rules.extend(self.parse_rules(remaining))

        return self.rules
