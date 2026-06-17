import re
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
from bs4 import BeautifulSoup
from parser import CSSParser, CSSRule, CSSDeclaration


@dataclass
class ConflictDetail:
    property: str
    selector1: str
    value1: str
    important1: bool
    specificity1: Tuple[int, int, int]
    selector2: str
    value2: str
    important2: bool
    specificity2: Tuple[int, int, int]
    element_html: str
    element_tag: str
    element_classes: List[str]
    element_id: str
    winning_selector: str
    winning_value: str
    losing_selector: str
    losing_value: str


@dataclass
class ElementMatch:
    tag: str
    id: str
    classes: List[str]
    html: str
    xpath: str


class ConflictEngine:
    def __init__(self, html_text: str, css_rules: List[CSSRule]):
        self.html_text = html_text
        self.css_rules = css_rules
        self.soup = BeautifulSoup(html_text, 'html.parser')
        self.conflicts: List[ConflictDetail] = []

    def selector_matches_element(self, selector: str, element) -> bool:
        try:
            selector = selector.strip()
            if not selector:
                return False

            if ',' in selector:
                parts = [p.strip() for p in selector.split(',')]
                return any(self._single_selector_match(p, element) for p in parts)
            return self._single_selector_match(selector, element)
        except Exception:
            return False

    def _single_selector_match(self, selector: str, element) -> bool:
        try:
            selector = selector.strip()

            if selector == '*':
                return True

            if ' ' in selector or '>' in selector or '+' in selector or '~' in selector:
                return self._complex_selector_match(selector, element)

            if selector.startswith('#'):
                return element.get('id') == selector[1:]

            if selector.startswith('.'):
                classes = element.get('class', [])
                if isinstance(classes, str):
                    classes = classes.split()
                return selector[1:] in classes

            if '[' in selector:
                return self._attribute_selector_match(selector, element)

            if ':' in selector:
                base = selector.split(':')[0]
                if base and base != '*':
                    if element.name and element.name.lower() != base.lower():
                        return False
                return True

            if element.name and element.name.lower() == selector.lower():
                return True

            return False
        except Exception:
            return False

    def _complex_selector_match(self, selector: str, element) -> bool:
        try:
            tokens = self._tokenize_selector(selector)
            if not tokens:
                return False

            if len(tokens) == 1:
                return self._single_selector_match(tokens[0][0], element)

            current_elements = [element]
            reversed_tokens = list(reversed(tokens))

            first_selector, _ = reversed_tokens[0]
            if not self._single_selector_match(first_selector, element):
                return False

            if len(reversed_tokens) == 1:
                return True

            idx = 1
            while idx < len(reversed_tokens):
                sel, combinator = reversed_tokens[idx]
                prev_sel, _ = reversed_tokens[idx - 1] if idx > 0 else (None, None)

                if combinator == ' ':
                    found = False
                    for el in current_elements:
                        parent = el.find_parent()
                        while parent:
                            if self._single_selector_match(sel, parent):
                                found = True
                                current_elements = [parent]
                                break
                            parent = parent.find_parent()
                        if found:
                            break
                    if not found:
                        return False

                elif combinator == '>':
                    found = False
                    for el in current_elements:
                        parent = el.find_parent()
                        if parent and self._single_selector_match(sel, parent):
                            found = True
                            current_elements = [parent]
                            break
                    if not found:
                        return False

                elif combinator == '+':
                    found = False
                    for el in current_elements:
                        prev_sib = el.find_previous_sibling()
                        if prev_sib and self._single_selector_match(sel, prev_sib):
                            found = True
                            current_elements = [prev_sib]
                            break
                    if not found:
                        return False

                elif combinator == '~':
                    found = False
                    for el in current_elements:
                        prev_sibs = el.find_previous_siblings()
                        for sib in prev_sibs:
                            if self._single_selector_match(sel, sib):
                                found = True
                                current_elements = [sib]
                                break
                        if found:
                            break
                    if not found:
                        return False

                idx += 1

            return True
        except Exception:
            return False

    def _tokenize_selector(self, selector: str) -> List[Tuple[str, Optional[str]]]:
        tokens = []
        current = ''
        combinator = None
        i = 0
        while i < len(selector):
            ch = selector[i]
            if ch in ' \t\n\r':
                if current.strip():
                    tokens.append((current.strip(), combinator))
                    current = ''
                    combinator = ' '
                i += 1
            elif ch in '>+~':
                if current.strip():
                    tokens.append((current.strip(), combinator))
                    current = ''
                combinator = ch
                i += 1
            else:
                current += ch
                i += 1
        if current.strip():
            tokens.append((current.strip(), combinator))
        return tokens

    def _attribute_selector_match(self, selector: str, element) -> bool:
        match = re.match(r'([\w-]*)\[([^\]]+)\]', selector)
        if not match:
            return False
        tag_name = match.group(1)
        attr_expr = match.group(2)

        if tag_name and element.name and element.name.lower() != tag_name.lower():
            return False

        if '=' in attr_expr:
            attr, _, val = attr_expr.partition('=')
            attr = attr.strip()
            val = val.strip().strip('"\'')
            if attr.startswith('^'):
                attr = attr[1:]
                el_val = element.get(attr, '')
                return el_val.startswith(val) if el_val else False
            elif attr.startswith('$'):
                attr = attr[1:]
                el_val = element.get(attr, '')
                return el_val.endswith(val) if el_val else False
            elif attr.startswith('*'):
                attr = attr[1:]
                el_val = element.get(attr, '')
                return val in el_val if el_val else False
            elif attr.startswith('~'):
                attr = attr[1:]
                el_val = element.get(attr, '')
                if isinstance(el_val, list):
                    return val in el_val
                return val in (el_val or '').split()
            elif attr.startswith('|'):
                attr = attr[1:]
                el_val = element.get(attr, '')
                return el_val == val or (el_val or '').startswith(val + '-')
            else:
                return element.get(attr) == val
        else:
            return element.has_attr(attr_expr.strip())

    def get_all_elements(self):
        return self.soup.find_all(True)

    def get_element_info(self, element) -> ElementMatch:
        classes = element.get('class', [])
        if isinstance(classes, str):
            classes = classes.split()
        return ElementMatch(
            tag=element.name or '',
            id=element.get('id', '') or '',
            classes=classes,
            html=str(element),
            xpath=''
        )

    def get_element_inline_styles(self, element) -> Dict[str, str]:
        style = element.get('style', '')
        styles = {}
        if style:
            for decl in style.split(';'):
                decl = decl.strip()
                if ':' in decl:
                    prop, _, val = decl.partition(':')
                    styles[prop.strip()] = val.strip()
        return styles

    def compare_specificity(self, spec1: Tuple[int, int, int], spec2: Tuple[int, int, int]) -> int:
        for i in range(3):
            if spec1[i] > spec2[i]:
                return 1
            elif spec1[i] < spec2[i]:
                return -1
        return 0

    def detect_conflicts(self) -> List[Dict]:
        conflicts = []
        elements = self.get_all_elements()

        for element in elements:
            if element.name in ['script', 'style', 'meta', 'link', 'head', 'html', 'body']:
                continue

            el_info = self.get_element_info(element)
            matching_rules = []
            inline_styles = self.get_element_inline_styles(element)

            for rule_idx, rule in enumerate(self.css_rules):
                for sel in rule.selectors:
                    if self.selector_matches_element(sel, element):
                        matching_rules.append({
                            'selector': sel,
                            'specificity': rule.specificity.get(sel, (0, 0, 0)),
                            'declarations': rule.declarations,
                            'index': rule_idx,
                            'media_query': rule.media_query
                        })

            prop_declarations: Dict[str, List[Dict]] = {}

            for mr in matching_rules:
                for decl in mr['declarations']:
                    if decl.property not in prop_declarations:
                        prop_declarations[decl.property] = []
                    prop_declarations[decl.property].append({
                        'selector': mr['selector'],
                        'value': decl.value,
                        'important': decl.important,
                        'specificity': mr['specificity'],
                        'index': mr['index']
                    })

            for prop, decls in inline_styles.items():
                if prop not in prop_declarations:
                    prop_declarations[prop] = []
                prop_declarations[prop].append({
                    'selector': '[inline style]',
                    'value': decls,
                    'important': True,
                    'specificity': (1, 0, 0, 0),
                    'index': 99999
                })

            for prop, decls in prop_declarations.items():
                if len(decls) >= 2:
                    unique_values = set(d['value'] for d in decls)
                    if len(unique_values) > 1:
                        for i in range(len(decls)):
                            for j in range(i + 1, len(decls)):
                                d1 = decls[i]
                                d2 = decls[j]
                                if d1['value'] != d2['value']:
                                    winner_idx, loser_idx = self._determine_winner(d1, d2, i, j)
                                    winner = decls[winner_idx]
                                    loser = decls[loser_idx]

                                    conflicts.append({
                                        'property': prop,
                                        'selector1': d1['selector'],
                                        'value1': d1['value'],
                                        'important1': d1['important'],
                                        'specificity1': list(d1['specificity']),
                                        'selector2': d2['selector'],
                                        'value2': d2['value'],
                                        'important2': d2['important'],
                                        'specificity2': list(d2['specificity']),
                                        'element_tag': el_info.tag,
                                        'element_classes': el_info.classes,
                                        'element_id': el_info.id,
                                        'element_html': el_info.html,
                                        'winning_selector': winner['selector'],
                                        'winning_value': winner['value'],
                                        'losing_selector': loser['selector'],
                                        'losing_value': loser['value'],
                                        'element_key': f"{el_info.tag}#{el_info.id}.{'.'.join(el_info.classes)}"
                                    })
        return conflicts

    def _determine_winner(self, d1: Dict, d2: Dict, i1: int, i2: int) -> Tuple[int, int]:
        if d1['important'] and not d2['important']:
            return (i1, i2)
        if d2['important'] and not d1['important']:
            return (i2, i1)

        spec1 = d1['specificity']
        spec2 = d2['specificity']
        if len(spec1) == 4:
            return (i1, i2)
        if len(spec2) == 4:
            return (i2, i1)

        cmp_result = self.compare_specificity(
            tuple(spec1) if len(spec1) == 3 else (0, 0, 0),
            tuple(spec2) if len(spec2) == 3 else (0, 0, 0)
        )
        if cmp_result > 0:
            return (i1, i2)
        elif cmp_result < 0:
            return (i2, i1)

        if d1['index'] > d2['index']:
            return (i1, i2)
        return (i2, i1)


def generate_repair(conflicts: List[Dict], original_css: str) -> Dict:
    repaired_css = original_css

    css_lines = original_css.split('\n')

    modifications = []

    for conflict in conflicts:
        losing_sel = conflict['losing_selector']
        losing_val = conflict['losing_value']
        property_name = conflict['property']
        winning_val = conflict['winning_value']

        modifications.append({
            'selector': losing_sel,
            'property': property_name,
            'old_value': losing_val,
            'new_value': winning_val,
            'action': 'replace',
            'reason': f'与选择器 \"{conflict["winning_selector"]}\" 冲突，应改为 {winning_val}'
        })

    repaired_lines = css_lines[:]
    diff_blocks = []

    for mod in modifications:
        diff_blocks.append({
            'type': 'deletion',
            'selector': mod['selector'],
            'property': mod['property'],
            'value': mod['old_value']
        })
        diff_blocks.append({
            'type': 'addition',
            'selector': mod['selector'],
            'property': mod['property'],
            'value': mod['new_value']
        })

    return {
        'modifications': modifications,
        'diff_blocks': diff_blocks,
        'repaired_css_hint': '请查看下方修复建议，将冲突属性替换为推荐值'
    }
