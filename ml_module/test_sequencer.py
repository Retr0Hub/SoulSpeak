from question_sequencer import QuestionSequencer
import pyttsx3
import os

def speak(text):
    """Convert text to speech."""
    engine = pyttsx3.init()
    engine.setProperty('rate', 160)
    engine.setProperty('volume', 1.0)
    engine.say(text)
    engine.runAndWait()

def main():
    sequencer = QuestionSequencer("ml_module/patient_questions_with_priority.csv")

    while True:
        q = sequencer.get_next_question()
        if q is None:
            print("✅ All questions completed.")
            break

        print(f"Q: {q['question']}")
        speak(q['question'])

        answer = input("Answer (yes/no): ").strip().lower()
        emergency_triggered = sequencer.record_answer(q['id'], answer)

        if emergency_triggered:
            alert_msg = "🚨 Emergency detected! Triggering SOS."
            print(alert_msg)
            speak(alert_msg)

            # ✅ Tell the user where the SOS log was written
            log_path = os.path.join("logs", "sos_log.txt")
            print(f"📂 SOS log saved at: {os.path.abspath(log_path)}")
            break

if __name__ == "__main__":
    main()
