import time
from typing import Dict, List
import io
import sys
import traceback


TEST_CASES = [
    {"input": (1, 2), "expected": 3, "description": "基础加法: 1 + 2"},
    {"input": (0, 0), "expected": 0, "description": "零值测试: 0 + 0"},
    {"input": (-5, 3), "expected": -2, "description": "负数加法: -5 + 3"},
    {"input": (100, 200), "expected": 300, "description": "大数加法: 100 + 200"},
    {"input": (-10, -20), "expected": -30, "description": "双负数加法: -10 + -20"},
]


def grade_code(code: str) -> Dict:
    time.sleep(0.1)
    test_results: List[Dict] = []
    score = 0
    error_types = set()

    try:
        compiled = compile(code, "<submission>", "exec")
        local_ns = {}
        exec(compiled, local_ns)

        if "add" not in local_ns:
            for case in TEST_CASES:
                test_results.append({
                    "description": case["description"],
                    "passed": False,
                    "error": "未找到add函数"
                })
                error_types.add("function_missing")
            return build_result(0, test_results, error_types)

        add_func = local_ns["add"]

        for case in TEST_CASES:
            try:
                result = add_func(*case["input"])
                if result == case["expected"]:
                    test_results.append({
                        "description": case["description"],
                        "passed": True,
                        "input": case["input"],
                        "expected": case["expected"],
                        "actual": result
                    })
                    score += 20
                else:
                    test_results.append({
                        "description": case["description"],
                        "passed": False,
                        "input": case["input"],
                        "expected": case["expected"],
                        "actual": result
                    })
                    error_types.add("output_mismatch")
            except Exception as e:
                test_results.append({
                    "description": case["description"],
                    "passed": False,
                    "error": str(e)
                })
                error_types.add("runtime_error")

    except SyntaxError as e:
        for case in TEST_CASES:
            test_results.append({
                "description": case["description"],
                "passed": False,
                "error": f"语法错误: {e.msg} (第{e.lineno}行)"
            })
        error_types.add("syntax_error")
    except Exception as e:
        for case in TEST_CASES:
            test_results.append({
                "description": case["description"],
                "passed": False,
                "error": f"代码执行错误: {str(e)}"
            })
        error_types.add("runtime_error")

    return build_result(score, test_results, error_types)


def build_result(score: int, test_results: List[Dict], error_types: set) -> Dict:
    feedback = generate_feedback(score, error_types)
    return {
        "score": score,
        "test_cases": test_results,
        "feedback": feedback
    }


def generate_feedback(score: int, error_types: set) -> str:
    if score == 100:
        return "优秀！所有测试用例都通过了，代码逻辑正确。"
    if "syntax_error" in error_types:
        return "代码存在语法错误，请检查语法后重新提交。"
    if "function_missing" in error_types:
        return "未找到add函数，请确保定义了正确的函数名。"
    if "runtime_error" in error_types:
        return "代码运行时出现错误，请检查函数逻辑。"
    if "output_mismatch" in error_types:
        return "部分测试用例输出不匹配，请检查加法逻辑。"
    if score >= 80:
        return "做得不错！只有少量用例未通过。"
    if score >= 60:
        return "及格了，但还有提升空间。"
    if score >= 40:
        return "需要加强练习，建议复习加法逻辑。"
    return "代码需要大量改进，请重新学习相关知识。"
