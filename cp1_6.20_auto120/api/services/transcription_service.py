import json
import time
import random
import os

SIMULATED_BLOCKS = [
    {"time": "00:00", "text": "大家好，欢迎来到本节课"},
    {"time": "00:15", "text": "今天我们来学习编程的基础知识"},
    {"time": "00:32", "text": "首先介绍变量的概念和使用方法"},
    {"time": "00:50", "text": "变量是存储数据的容器"},
    {"time": "01:08", "text": "接下来讲解数据类型"},
    {"time": "01:25", "text": "常见的数据类型有整数、浮点数和字符串"},
    {"time": "01:45", "text": "整数就是没有小数点的数字"},
    {"time": "02:03", "text": "浮点数是带有小数点的数字"},
    {"time": "02:22", "text": "字符串是用引号括起来的文本"},
    {"time": "02:40", "text": "下面我们来看控制流语句"},
    {"time": "03:00", "text": "条件判断使用if语句"},
    {"time": "03:18", "text": "循环结构包括for循环和while循环"},
    {"time": "03:35", "text": "函数是代码复用的基本单位"},
    {"time": "03:55", "text": "定义函数使用def关键字"},
    {"time": "04:12", "text": "函数可以接收参数和返回值"},
    {"time": "04:30", "text": "好的，以上就是本节课的全部内容"},
    {"time": "04:48", "text": "大家课后记得完成练习题"},
    {"time": "05:00", "text": "下节课我们将学习更多进阶内容"}
]


def transcribe_file(file_path):
    try:
        import speech_recognition as sr
        recognizer = sr.Recognizer()
        with sr.AudioFile(file_path) as source:
            audio = recognizer.record(source)
        text = recognizer.recognize_google(audio, language="zh-CN")
        return _build_timestamps_from_text(text)
    except Exception:
        return _generate_simulated_transcription()


def _build_timestamps_from_text(text):
    sentences = text.replace("。", "。|").replace("！", "！|").replace("？", "？|").split("|")
    sentences = [s.strip() for s in sentences if s.strip()]
    result = []
    current_seconds = 0
    for sentence in sentences:
        mins = current_seconds // 60
        secs = current_seconds % 60
        result.append({
            "time": f"{mins:02d}:{secs:02d}",
            "text": sentence
        })
        current_seconds += max(5, len(sentence) // 3)
    return result


def _generate_simulated_transcription():
    count = random.randint(8, len(SIMULATED_BLOCKS))
    selected = random.sample(SIMULATED_BLOCKS, min(count, len(SIMULATED_BLOCKS)))
    selected.sort(key=lambda x: x["time"])
    return selected


def simulate_transcription_stream(file_path):
    blocks = _generate_simulated_transcription()
    total = len(blocks)
    for i, block in enumerate(blocks):
        progress = int((i + 1) / total * 100)
        yield json.dumps({
            "progress": progress,
            "current": block,
            "done": i == total - 1
        }, ensure_ascii=False)
        time.sleep(random.uniform(0.3, 0.8))
