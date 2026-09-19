import sys
import io
import json
import time
import os
import concurrent.futures
from google import genai
from google.genai import types

# Windows stdout encoding fix
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# ==========================================
# 設定エリア
# ==========================================
api_key_path = r"Y:\webwork\famquiz\API.txt"
try:
    with open(api_key_path, "r", encoding="utf-8") as f:
        API_KEY = f.read().strip()
except Exception as e:
    print(f"[ERROR] APIキーファイルの読み込みに失敗しました ({api_key_path}): {e}")
    exit(1)

# 保存先フォルダ
OUTPUT_DIR = "partyrant_ultimate_choices"
os.makedirs(OUTPUT_DIR, exist_ok=True)

client = genai.Client(api_key=API_KEY)
MODEL = "gemini-2.5-flash"

# 究極の二択 テーマリスト (各100問 = 計500問)
THEMES_ULTIMATE = [
    "倫理と道徳が崩壊する究極の二択（トロッコ問題系・胸糞系）",
    "お金と欲望の究極の二択（ハイリスクハイリターン・悪魔の契約）",
    "恋愛と結婚の究極の二択（浮気・束縛・過去・地獄のシチュエーション）",
    "生存確率0%？サバイバルと生死の究極の二択",
    "くだらなすぎて逆に悩む！日常の究極の二択（食・睡眠・排泄など）"
]

def generate_batch(theme, batch_num, retries=3):
    print(f"  -> [START] エージェント起動: 【{theme}】 (第{batch_num}バッチ)")
    sys.stdout.flush()

    prompt = f"""
    あなたはパーティーを大爆笑や大激論に巻き込む天才構成作家です。
    参加者が頭を抱えて本気で悩んでしまうような「究極の二択」の質問を10問作成してください。

    【設定条件】
    ・テーマ: {theme}
    ・バッチ番号: {batch_num} （過去の出題と被らないように、毎回全く違うアプローチの二択を考えてください）
    ・トーン: 「どっちを選んでも地獄」「どっちも捨てがたい」「性格の悪さが露呈する」ような、絶妙にバランスの取れた究極の選択。
    ・制約事項: 正解のないアンケート形式（polling）ですが、**選択肢（options）は必ず「2つ」のみ**にしてください。選択肢には適宜絵文字を入れてください。

    【出力形式】(JSON配列のみ)
    [{{
      "scene": "究極の二択",
      "title": "{theme} パート{batch_num}",
      "mode": "polling",
      "description": "絶対的な正解はない。あなたの本性が暴かれる究極の二択！パート{batch_num}",
      "questions": [
        {{
          "text": "問題文（例：一生どちらかしか食べられないなら？）",
          "options": ["選択肢A（例：カレー味のうんこ）", "選択肢B（例：うんこ味のカレー）"],
          "correctIndex": null,
          "timeLimitSec": 15
        }}
      ]
    }}]
    """

    for attempt in range(retries):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            return json.loads(response.text)
        except Exception as e:
            wait_time = (attempt + 1) * 5
            print(f"  -> [WARN] 通信エラー (リトライ {attempt+1}/{retries} | {wait_time}秒待機): {e}")
            sys.stdout.flush()
            time.sleep(wait_time)
    print(f"  -> [ERROR] 【{theme}】 第{batch_num}バッチ生成失敗。")
    sys.stdout.flush()
    return []

def process_theme(theme, output_dir):
    print(f"[THEME] 【開始】究極の二択 - {theme} (10エージェント並列処理中...)")
    sys.stdout.flush()
    all_quizzes = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(generate_batch, theme, i) for i in range(1, 11)]
        for future in concurrent.futures.as_completed(futures):
            data = future.result()
            if data:
                all_quizzes.extend(data)

    safe_name = (theme
        .replace("/", "_")
        .replace("・", "_")
        .replace("！", "")
        .replace("？", "")
        .replace(" ", "_")
        .replace("（", "")
        .replace("）", "")
        .replace("、", ""))
    filename = f"{output_dir}/ultimate_{safe_name}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(all_quizzes, f, ensure_ascii=False, indent=2)
    total_q = sum(len(q.get("questions", [])) for q in all_quizzes)
    print(f"[DONE] 保存完了: {filename} (バッチ数: {len(all_quizzes)}, 問題数: {total_q})")
    sys.stdout.flush()

def run_mega_batch():
    print("[START] 究極の二択 500問！超高速生成を開始します...")
    sys.stdout.flush()
    start_time = time.time()

    for theme in THEMES_ULTIMATE:
        process_theme(theme, OUTPUT_DIR)

    elapsed_time = time.time() - start_time
    print(f"\n[COMPLETE] 究極の二択(500問)の生成が完了しました！ (処理時間: {elapsed_time:.2f}秒)")
    sys.stdout.flush()

if __name__ == "__main__":
    run_mega_batch()
