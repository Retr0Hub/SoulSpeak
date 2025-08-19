'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, Sun, Moon, UserPlus, LogIn, Send, LogOut, Video, VideoOff, Trash, User, Pencil, KeyRound } from 'lucide-react';
import { io } from 'socket.io-client';
import './styles/globals.css';

// Initialize the socket connection
const socket = io('http://localhost:4000');

// --- MAIN APP COMPONENT ---
export default function AssistantCaretakerApp() {
	const [page, setPage] = useState('landing');
	const [authMode, setAuthMode] = useState('login');
	const [theme, setTheme] = useState('dark');
	const [caretaker, setCaretaker] = useState(null);
	const [showNewPatientModal, setShowNewPatientModal] = useState(false);
	const [showProfile, setShowProfile] = useState(false);
	const [authError, setAuthError] = useState('');
	const [showEditPatient, setShowEditPatient] = useState(null);

	// Trigger a refetch in the dashboard
	const patientListVersion = useRef(0);
	const forcePatientListRefetch = () => {
		patientListVersion.current += 1;
	};

	// Hash-based routing
	useEffect(() => {
		const applyHashRoute = () => {
			const raw = window.location.hash.replace('#', '').toLowerCase();
			if (raw === 'signin' || raw === 'login') {
				setAuthMode('login');
				setPage('auth');
			} else if (raw === 'signup' || raw === 'register') {
				setAuthMode('signup');
				setPage('auth');
			} else if (raw === 'patient' || raw === 'patientview') {
				setPage('patientView');
			} else if (raw === 'dashboard') {
				setPage('caretakerDashboard');
			} else {
				setPage('landing');
			}
		};
		window.addEventListener('hashchange', applyHashRoute);
		applyHashRoute();
		const token = localStorage.getItem('accessToken');
		if (token) {
			setCaretaker({ token });
			if (!window.location.hash) window.location.hash = 'dashboard';
		}
		return () => window.removeEventListener('hashchange', applyHashRoute);
	}, []);

	// Theme init and persistence
	useEffect(() => {
		const preferred = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
		setTheme(preferred);
	}, []);

	useEffect(() => {
		document.documentElement.classList.remove('light', 'dark');
		document.documentElement.classList.add(theme);
		localStorage.setItem('theme', theme);
	}, [theme]);

	const toggleTheme = () => {
		setTheme(currentTheme => (currentTheme === 'light' ? 'dark' : 'light'));
	};

	const handleLoginSuccess = (token) => {
		localStorage.setItem('accessToken', token);
		setCaretaker({ token });
		setPage('caretakerDashboard');
		window.location.hash = 'dashboard';
	};

	const handleLogout = () => {
		localStorage.removeItem('accessToken');
		setCaretaker(null);
		setPage('landing');
		window.location.hash = '';
	};

	const renderPage = () => {
		switch (page) {
			case 'auth':
				return (
					<AuthScreen
						initialMode={authMode}
						onLoginSuccess={handleLoginSuccess}
						onAuthError={(msg) => {
							setAuthError(msg);
							setPage('authError');
						}}
						onGoLogin={() => {
							setAuthMode('login');
							window.location.hash = 'signin';
						}}
					/>
				);
			case 'authError':
				return <AuthErrorScreen message={authError} onBack={() => setPage('auth')} />;
			case 'caretakerDashboard':
				return (
					<CaretakerDashboard
						onShowNewPatientModal={() => setShowNewPatientModal(true)}
						onShowProfile={() => setShowProfile(true)}
						onLogout={handleLogout}
						patientListVersion={patientListVersion.current}
						setShowEditPatient={setShowEditPatient}
					/>
				);
			case 'patientView':
				return <PatientScreen />;
			default:
				return (
					<LandingScreen
						onGoSignin={() => {
							setAuthMode('login');
							window.location.hash = 'signin';
						}}
						onGoSignup={() => {
							setAuthMode('signup');
							window.location.hash = 'signup';
						}}
						onGoPatient={() => {
							window.location.hash = 'patient';
						}}
					/>
				);
		}
	};

	return (
		<div className="min-h-screen font-sans bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-slate-50 transition-colors duration-300">
			<ThemeToggler theme={theme} toggleTheme={toggleTheme} />
			<main className="p-4 sm:p-6 md:p-8">
				{renderPage()}
				{showNewPatientModal && (
					<NewPatientModal onClose={() => setShowNewPatientModal(false)} onPatientAdded={forcePatientListRefetch} />
				)}
				{showEditPatient && (
					<EditPatientModal
						patient={showEditPatient}
						onClose={() => setShowEditPatient(null)}
						onSaved={forcePatientListRefetch}
					/>
				)}
				{showProfile && <CaretakerProfileDrawer onClose={() => setShowProfile(false)} />}
			</main>
		</div>
	);
}

const LandingScreen = ({ onGoSignin, onGoSignup, onGoPatient }) => (
  <div className="relative flex flex-col h-screen overflow-hidden text-center px-4">
    {/* Background Grid */}
    <div className="absolute inset-0 bg-grid-slate-200/[0.05] dark:bg-grid-slate-700/[0.1] [mask-image:linear-gradient(to_bottom,white_5%,transparent_50%)]"></div>

    {/* Main Content (centered) */}
    <div className="relative z-10 flex flex-col items-center justify-center flex-1">
      <div className="relative">
        <div className="absolute -inset-2 bg-gradient-to-r from-teal-400 to-blue-600 rounded-full blur-3xl opacity-20 dark:opacity-30"></div>
        <h1 className="relative text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-600">
          SoulSpeak
        </h1>
      </div>
      <p className="mt-6 text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
        Bridging communication gaps with a simple gesture. Empowering patients, assisting caretakers.
      </p>

      <div className="mt-12 flex flex-col sm:flex-row justify-center items-center gap-4">
        <button
          onClick={onGoSignin}
          className="group flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 text-lg font-semibold text-white bg-slate-800 dark:bg-slate-700 rounded-xl shadow-lg hover:bg-slate-700 dark:hover:bg-slate-600 transform hover:-translate-y-1 transition-all duration-300"
        >
          Caretaker Sign In{" "}
          <LogIn className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
        <button
          onClick={onGoPatient}
          className="group flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 text-lg font-semibold text-teal-600 dark:text-teal-400 bg-white dark:bg-slate-800/50 border-2 border-teal-500/50 dark:border-teal-400/50 rounded-xl shadow-lg hover:border-teal-500 dark:hover:border-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transform hover:-translate-y-1 transition-all duration-300"
        >
          Patient View{" "}
          <ChevronRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </div>
    </div>

    {/* Footer (always bottom) */}
    <footer className="relative z-10 py-16 text-xs text-slate-500 dark:text-slate-400">
      © SoulSpeak 2025
    </footer>
  </div>
);


const AuthScreen = ({ initialMode = 'login', onLoginSuccess, onAuthError, onGoLogin }) => {
	const [isLogin, setIsLogin] = useState(initialMode !== 'signup');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [mobileNumber, setMobileNumber] = useState('');
	const [error, setError] = useState('');

	const handleAuthAction = async (e) => {
		e.preventDefault();
		setError('');
		const url = isLogin ? 'http://localhost:4000/login' : 'http://localhost:4000/signup';
		const body = isLogin ? { email, password } : { email, password, mobileNumber };

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const data = await response.json();
			if (!response.ok) {
				onAuthError?.(data.error || 'Randomized auth error.');
				return;
			}
			if (isLogin) {
				onLoginSuccess(data.accessToken);
			} else {
				onGoLogin?.();
			}
		} catch (err) {
			setError(err.message);
		}
	};

	return (
		<div className="flex items-center justify-center min-h-[90vh]">
			<div className="w-full max-w-md p-8 md:p-10 space-y-6 bg-white dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl">
				<div className="text-center">
					<h2 className="text-3xl font-bold text-slate-900 dark:text:white">{isLogin ? 'Welcome Back' : 'Create Your Account'}</h2>
					<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{isLogin ? 'Sign in to access your dashboard' : 'Get started in just a few steps'}</p>
				</div>
				<form className="space-y-6" onSubmit={handleAuthAction}>
					<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required className="block w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 border-2 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition" />
					{!isLogin && (
						<input type="tel" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} placeholder="Mobile Number" required className="block w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 border-2 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition" />
					)}
					<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className="block w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 border-2 border-transparent rounded-lg focus:outline:none focus:ring-2 focus:ring-teal-500 transition" />
					{error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
					<button type="submit" className="w-full py-4 px-4 font-semibold rounded-lg text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-700 dark:focus:ring-offset-slate-800 shadow-lg transform hover:-translate-y-0.5 transition-all duration-200">{isLogin ? 'Sign In' : 'Create Account'}</button>
				</form>
				<p className="text-center text-sm">
					<button onClick={() => { const next = !isLogin; setIsLogin(next); window.location.hash = next ? 'signin' : 'signup'; }} className="font-medium text-teal-600 dark:text-teal-400 hover:underline">{isLogin ? 'Need an account? Register' : 'Already have an account? Sign In'}</button>
				</p>
			</div>
		</div>
	);
};

const CaretakerDashboard = ({ onShowNewPatientModal, onShowProfile, onLogout, patientListVersion, setShowEditPatient }) => {
	const [patients, setPatients] = useState([]);
	const [connectedPin, setConnectedPin] = useState(null);
	const [currentQuestion, setCurrentQuestion] = useState('');
	const [lastAnswer, setLastAnswer] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [questionInput, setQuestionInput] = useState('');

	const connectedPatient = patients.find((p) => p.pin === connectedPin);

	useEffect(() => {
		const onReceiveAnswer = (data) => {
			if (data.pin === connectedPin) {
				setLastAnswer(data.answer);
			}
		};
		socket.on('receiveAnswer', onReceiveAnswer);
		return () => socket.off('receiveAnswer', onReceiveAnswer);
	}, [connectedPin]);

	const fetchPatients = useCallback(async () => {
		setIsLoading(true);
		const token = localStorage.getItem('accessToken');
		if (!token) { onLogout(); return; }
		try {
			const response = await fetch('http://localhost:4000/api/patients', { headers: { 'Authorization': `Bearer ${token}` } });
			if (!response.ok) throw new Error('Failed to fetch patients.');
			const data = await response.json();
			setPatients(data);
		} catch (error) {
			console.error(error);
			onLogout();
		} finally {
			setIsLoading(false);
		}
	}, [onLogout]);

	useEffect(() => {
		fetchPatients();
	}, [fetchPatients, patientListVersion]);

	const handleAskQuestion = (e) => {
		e.preventDefault();
		if (questionInput.trim() && connectedPin) {
			socket.emit('sendQuestion', { pin: connectedPin, question: questionInput });
			setCurrentQuestion(questionInput);
			setLastAnswer(null);
			setQuestionInput('');
		}
	};

	const selectPatient = (pin) => {
		setConnectedPin(pin);
		setCurrentQuestion('');
		setLastAnswer(null);
	};

	return (
		<div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
			<div className="lg:col-span-1 bg:white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-lg">
				<div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
					<h2 className="text-2xl font-bold">Patients</h2>
					<div className="flex items-center gap-2">
						<button onClick={onShowProfile} className="p-2 rounded-full text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"><User size={20} /></button>
						<button onClick={onShowNewPatientModal} className="p-2 rounded-full text-white bg-teal-500 hover:bg-teal-600 transition-colors"><UserPlus size={20} /></button>
						<button onClick={onLogout} className="p-2 rounded-full text-white bg-red-500 hover:bg-red-600 transition-colors"><LogOut size={20} /></button>
					</div>
				</div>
				<div className="space-y-3 max-h:[65vh] overflow-y:auto pr-2">
					{isLoading ? (
						<p className="text-slate-500 dark:text-slate-400 text-center py-4">Loading patients...</p>
					) : patients.length === 0 ? (
						<p className="text-slate-500 dark:text-slate-400 text-center py-4">No patients registered.</p>
					) : (
						patients.map((patient) => (
							<div key={patient.id} className={`p-4 rounded-xl border-2 transition-all duration-200 ${connectedPin === patient.pin ? 'bg-teal-500/10 border-teal-500' : 'bg-gray-100 dark:bg-slate-700/50 border-transparent hover:border-teal-500/50'}`}>
								<div className="flex items-start justify-between gap-3">
									<div className="flex-1 cursor-pointer" onClick={() => selectPatient(patient.pin)}>
										<p className="font-semibold text-slate-800 dark:text-slate-100">{patient.name}</p>
										<p className="text-sm text-slate-500 dark:text-slate-400 font-mono">PIN: {patient.pin}</p>
									</div>
									<div className="flex items-center gap-2">
										<button onClick={(e) => { e.stopPropagation(); setShowEditPatient(patient); }} className="p-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"><Pencil size={16} /></button>
										<button
											onClick={async (e) => {
												e.stopPropagation();
												if (!confirm('Delete this patient?')) return;
												const token = localStorage.getItem('accessToken');
												try {
													const resp = await fetch(`http://localhost:4000/api/patients/${patient.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
													if (resp.ok) {
														fetchPatients();
														if (connectedPin === patient.pin) { setConnectedPin(null); }
													}
												} catch (err) {
													console.error(err);
													alert('Failed to delete');
												}
											}}
											className="p-2 rounded-lg bg-red-500/90 hover:bg-red-600 text:white transition-colors"
										>
											<Trash size={16} />
										</button>
									</div>
								</div>
							</div>
						))
					)}
				</div>
			</div>
			<div className="lg:col-span-2 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-lg flex flex-col">
				{connectedPin ? (
					<>
						<p className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">Connected to <span className="font-bold text-teal-600 dark:text-teal-400">{connectedPatient?.name}</span></p>
						<div className="flex-grow bg-gray-100 dark:bg-slate-800 rounded-xl p-6 flex flex-col justify-center items-center text-center gap-4 transition-all duration-500">
							{lastAnswer ? (
								<>
									<p className="text-slate-500 dark:text-slate-400 transition-all">Q: &quot;{currentQuestion}&quot;</p>
									<div className={`text-9xl font-bold transition-all duration-300 ease-in-out ${lastAnswer === 'yes' ? 'text-green-500' : 'text-red-500'}`}>{lastAnswer.toUpperCase()}</div>
								</>
							) : currentQuestion ? (
								<div>
									<p className="text-slate-500 dark:text-slate-400">Question Sent:</p>
									<p className="text-3xl font-semibold mt-2 text-slate-800 dark:text-slate-100">&quot;{currentQuestion}&quot;</p>
									<div className="mt-6 text-slate-400 animate-pulse">Waiting for response...</div>
								</div>
							) : (
								<p className="text-xl text-slate-500 dark:text-slate-400">Ask a yes/no question below.</p>
							)}
						</div>
						<form onSubmit={handleAskQuestion} className="mt-6 flex gap-3">
							<input type="text" value={questionInput} onChange={(e) => setQuestionInput(e.target.value)} placeholder="Type your question here..." className="flex-grow px-4 py-3 bg-gray-100 dark:bg-slate-700 border-2 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition" />
							<button type="submit" className="px-6 py-3 font-semibold rounded-lg text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-700 dark:focus:ring-offset-slate-900 shadow-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all duration-200"><Send size={18} /> Ask</button>
						</form>
					</>
				) : (
					<div className="flex-grow flex items-center justify-center text-center text-slate-500 dark:text-slate-400"><p className="text-2xl font-medium">Please select a patient to begin.</p></div>
				)}
			</div>
		</div>
	);
};

const PatientScreen = () => {
	const [pin, setPin] = useState('');
	const [isRegistered, setIsRegistered] = useState(false);
	const [question, setQuestion] = useState('');
	const [feedback, setFeedback] = useState(null);
	const [webcamEnabled, setWebcamEnabled] = useState(true);

	const videoRef = useRef(null);
	const canvasRef = useRef(null);
	const wsRef = useRef(null);

	// Initialize or restore PIN and registration
	useEffect(() => {
		const generatePin = () => Math.floor(100000 + Math.random() * 900000).toString();
		const savedPin = localStorage.getItem('patientPin');
		if (savedPin) {
			setPin(savedPin);
			socket.emit('registerPatient', savedPin);
			setIsRegistered(true);
		} else {
			const newPin = generatePin();
			setPin(newPin);
			socket.emit('registerPatient', newPin);
		}
	}, []);

	useEffect(() => {
		const onConnected = () => {
			localStorage.setItem('patientPin', pin);
			setIsRegistered(true);
		};
		socket.on('patientConnected', onConnected);
		return () => socket.off('patientConnected', onConnected);
	}, [pin]);

	const sendAnswer = useCallback((answer) => {
		if (isRegistered) {
			socket.emit('sendAnswer', { pin, answer });
			setFeedback(answer);
			setTimeout(() => setFeedback(null), 1500);
		}
	}, [isRegistered, pin]);

	useEffect(() => {
		if (isRegistered) {
			const onReceiveQuestion = (q) => setQuestion(q);
			socket.on('receiveQuestion', onReceiveQuestion);
			return () => socket.off('receiveQuestion', onReceiveQuestion);
		}
	}, [isRegistered]);

	useEffect(() => {
		let intervalId = null;
		if (isRegistered && webcamEnabled) {
			navigator.mediaDevices.getUserMedia({ video: true })
				.then(stream => {
					if (videoRef.current) videoRef.current.srcObject = stream;
					intervalId = setInterval(() => {
						if (wsRef.current?.readyState === WebSocket.OPEN) {
							const canvas = canvasRef.current;
							const video = videoRef.current;
							if (canvas && video && video.readyState === 4) {
								canvas.width = video.videoWidth;
								canvas.height = video.videoHeight;
								canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
								wsRef.current.send(canvas.toDataURL('image/jpeg', 0.5));
							}
					}
					}, 200);
				})
				.catch(err => console.error('Webcam error:', err));
		}
		return () => {
			clearInterval(intervalId);
			if (videoRef.current?.srcObject) {
				videoRef.current.srcObject.getTracks().forEach(track => track.stop());
			}
		};
	}, [isRegistered, webcamEnabled]);

	useEffect(() => {
		if (isRegistered && webcamEnabled) {
			wsRef.current = new WebSocket('ws://localhost:8765');
			wsRef.current.onopen = () => console.log('Connected to Python gesture server.');
			wsRef.current.onmessage = (event) => {
				const gesture = event.data.trim().toLowerCase();
				if (gesture === 'yes' || gesture === 'no') {
					sendAnswer(gesture);
				}
			};
			return () => wsRef.current?.close();
		}
	}, [isRegistered, webcamEnabled, sendAnswer]);

	const handleRegister = (e) => {
		e.preventDefault();
		if (pin.trim()) {
			socket.emit('registerPatient', pin.trim());
		}
	};

	const handlePatientLogout = () => {
		localStorage.removeItem('patientPin');
		setQuestion('');
		setFeedback(null);
		setIsRegistered(false);
		const newPin = Math.floor(100000 + Math.random() * 900000).toString();
		setPin(newPin);
		socket.emit('registerPatient', newPin);
	};

	if (!isRegistered) {
		return (
			<div className="flex items-center justify-center min-h-[90vh]">
				<div className="w-full max-w-sm p-8 md:p-10 space-y-6 bg-white dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl">
					<h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white">Patient Connect</h2>
					<form onSubmit={handleRegister} className="space-y-6">
						<div className="text-center">
							<div className="text-sm text-slate-500 dark:text-slate-400">Your PIN</div>
							<div className="mt-2 text-5xl font-mono tracking-widest text-slate-900 dark:text-white">{pin || '------'}</div>
							<div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Share this PIN with your caretaker to connect</div>
						</div>
						<button type="submit" className="w-full py-4 px-4 font-semibold rounded-lg text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-700 dark:focus:ring-offset-slate-800 shadow-lg transform hover:-translate-y-0.5 transition-all duration-200">Waiting for caretaker…</button>
					</form>
				</div>
			</div>
		);
	}

	return (
		<div className="relative flex flex-col items-center justify-center min-h-[90vh] text-center p-4">
			<div className={`absolute inset-0 transition-all duration-500 ease-in-out ${feedback === 'yes' ? 'bg-green-500/20' : feedback === 'no' ? 'bg-red-500/20' : 'opacity-0'}`}></div>
			<div className="relative z-10 w-full max-w-4xl">
				{question ? (
					<div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-lg border border-slate-200/50 dark:border-slate-700/50 p-8 md:p-16 rounded-3xl shadow-2xl">
						<h2 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-white">{question}</h2>
					</div>
				) : (
					<p className="text-3xl font-medium text-slate-500 dark:text-slate-400">Waiting for a question from the caretaker...</p>
				)}
				{feedback && (
					<div className="mt-16 text-9xl font-extrabold animate-pulse">
						<span className={feedback === 'yes' ? 'text-green-500' : 'text-red-500'}>{feedback.toUpperCase()}</span>
					</div>
				)}
			</div>
			<div className="absolute bottom-6 right-6 flex flex-col items:end gap-3">
				<video ref={videoRef} autoPlay playsInline muted className={`w-48 h-36 rounded-xl object-cover bg-slate-900 border border-slate-200/20 dark:border-slate-700/50 shadow-2xl transition-all duration-300 ${webcamEnabled ? 'opacity-100' : 'opacity-0 scale-50 -translate-y-4'}`} />
				<canvas ref={canvasRef} className="hidden" />
				<div className="flex items-center gap-2">
					<button onClick={() => setWebcamEnabled(!webcamEnabled)} className="p-3 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors">
						{webcamEnabled ? <VideoOff size={24} /> : <Video size={24} />}
					</button>
					<button onClick={handlePatientLogout} className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2"><LogOut size={16} /> Logout</button>
				</div>
			</div>
		</div>
	);
};

// --- UI COMPONENTS ---
const ThemeToggler = ({ theme, toggleTheme }) => (
	<button onClick={toggleTheme} className="fixed top-6 right-6 z-50 p-3 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors" aria-label="Toggle theme">
		{theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
	</button>
);

const NewPatientModal = ({ onClose, onPatientAdded }) => {
	const [name, setName] = useState('');
	const [pin, setPin] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!name.trim()) return;
		setLoading(true);
		const token = localStorage.getItem('accessToken');
		try {
			const response = await fetch('http://localhost:4000/api/patients', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
				body: JSON.stringify({ name, pin: pin.trim() || undefined })
			});
			if (!response.ok) throw new Error('Failed to add patient');
			onPatientAdded();
			onClose();
		} catch (error) {
			console.error(error);
			alert('Could not add patient.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
			<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 border dark:border-slate-700">
				<h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Connect Patient</h3>
				<form onSubmit={handleSubmit}>
					<input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Patient's Full Name" className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 border-2 border-transparent rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500 transition" autoFocus />
					<input type="text" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Patient PIN (from their screen)" className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 border-2 border-transparent rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500 transition" />
					<div className="flex justify-end gap-3">
						<button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg bg-gray-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
						<button type="submit" disabled={loading} className="px-5 py-2.5 rounded-lg text-white bg-teal-600 hover:bg-teal-700 font-semibold disabled:bg-gray-400 transition-colors">{loading ? 'Saving...' : 'Add Patient'}</button>
					</div>
				</form>
			</div>
		</div>
	);
};

const EditPatientModal = ({ patient, onClose, onSaved }) => {
	const [name, setName] = useState(patient?.name || '');
	const [pin, setPin] = useState(patient?.pin || '');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!name.trim()) return;
		setLoading(true);
		const token = localStorage.getItem('accessToken');
		try {
			const response = await fetch(`http://localhost:4000/api/patients/${patient.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
				body: JSON.stringify({ name: name.trim(), pin: pin.trim() })
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || 'Failed to update patient');
			onSaved?.();
			onClose();
		} catch (error) {
			console.error(error);
			alert(error.message || 'Could not update patient.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
			<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 border dark:border-slate-700">
				<h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Edit Patient</h3>
				<form onSubmit={handleSubmit}>
					<input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Patient's Full Name" className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500 transition" autoFocus />
					<input type="text" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Patient PIN" className="w-full px-4 py-3 bg:white dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500 transition" />
					<div className="flex justify-end gap-3">
						<button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg bg-gray-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
						<button type="submit" disabled={loading} className="px-5 py-2.5 rounded-lg text-white bg-teal-600 hover:bg-teal-700 font-semibold disabled:bg-gray-400 transition-colors">{loading ? 'Saving...' : 'Save Changes'}</button>
					</div>
				</form>
			</div>
		</div>
	);
};

const AuthErrorScreen = ({ message, onBack }) => (
	<div className="flex items-center justify-center min-h-[90vh]">
		<div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800/60 border border-red-300/50 dark:border-red-500/30 rounded-2xl shadow-2xl">
			<h2 className="text-2xl font-bold text-red-600">Authentication Error</h2>
			<p className="text-sm text-slate-600 dark:text-slate-400">{message || 'A randomized authentication error occurred.'}</p>
			<button onClick={onBack} className="w-full py-3 rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition">Back to Login</button>
		</div>
	</div>
);

// --- Caretaker Profile Drawer ---
const CaretakerProfileDrawer = ({ onClose }) => {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [email, setEmail] = useState('');
	const [name, setName] = useState('');
	const [mobileNumber, setMobileNumber] = useState('');
	const [error, setError] = useState('');

	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [passwordMessage, setPasswordMessage] = useState('');
	const [passwordSaving, setPasswordSaving] = useState(false);

	useEffect(() => {
		const fetchMe = async () => {
			setLoading(true);
			setError('');
			const token = localStorage.getItem('accessToken');
			try {
				const resp = await fetch('http://localhost:4000/api/me', { headers: { 'Authorization': `Bearer ${token}` } });
				const data = await resp.json();
				if (!resp.ok) throw new Error(data.error || 'Failed to load profile');
				setEmail(data.email || '');
				setName(data.name || '');
				setMobileNumber(data.mobileNumber || '');
			} catch (e) {
				setError(e.message);
			} finally {
				setLoading(false);
			}
		};
		fetchMe();
	}, []);

	const save = async (e) => {
		e.preventDefault();
		setSaving(true);
		setError('');
		const token = localStorage.getItem('accessToken');
		try {
			const resp = await fetch('http://localhost:4000/api/me', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
				body: JSON.stringify({ name, mobileNumber })
			});
			const data = await resp.json();
			if (!resp.ok) throw new Error(data.error || 'Failed to save');
			onClose();
		} catch (e) {
			setError(e.message);
		} finally {
			setSaving(false);
		}
	};

	const handleChangePassword = async (e) => {
		e.preventDefault();
		setPasswordMessage('');
		if (newPassword !== confirmPassword) {
			setPasswordMessage('New passwords do not match');
			return;
		}
		setPasswordSaving(true);
		const token = localStorage.getItem('accessToken');
		try {
			const resp = await fetch('http://localhost:4000/api/me/password', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
				body: JSON.stringify({ currentPassword, newPassword })
			});
			const data = await resp.json();
			if (!resp.ok) throw new Error(data.error || 'Failed to change password');
			setPasswordMessage('Password updated successfully');
			setCurrentPassword('');
			setNewPassword('');
			setConfirmPassword('');
		} catch (e) {
			setPasswordMessage(e.message || 'Failed to change password');
		} finally {
			setPasswordSaving(false);
		}
	};

	const handleDeleteAccount = async () => {
		if (!confirm('Delete your account permanently? This will remove all your patients and sessions.')) return;
		const token = localStorage.getItem('accessToken');
		try {
			const resp = await fetch('http://localhost:4000/api/me', { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
			const data = await resp.json();
			if (!resp.ok) throw new Error(data.error || 'Failed to delete account');
			localStorage.removeItem('accessToken');
			window.location.hash = '';
			window.location.reload();
		} catch (e) {
			alert(e.message || 'Failed to delete account');
		}
	};

	return (
		<div className="fixed inset-0 z-50">
			<div className="absolute inset-0 bg-black/50" onClick={onClose} />
			<div className="absolute top-0 right-0 h-full w-full sm:w-[28rem] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl p-6 overflow-y-auto">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-xl font-bold">Caretaker Settings</h3>
					<button onClick={onClose} className="text-slate-500 hover:text-slate-700">Close</button>
				</div>
				{loading ? (
					<div className="text-slate-500">Loading…</div>
				) : (
					<>
						<form onSubmit={save} className="space-y-4">
							{error && <div className="text-red-500 text-sm">{error}</div>}
							<div>
								<label className="block text-sm mb-1 text-slate-600 dark:text-slate-300">Email</label>
								<input value={email} disabled className="w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
							</div>
							<div>
								<label className="block text-sm mb-1 text-slate-600 dark:text-slate-300">Full Name</label>
								<input value={name} onChange={(e)=>setName(e.target.value)} className="w-full px-3 py-2 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" placeholder="Your name" />
							</div>
							<div>
								<label className="block text-sm mb-1 text-slate-600 dark:text-slate-300">Mobile Number</label>
								<input value={mobileNumber} onChange={(e)=>setMobileNumber(e.target.value)} className="w-full px-3 py-2 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" placeholder="Phone" />
							</div>
							<div className="flex justify-end gap-2 pt-2">
								<button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-slate-700">Cancel</button>
								<button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-teal-600 text-white disabled:bg-gray-400">{saving ? 'Saving…' : 'Save'}</button>
							</div>
						</form>

						<div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
							<h4 className="text-sm font-semibold mb-3">Change Password</h4>
							<form onSubmit={handleChangePassword} className="space-y-3">
								{passwordMessage && <div className={`text-sm ${passwordMessage.includes('successfully') ? 'text-green-500' : 'text-red-500'}`}>{passwordMessage}</div>}
								<input type="password" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} placeholder="Current password" className="w-full px-3 py-2 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
								<input type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} placeholder="New password" className="w-full px-3 py-2 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
								<input type="password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="w-full px-3 py-2 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
								<div className="flex justify-end">
									<button type="submit" disabled={passwordSaving} className="px-4 py-2 rounded-md bg-indigo-600 text-white disabled:bg-gray-400 flex items-center gap-2"><KeyRound size={16} /> {passwordSaving ? 'Updating…' : 'Update Password'}</button>
								</div>
							</form>
						</div>

						<div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
							<h4 className="text-sm font-semibold mb-3 text-red-600">Danger Zone</h4>
							<button onClick={handleDeleteAccount} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700">Delete Account</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
};