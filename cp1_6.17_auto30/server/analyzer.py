import re
from typing import List, Dict, Any


class CodeAnalyzer:
    def __init__(self, code: str):
        self.code = code
        self.lines = code.split('\n')

    def _parse_params(self, params_str: str) -> List[Dict[str, str]]:
        if not params_str or params_str.strip() == '':
            return []

        params = []
        depth = 0
        current = ''
        param_parts = []

        for ch in params_str:
            if ch in '<([':
                depth += 1
                current += ch
            elif ch in '>)]':
                depth -= 1
                current += ch
            elif ch == ',' and depth == 0:
                param_parts.append(current.strip())
                current = ''
            else:
                current += ch

        if current.strip():
            param_parts.append(current.strip())

        for p in param_parts:
            if not p:
                continue

            has_default = '=' in p
            if has_default:
                p = p.split('=')[0].strip()

            p = p.strip()
            if not p:
                continue

            if ':' in p:
                parts = p.split(':', 1)
                name = parts[0].strip()
                ptype = parts[1].strip() if len(parts) > 1 else 'any'
            else:
                name = p
                ptype = 'any'

            name = name.lstrip('...').strip()
            if name:
                params.append({
                    'name': name,
                    'type': ptype or 'any'
                })

        return params

    def _extract_return_type(self, func_line: str) -> str:
        match = re.search(r'\)\s*:\s*([A-Za-z_][\w<>\[\], \|]*)', func_line)
        if match:
            return match.group(1).strip()
        return 'any'

    def _find_called_functions(self, func_body: str, all_func_names: List[str]) -> List[str]:
        deps = set()
        for name in all_func_names:
            pattern = r'\b' + re.escape(name) + r'\s*\('
            if re.search(pattern, func_body):
                deps.add(name)
        return sorted(list(deps))

    def _extract_function_body(self, start_line_idx: int) -> str:
        lines = self.lines
        if start_line_idx >= len(lines):
            return ''

        line = lines[start_line_idx]
        brace_count = line.count('{') - line.count('}')
        body_lines = [line]
        i = start_line_idx + 1

        while i < len(lines) and brace_count > 0:
            body_lines.append(lines[i])
            brace_count += lines[i].count('{') - lines[i].count('}')
            i += 1

        if brace_count <= 0 and i - 1 > start_line_idx:
            pass

        return '\n'.join(body_lines)

    def analyze(self) -> Dict[str, Any]:
        code = self.code
        functions: List[Dict[str, Any]] = []
        exports: List[str] = []
        default_export: str = None

        func_patterns = [
            r'(?:export\s+)?(?:default\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)',
            r'(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*[=:]',
            r'(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?function\s*\(([^)]*)\)',
        ]

        method_pattern = r'(?:public\s+|private\s+|protected\s+|static\s+)*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*[:{]'

        class_pattern = r'(?:export\s+)?(?:default\s+)?class\s+([A-Za-z_$][\w$]*)'
        classes: List[Dict[str, Any]] = []

        for i, line in enumerate(self.lines):
            stripped = line.strip()

            class_match = re.match(class_pattern, stripped)
            if class_match:
                class_name = class_match.group(1)
                is_exported = 'export' in stripped
                is_default = 'default' in stripped
                classes.append({
                    'name': class_name,
                    'start_line': i,
                    'is_exported': is_exported,
                    'is_default': is_default,
                })
                if is_exported:
                    exports.append(class_name)
                if is_default:
                    default_export = class_name

        for i, line in enumerate(self.lines):
            stripped = line.strip()

            in_class = None
            for cls in classes:
                if i > cls['start_line']:
                    in_class = cls

            if in_class:
                method_match = re.match(method_pattern, stripped)
                if method_match and not stripped.startswith('function '):
                    mname = method_match.group(1)
                    if mname in ('if', 'for', 'while', 'switch', 'catch', 'return'):
                        continue
                    mparams_str = method_match.group(2)
                    body = self._extract_function_body(i)
                    mparams = self._parse_params(mparams_str)
                    mreturn = self._extract_return_type(stripped)
                    is_constructor = mname == 'constructor'

                    if not any(f['name'] == mname and f.get('className') == in_class['name'] for f in functions):
                        functions.append({
                            'name': mname,
                            'params': mparams,
                            'returnType': mreturn if not is_constructor else in_class['name'],
                            'isExported': in_class['is_exported'],
                            'isDefaultExport': False,
                            'isClassMethod': True,
                            'className': in_class['name'],
                            'dependencies': [],
                        })
                        if in_class['is_exported'] and mname not in exports:
                            pass

            matched = False
            for pattern in func_patterns:
                match = re.search(pattern, stripped)
                if match:
                    fname = match.group(1)
                    fparams_str = match.group(2)
                    fparams = self._parse_params(fparams_str)
                    freturn = self._extract_return_type(stripped)
                    is_exported = 'export' in stripped
                    is_default = 'default' in stripped

                    if not any(f['name'] == fname and not f.get('isClassMethod') for f in functions):
                        functions.append({
                            'name': fname,
                            'params': fparams,
                            'returnType': freturn,
                            'isExported': is_exported,
                            'isDefaultExport': is_default,
                            'isClassMethod': False,
                            'dependencies': [],
                        })
                        if is_exported and fname not in exports:
                            exports.append(fname)
                        if is_default:
                            default_export = fname

                    matched = True
                    break

        all_func_names = [f['name'] for f in functions]
        for func in functions:
            if not func.get('isClassMethod'):
                for i, line in enumerate(self.lines):
                    stripped = line.strip()
                    if re.search(r'\b' + re.escape(func['name']) + r'\b', stripped):
                        body = self._extract_function_body(i)
                        func['dependencies'] = [
                            d for d in self._find_called_functions(body, all_func_names)
                            if d != func['name']
                        ]
                        break

        export_default_pattern = r'export\s+default\s+([A-Za-z_$][\w$]*)'
        for line in self.lines:
            m = re.search(export_default_pattern, line)
            if m:
                default_export = m.group(1)
                if m.group(1) not in exports:
                    exports.append(m.group(1))

        return {
            'functions': functions,
            'exports': exports,
            'defaultExport': default_export,
        }


def parse_code(code: str) -> Dict[str, Any]:
    analyzer = CodeAnalyzer(code)
    return analyzer.analyze()
