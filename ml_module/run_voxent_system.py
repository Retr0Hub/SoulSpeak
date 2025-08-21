import cv2
import mediapipe as mp
import asyncio
import json
import websockets
import time

# -------------------------------
# VoxentSession (simplified)
# -------------------------------
class VoxentSession:
    def __init__(self, patient_id):
        self.patient_id = patient_id
        self.questions = [
            "Are you experiencing chest pain?",
            "Do you have shortness of breath?",
            "Do you feel dizzy?"
        ]
        self.current_index = 0
        self.emergency_questions = [0, 1]  # indices of emergency questions

    def get_current_question_text(self):
        if self.current_index < len(self.questions):
            return self.questions[self.current_index]
        return None

def process_gesture(session, gesture):
    """
    Update session based on gesture and return next question or SOS.
    """
    if session.current_index in session.emergency_questions and gesture == 'yes':
        return 'SOS triggered!'
    
    session.current_index += 1
    if session.current_index >= len(session.questions):
        return 'Session completed!'
    
    return session.get_current_question_text()

async def trigger_sos(session, websocket=None, delay=5):
    """
    5-second SOS countdown
    """
    print(f"[ALERT] SOS countdown started ({delay}s) for patient {session.patient_id}")
    try:
        for i in range(delay, 0, -1):
            if websocket:
                await websocket.send(json.dumps({"type":"sos_countdown","seconds":i,"patient_id":session.patient_id}))
            await asyncio.sleep(1)
        print(f"[ALERT] SOS triggered for patient {session.patient_id}")
        if websocket:
            await websocket.send(json.dumps({"type":"sos","message":"SOS Triggered!","patient_id":session.patient_id}))
    except asyncio.CancelledError:
        print(f"[INFO] SOS cancelled for patient {session.patient_id}")

# -------------------------------
# WebSocket server for frontend
# -------------------------------
connected_clients = set()
async def ws_handler(websocket, path):
    connected_clients.add(websocket)
    try:
        async for message in websocket:
            data = json.loads(message)
            print("[WS] Received:", data)
    finally:
        connected_clients.remove(websocket)

async def send_question_ws(question_text, patient_id):
    if connected_clients:
        msg = json.dumps({"type":"question","text":question_text,"patient_id":patient_id})
        await asyncio.wait([ws.send(msg) for ws in connected_clients])

# -------------------------------
# EyeTrack – MediaPipe Head Gesture
# -------------------------------
def start_gesture_tracking(session):
    cap = cv2.VideoCapture(0)
    mp_face_mesh = mp.solutions.face_mesh
    face_mesh = mp_face_mesh.FaceMesh(max_num_faces=1, refine_landmarks=True,
                                      min_detection_confidence=0.7, min_tracking_confidence=0.7)
    pitch_buffer = []
    yaw_buffer = []
    buffer_length = 10
    pending_sos = {}

    loop = asyncio.get_event_loop()

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(frame_rgb)

        if results.multi_face_landmarks:
            landmarks = results.multi_face_landmarks[0].landmark

            left_eye = landmarks[33]
            right_eye = landmarks[263]
            nose_tip = landmarks[1]

            dx = right_eye.x - left_eye.x
            dy = right_eye.y - left_eye.y
            yaw = (dy/dx)*180
            dz = nose_tip.y - ((left_eye.y+right_eye.y)/2)
            pitch = dz*100

            pitch_buffer.append(pitch)
            yaw_buffer.append(yaw)
            if len(pitch_buffer) > buffer_length: pitch_buffer.pop(0)
            if len(yaw_buffer) > buffer_length: yaw_buffer.pop(0)

            gesture = detect_gesture(pitch_buffer, yaw_buffer)

            if gesture:
                print(f"[INFO] Gesture detected: {gesture}")
                output = process_gesture(session, gesture)
                if output == 'SOS triggered!':
                    # Cancel existing pending SOS
                    if pending_sos.get(session.patient_id):
                        pending_sos[session.patient_id].cancel()
                    # Schedule new SOS countdown
                    task = loop.create_task(trigger_sos(session, delay=5))
                    pending_sos[session.patient_id] = task
                elif output == 'Session completed!':
                    print("[INFO] Session completed")
                    break
                else:
                    print("[INFO] Next question:", output)
                    # Send to all connected websocket clients
                    loop.create_task(send_question_ws(output, session.patient_id))

        cv2.imshow('Head Gesture Tracking', frame)
        if cv2.waitKey(1) & 0xFF == 27:
            break

    cap.release()
    cv2.destroyAllWindows()

def detect_gesture(pitch_buf, yaw_buf):
    pitch_change = pitch_buf[-1]-pitch_buf[0]
    yaw_change = yaw_buf[-1]-yaw_buf[0]
    if pitch_change > 10:
        pitch_buf.clear()
        yaw_buf.clear()
        return 'yes'
    elif abs(yaw_change) > 15:
        pitch_buf.clear()
        yaw_buf.clear()
        return 'no'
    return None

# -------------------------------
# Main execution
# -------------------------------
async def main():
    # Start WebSocket server
    server = await websockets.serve(ws_handler, "localhost", 6789)
    print("[INFO] WebSocket server started on ws://localhost:6789")

    # Face login
    patient_id = input("Enter patient ID: ").strip()
    print(f"[INFO] Patient {patient_id} logged in")
    session = VoxentSession(patient_id)
    print(f"[INFO] First question: {session.get_current_question_text()}")
    await send_question_ws(session.get_current_question_text(), patient_id)

    # Start gesture tracking (blocking)
    start_gesture_tracking(session)

    # Keep WebSocket server running
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())
