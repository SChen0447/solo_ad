import subprocess
import sys
import os
import tempfile
import ast
import re
import io


def execute_code(code, timeout: int = 2):
    result = {
        "stdout": "",
        "stderr": "",
        "exitCode": -1,
        "timeout": False,
        "executionTime": 0,
    }

    if not code or not code.strip():
        result["stderr"] = "代码不能为空"
        return result

    line_count = len(code.split("\n"))
    if line_count > 300:
        result["stderr"] = f"代码行数超过限制（最大300行，当前{line_count}行）"
        return result

    for keyword in ["import os", "import subprocess", "import sys", "open(", "eval(", "exec(", "__import__"]:
        if keyword in code and keyword != "import sys":
            pass

    tmp_file = None
    try:
        tmp_fd, tmp_path = tempfile.mkstemp(suffix=".py", prefix="py_sandbox_")
        os.close(tmp_fd)
        tmp_file = tmp_path

        with open(tmp_file, "w", encoding="utf-8") as f:
            f.write(code)

        python_exec = sys.executable

        try:
            proc = subprocess.run(
                [python_exec, tmp_file],
                capture_output=True,
                text=True,
                timeout=timeout,
                encoding="utf-8",
                errors="replace",
                env={
                    "PATH": os.environ.get("PATH", ""),
                    "PYTHONIOENCODING": "utf-8",
                },
            )
            result["stdout"] = proc.stdout
            result["stderr"] = proc.stderr
            result["exitCode"] = proc.returncode
            result["timeout"] = False
        except subprocess.TimeoutExpired:
            result["timeout"] = True
            result["stderr"] = f"执行超时（超过{timeout}秒限制）"
            result["exitCode"] = -1
        except Exception as e:
            result["stderr"] = f"执行错误: {str(e)}"
            result["exitCode"] = -1

    except Exception as e:
        result["stderr"] = f"沙箱错误: {str(e)}"
        result["exitCode"] = -1
    finally:
        if tmp_file and os.path.exists(tmp_file):
            try:
                os.unlink(tmp_file)
            except:
                pass

    return result


def static_analysis(code):
    warnings = []

    if not code or not code.strip():
        return warnings

    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        warnings.append({
            "line": e.lineno or 1,
            "message": f"语法错误: {e.msg}",
            "type": "error",
        })
        return warnings

    defined_vars = set()
    used_vars = set()
    imports = set()

    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    defined_vars.add(target.id)
                elif isinstance(target, (ast.Tuple, ast.List)):
                    for elt in target.elts:
                        if isinstance(elt, ast.Name):
                            defined_vars.add(elt.id)

        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            defined_vars.add(node.name)
            for arg in node.args.args:
                if hasattr(arg, "arg"):
                    defined_vars.add(arg.arg)

        elif isinstance(node, ast.Name):
            if isinstance(node.ctx, ast.Load):
                used_vars.add(node.id)

        elif isinstance(node, ast.Import):
            for alias in node.names:
                imports.add(alias.asname or alias.name.split(".")[0])
                defined_vars.add(alias.asname or alias.name.split(".")[0])

        elif isinstance(node, ast.ImportFrom):
            for alias in node.names:
                imports.add(alias.asname or alias.name)
                defined_vars.add(alias.asname or alias.name)

        elif isinstance(node, ast.ClassDef):
            defined_vars.add(node.name)

        elif isinstance(node, (ast.For, ast.AsyncFor)):
            if isinstance(node.target, ast.Name):
                defined_vars.add(node.target.id)
            elif isinstance(node.target, (ast.Tuple, ast.List)):
                for elt in node.target.elts:
                    if isinstance(elt, ast.Name):
                        defined_vars.add(elt.id)

        elif isinstance(node, ast.comprehension):
            if isinstance(node.target, ast.Name):
                defined_vars.add(node.target.id)

    unused_vars = defined_vars - used_vars - {"__name__"}
    magic_dunder = {v for v in unused_vars if v.startswith("__") and v.endswith("__")}
    unused_vars = unused_vars - magic_dunder

    for var_name in sorted(unused_vars):
        if var_name.startswith("_"):
            continue
        line_no = _find_var_line(code, var_name)
        if line_no:
            warnings.append({
                "line": line_no,
                "message": f"变量 '{var_name}' 已定义但未使用",
                "type": "warning",
            })

    for node in ast.walk(tree):
        if isinstance(node, ast.While):
            if not _has_termination(node):
                warnings.append({
                    "line": node.lineno,
                    "message": "while 循环可能缺少终止条件，存在死循环风险",
                    "type": "warning",
                })

        if isinstance(node, ast.Compare):
            if len(node.ops) == 1 and isinstance(node.ops[0], (ast.Eq, ast.NotEq)):
                for comp in node.comparators:
                    if isinstance(comp, ast.Constant) and comp.value is None:
                        if isinstance(node.ops[0], ast.Eq):
                            warnings.append({
                                "line": node.lineno,
                                "message": "建议使用 'is None' 代替 '== None'",
                                "type": "info",
                            })
                        elif isinstance(node.ops[0], ast.NotEq):
                            warnings.append({
                                "line": node.lineno,
                                "message": "建议使用 'is not None' 代替 '!= None'",
                                "type": "info",
                            })

    for node in ast.walk(tree):
        if isinstance(node, ast.ExceptHandler):
            if node.type is None:
                warnings.append({
                    "line": node.lineno,
                    "message": "裸 except 不推荐，建议指定具体异常类型",
                    "type": "warning",
                })
            elif isinstance(node.type, ast.Name) and node.type.id == "Exception":
                if not node.name:
                    pass

    for i, line in enumerate(code.split("\n"), 1):
        stripped = line.rstrip()
        if len(stripped) > 120:
            warnings.append({
                "line": i,
                "message": f"行长度超过120字符（当前{len(stripped)}字符），建议换行",
                "type": "info",
            })

    warnings.sort(key=lambda w: w["line"])
    return warnings


def _find_var_line(code, var_name):
    patterns = [
        rf"\b{var_name}\s*=",
        rf"def\s+{var_name}\s*\(",
        rf"class\s+{var_name}\s*[:\(]",
        rf"for\s+{var_name}\s+in",
        rf"import\s+{var_name}\b",
        rf"from\s+\S+\s+import\s+.*\b{var_name}\b",
    ]
    for i, line in enumerate(code.split("\n"), 1):
        for pattern in patterns:
            if re.search(pattern, line):
                return i
    return None


def _has_termination(while_node):
    for child in ast.walk(while_node):
        if isinstance(child, (ast.Break, ast.Return)):
            return True
        if isinstance(child, ast.If):
            for sub in ast.walk(child):
                if isinstance(sub, (ast.Break, ast.Return)):
                    return True
    test = while_node.test
    if isinstance(test, ast.Constant):
        if test.value is True:
            return False
    return True
