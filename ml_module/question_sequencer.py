import pandas as pd
from sentence_transformers import SentenceTransformer, util
import datetime
import os

class QuestionSequencer:
    def __init__(self, csv_path, similarity_threshold=0.85):
        df = pd.read_csv(csv_path)

        required_cols = {"id", "category", "question", "Priority"}
        if not required_cols.issubset(df.columns):
            raise ValueError(f"CSV must contain columns: {required_cols}")

        priority_map = {'High': 3, 'Medium': 2, 'Low': 1}
        df['priority_num'] = df['Priority'].map(priority_map)

        self.emergency_keywords = [
            "chest pain",
            "trouble breathing",
            "severe bleeding",
            "unconscious",
            "fainting",
            "heart attack"
        ]

        print("🔄 Loading sentence transformer model...")
        model = SentenceTransformer("all-MiniLM-L6-v2")

        print("🔍 Removing semantically similar questions...")
        unique_questions = []
        embeddings = []

        for q in df['question']:
            q_emb = model.encode(q, convert_to_tensor=True)

            is_duplicate = False
            for existing_emb in embeddings:
                sim = util.cos_sim(q_emb, existing_emb).item()
                if sim >= similarity_threshold:
                    is_duplicate = True
                    break

            if not is_duplicate:
                unique_questions.append(q)
                embeddings.append(q_emb)

        df = df[df['question'].isin(unique_questions)]

        self.df = df.groupby('priority_num', group_keys=False).apply(lambda x: x.sample(frac=1)).reset_index(drop=True)
        self.answered_ids = {}

        # ✅ Ensure logs folder exists
        os.makedirs("logs", exist_ok=True)

        # ✅ Create sos_log.txt at startup (empty if not already present)
        log_path = "logs/sos_log.txt"
        if not os.path.exists(log_path):
            with open(log_path, "w") as f:
                f.write("---- SOS Log Initialized ----\n")
        print(f"📂 SOS log file ready at: {log_path}")

    def get_next_question(self):
        remaining = self.df[~self.df['id'].isin(self.answered_ids.keys())]
        if remaining.empty:
            return None
        max_priority = remaining['priority_num'].max()
        same_priority = remaining[remaining['priority_num'] == max_priority]
        next_row = same_priority.sample(n=1).iloc[0]
        return {
            'id': int(next_row['id']),
            'category': next_row['category'],
            'question': next_row['question'],
            'priority': next_row['Priority']
        }

    def record_answer(self, question_id, answer):
        self.answered_ids[question_id] = answer

        row = self.df[self.df['id'] == question_id].iloc[0]
        if any(keyword.lower() in row['question'].lower() for keyword in self.emergency_keywords) and answer.lower() == "yes":
            self.trigger_sos(row['question'])
            return True  # Emergency happened

        return False

    def trigger_sos(self, question_text):
        print(f"🚨 SOS TRIGGERED! Emergency detected: {question_text}")

        log_path = "logs/sos_log.txt"
        with open(log_path, "a") as f:
            f.write(f"{datetime.datetime.now()} - SOS TRIGGERED - Question: {question_text}\n")
            f.flush()

        print(f"✅ SOS log updated at: {log_path}")
