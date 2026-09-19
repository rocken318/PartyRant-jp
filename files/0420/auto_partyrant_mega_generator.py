import json
import time
import os
import concurrent.futures
import google.generativeai as genai

# ==========================================
# 設定エリア
# ==========================================
api_key_path = r"Y:\webwork\famquiz\API.txt"
try:
    with open(api_key_path, "r", encoding="utf-8") as f:
        API_KEY = f.read().strip()
except Exception as e:
    print(f"❌ APIキーファイルの読み込みに失敗しました ({api_key_path}): {e}")
    exit(1)

# 保存先フォルダ
DIRS = {
    "polling_v1": "partyrant_quizzes",
    "polling_v2": "partyrant_quizzes_vol2",
    "trivia": "partyrant_trivia_quizzes"
}
for d in DIRS.values():
    os.makedirs(d, exist_ok=True)

genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

# テーマリスト群 (各12テーマ * 100問 = 各1200問)
THEMES_POLLING_V1 = [
    "恋愛観・結婚観の境界線", "仕事・キャリアの価値観と本音", "究極の選択（ハードコア・少し際どい二択）",
    "日常生活のこだわり・マイルール", "飲み会・人間関係のモヤモヤ・マナー", "お金と倫理の分かれ道・強欲さ",
    "世代間ギャップ（Z世代 vs 昭和・平成）", "もしものシチュエーション（サバイバル・ファンタジー）", "食への異常なこだわり・偏愛",
    "オタク・推し活・エンタメ消費の熱量", "禁断の本音・ブラックな質問", "旅行・お出かけでのトラブル対応"
]

THEMES_POLLING_V2 = [
    "怒りの沸点・許せない他人の行動", "デジタル・SNSの暗黙の了解と地雷", "ズボラ限界値・だらしなさの許容範囲",
    "学生時代の黒歴史・青春あるある", "ジンクス・オカルト・スピリチュアルへの信仰度", "家族・きょうだい・実家の謎ルール",
    "買い物・物欲・浪費のボーダーライン", "異性との距離感・男女の友情は成立するか", "カラオケ・音楽・エンタメの流儀",
    "ドライブ・密室空間での掟とマナー", "永遠のテーマ・答えの出ない論争（きのこたけのこ等）", "もしも魔法や超能力が使えたら（空想シチュエーション）"
]

THEMES_TRIVIA = [
    "飲み会でドヤれる！お酒・飲食のガチ雑学", "昭和・平成のエンタメ＆大ヒットゲーム史", "え、そうだったの？勘違いだらけの日本語・ことわざ",
    "身近な食・有名チェーン店の知られざる秘密", "嘘みたいだけど本当！動物たちの奇妙な生態", "世界のびっくりルール＆奇妙な法律・マナー",
    "日常で見かける「アレ」の正式名称", "名作映画とアニメのガチ裏話・初期設定", "知って得する？お金と経済のリアルな雑学",
    "読めたらスゴイ！難読漢字・難読地名", "スケールが違う！宇宙と物理のミステリー", "スポーツの歴史とアスリートの極限記録"
]

def generate_batch(theme, batch_num, mode_type, retries=3):
    print(f"  -> 🤖 エージェント起動: 【{theme}】 (第{batch_num}バッチ)")

    if mode_type == "polling":
        prompt = f"""
        あなたはパーティーを盛り上げる構成作家です。価値観が割れたり本性がバレる「多数派・少数派ゲーム用の質問」を10問作成してください。
        ・テーマ: {theme}
        ・バッチ番号: {batch_num} （重複回避）
        ・トーン: 飲み会で議論が起きるような、エッジの効いた質問。
        ・制約事項: 正解のないアンケート形式。
        【出力形式】(JSON配列のみ)
        [{{
          "scene": "多数派クイズ", "title": "{theme} パート{batch_num}", "mode": "polling",
          "description": "{theme}についてのみんなの本音！パート{batch_num}",
          "questions": [{{ "text": "問題文", "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"], "correctIndex": null, "timeLimitSec": 15 }}]
        }}]
        """
    else:
        prompt = f"""
        あなたは天才的なクイズ作家です。「へぇー！」と驚くような「正解のある4択雑学クイズ」を10問作成してください。
        ・テーマ: {theme}
        ・バッチ番号: {batch_num} （重複回避）
        ・トーン: 飲み会で盛り上がる難易度。マニアックすぎない絶妙なライン。
        ・制約事項: 必ず明確な「正解」が1つ存在する知識問題（trivia）。
        【出力形式】(JSON配列のみ)
        [{{
          "scene": "雑学クイズ", "title": "{theme} パート{batch_num}", "mode": "trivia",
          "description": "「{theme}」に関するガチクイズ！パート{batch_num}",
          "questions": [{{ "text": "問題文", "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"], "correctIndex": 0, "timeLimitSec": 15 }}]
        }}]
        """

    for attempt in range(retries):
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(response_mime_type="application/json")
            )
            return json.loads(response.text)
        except Exception as e:
            wait_time = (attempt + 1) * 5
            print(f"  -> ⚠️ 通信エラー発生 (リトライ {attempt+1}/{retries} | {wait_time}秒待機): {e}")
            time.sleep(wait_time) # エラーが続くほど待機時間を延ばしてAPIの回復を待つ
    print(f"  -> ❌ 【{theme}】 第{batch_num}バッチ生成失敗。")
    return []

def process_theme(theme, mode_type, output_dir):
    print(f"🔄 【開始】{mode_type.upper()} - {theme} (10エージェント並列処理中...)")
    all_quizzes = []

    # 1テーマ内の10バッチを並列で一気に取得
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(generate_batch, theme, i, mode_type) for i in range(1, 11)]
        for future in concurrent.futures.as_completed(futures):
            data = future.result()
            if data:
                all_quizzes.extend(data)

    # 全バッチが揃ったらファイルに保存
    safe_name = theme.replace("/", "_").replace("・", "_").replace("！", "").replace("？", "").replace(" ", "_").replace("（", "").replace("）", "").replace("、", "")
    filename = f"{output_dir}/{safe_name}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(all_quizzes, f, ensure_ascii=False, indent=2)
    print(f"✅ 保存完了: {filename} (計 {len(all_quizzes)*10} 問程度)")

# ==========================================
# メイン実行処理
# ==========================================
def run_mega_batch():
    print("🚀 超高速メガバッチ生成（安定・並列処理版）を開始します...")
    start_time = time.time()

    # APIのパンクを防ぐため、テーマは1つずつ順番に処理し、テーマ内の10バッチを並列で一気にとる形にします
    for theme in THEMES_POLLING_V1:
        process_theme(theme, "polling", DIRS["polling_v1"])
    for theme in THEMES_POLLING_V2:
        process_theme(theme, "polling", DIRS["polling_v2"])
    for theme in THEMES_TRIVIA:
        process_theme(theme, "trivia", DIRS["trivia"])

    elapsed_time = time.time() - start_time
    print(f"\n🎉 全てのクイズ(3600問)の生成が完了しました！ (処理時間: {elapsed_time:.2f}秒)")

if __name__ == "__main__":
    run_mega_batch()
