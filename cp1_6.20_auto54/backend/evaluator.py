import subprocess
import ast
import os
import tempfile
import resource
import time
import uuid
import threading


def limit_memory():
    resource.setrlimit(resource.RLIMIT_AS, (256 * 1024 * 1024, 256 * 1024 * 1024))


def calculate_cyclomatic_complexity(node: ast.AST) -> int:
    complexity = 0
    for node in ast.walk(node):
        if isinstance(node, (ast.If, ast.For, ast.While, ast.And, ast.Or, ast.ExceptHandler)):
            complexity += 1
        elif isinstance(node, ast.Try):
            complexity += len(node.handlers)
    return max(complexity, 1)


def analyze_code_style(code: str) -> dict:
    try:
        tree = ast.parse(code)
    except SyntaxError:
        tree = None

    lines = code.split('\n')
    total_lines = len(lines)
    comment_lines = sum(1 for line in lines if line.strip().startswith('#'))
    comment_ratio = (comment_lines / total_lines * 100) if total_lines > 0 else 0

    complexity = calculate_cyclomatic_complexity(tree) if tree else 1

    pep8_violations = 0
    if total_lines < 500:
        pep8_violations = sum(1 for line in lines if len(line) > 79)
        pep8_violations += sum(1 for line in lines[:-1] if line.strip() == '' and lines[lines.index(line) + 1].strip() == '')
        if lines and not lines[-1].endswith('\n'):
            pep8_violations += 1

    return {
        'cyclomatic_complexity': complexity,
        'total_lines': total_lines,
        'comment_ratio': round(comment_ratio, 2),
        'pep8_violations': pep8_violations,
        'complexity_level': get_complexity_level(complexity)
    }


def get_complexity_level(complexity: int) -> str:
    if complexity <= 5:
        return '优秀'
    elif complexity <= 10:
        return '良好'
    else:
        return '需改进'


def get_rating(value: float, metric_type: str) -> str:
    if metric_type == 'complexity':
        if value <= 5:
            return '优秀'
        elif value <= 10:
            return '良好'
        else:
            return '需改进'
    elif metric_type == 'comment_ratio':
        if value >= 20:
            return '优秀'
        elif value >= 10:
            return '良好'
        else:
            return '需改进'
    elif metric_type == 'pep8':
        if value == 0:
            return '优秀'
        elif value <= 3:
            return '良好'
        else:
            return '需改进'
    elif metric_type == 'lines':
        if value <= 100:
            return '优秀'
        elif value <= 300:
            return '良好'
        else:
            return '需改进'
    return '需改进'


def run_test_case(code: str, test_input: str, expected_output: str, timeout: int = 5) -> dict:
    result = {
        'status': 'pending',
        'input': test_input,
        'expected': expected_output,
        'actual': '',
        'error': '',
        'passed': False,
        'execution_time': 0
    }

    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(code)
        temp_file = f.name

    try:
        start_time = time.time()
        proc = subprocess.Popen(
            ['python', temp_file],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            preexec_fn=limit_memory,
            text=True
        )

        try:
            stdout, stderr = proc.communicate(input=test_input, timeout=timeout)
            result['execution_time'] = time.time() - start_time
            result['actual'] = stdout.strip()
            result['error'] = stderr.strip()

            if proc.returncode != 0:
                result['status'] = 'error'
            elif stdout.strip() == expected_output.strip():
                result['status'] = 'passed'
                result['passed'] = True
            else:
                result['status'] = 'failed'
        except subprocess.TimeoutExpired:
            proc.kill()
            result['status'] = 'timeout'
            result['execution_time'] = timeout
    finally:
        os.unlink(temp_file)

    return result


def evaluate_code(code: str, assignment_id: str, progress_callback=None) -> dict:
    test_cases = get_test_cases(assignment_id)
    total_score = 0
    results = []

    for i, test_case in enumerate(test_cases):
        result = run_test_case(code, test_case['input'], test_case['expected'])
        result['test_case'] = i + 1
        results.append(result)

        if result['passed']:
            total_score += 10

        if progress_callback:
            progress_callback({
                'test_case': i + 1,
                'total': len(test_cases),
                'status': result['status'],
                'passed': result['passed'],
                'score': total_score,
                'result': result
            })

    style_analysis = analyze_code_style(code)

    return {
        'submission_id': str(uuid.uuid4()),
        'score': total_score,
        'max_score': len(test_cases) * 10,
        'test_results': results,
        'style_analysis': style_analysis,
        'submitted_at': time.strftime('%Y-%m-%d %H:%M:%S')
    }


def get_test_cases(assignment_id: str) -> list:
    test_suites = {
        '1': [
            {'input': '3\n4\n', 'expected': '7'},
            {'input': '5\n10\n', 'expected': '15'},
            {'input': '0\n0\n', 'expected': '0'},
            {'input': '-5\n5\n', 'expected': '0'},
            {'input': '100\n200\n', 'expected': '300'},
            {'input': '999\n1\n', 'expected': '1000'},
            {'input': '-100\n-200\n', 'expected': '-300'},
            {'input': '1\n-1\n', 'expected': '0'},
            {'input': '50\n75\n', 'expected': '125'},
            {'input': '123\n456\n', 'expected': '579'}
        ],
        '2': [
            {'input': '5\n', 'expected': '120'},
            {'input': '0\n', 'expected': '1'},
            {'input': '1\n', 'expected': '1'},
            {'input': '3\n', 'expected': '6'},
            {'input': '10\n', 'expected': '3628800'},
            {'input': '7\n', 'expected': '5040'},
            {'input': '4\n', 'expected': '24'},
            {'input': '6\n', 'expected': '720'},
            {'input': '8\n', 'expected': '40320'},
            {'input': '2\n', 'expected': '2'}
        ],
        '3': [
            {'input': '10\n', 'expected': 'True'},
            {'input': '7\n', 'expected': 'True'},
            {'input': '4\n', 'expected': 'False'},
            {'input': '1\n', 'expected': 'False'},
            {'input': '2\n', 'expected': 'True'},
            {'input': '97\n', 'expected': 'True'},
            {'input': '100\n', 'expected': 'False'},
            {'input': '13\n', 'expected': 'True'},
            {'input': '50\n', 'expected': 'False'},
            {'input': '29\n', 'expected': 'True'}
        ],
        '4': [
            {'input': 'hello\n', 'expected': 'olleh'},
            {'input': 'python\n', 'expected': 'nohtyp'},
            {'input': 'a\n', 'expected': 'a'},
            {'input': 'ab\n', 'expected': 'ba'},
            {'input': 'racecar\n', 'expected': 'racecar'},
            {'input': 'test123\n', 'expected': '321tset'},
            {'input': 'coding\n', 'expected': 'gnidoc'},
            {'input': '!@#\n', 'expected': '#@!'},
            {'input': '  space  \n', 'expected': '  ecaps  '},
            {'input': 'programming\n', 'expected': 'gnimmargorp'}
        ],
        '5': [
            {'input': '5\n', 'expected': '5'},
            {'input': '3 7 2 9 5\n', 'expected': '9'},
            {'input': '1\n', 'expected': '1'},
            {'input': '1 2 3 4 5 6 7 8 9 10\n', 'expected': '10'},
            {'input': '4\n', 'expected': '4'},
            {'input': '-5 -1 -3\n', 'expected': '-1'},
            {'input': '2\n', 'expected': '2'},
            {'input': '100 200 150\n', 'expected': '200'},
            {'input': '6\n', 'expected': '6'},
            {'input': '0 0 0 0\n', 'expected': '0'}
        ]
    }
    return test_suites.get(assignment_id, test_suites['1'])


def get_assignments() -> list:
    return [
        {
            'id': '1',
            'title': '两数之和',
            'difficulty': 2,
            'deadline': '2026-07-15',
            'description': '编写一个Python程序，读取两个整数a和b，输出它们的和。',
            'example_input': '3\n4\n',
            'example_output': '7',
            'input_format': '第一行是整数a，第二行是整数b',
            'output_format': '输出一个整数，表示a+b的结果'
        },
        {
            'id': '2',
            'title': '阶乘计算',
            'difficulty': 3,
            'deadline': '2026-07-20',
            'description': '编写一个Python程序，计算并输出n的阶乘（n!）。',
            'example_input': '5\n',
            'example_output': '120',
            'input_format': '一个非负整数n',
            'output_format': '输出n的阶乘值'
        },
        {
            'id': '3',
            'title': '质数判断',
            'difficulty': 4,
            'deadline': '2026-07-25',
            'description': '编写一个Python程序，判断一个正整数是否为质数。',
            'example_input': '7\n',
            'example_output': 'True',
            'input_format': '一个正整数n',
            'output_format': '输出True或False'
        },
        {
            'id': '4',
            'title': '字符串反转',
            'difficulty': 1,
            'deadline': '2026-07-10',
            'description': '编写一个Python程序，将输入的字符串反转后输出。',
            'example_input': 'hello\n',
            'example_output': 'olleh',
            'input_format': '一个字符串',
            'output_format': '输出反转后的字符串'
        },
        {
            'id': '5',
            'title': '最大值查找',
            'difficulty': 3,
            'deadline': '2026-07-30',
            'description': '编写一个Python程序，读取n个整数，找出其中的最大值并输出。',
            'example_input': '5\n3 7 2 9 5\n',
            'example_output': '9',
            'input_format': '第一行是整数n，第二行是n个整数',
            'output_format': '输出最大的整数'
        }
    ]
