import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import apiService from '../services/api';
import Navbar from '../componentes/Nadvar';
import Logo from '../assets/Logo.png';

const ReconocerPalabras = () => {
  const { modelId } = useParams();

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState(null);
  const [recognizedLetter1, setRecognizedLetter1] = useState('');
  const [recognizedLetter2, setRecognizedLetter2] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confidence1, setConfidence1] = useState(0);
  const [confidence2, setConfidence2] = useState(0);
  const [modelData, setModelData] = useState(null);
  const [isMediaPipeWorking, setIsMediaPipeWorking] = useState(false);

  const [currentWord, setCurrentWord] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [lastHeard, setLastHeard] = useState('');
  const [isAutoTraining, setIsAutoTraining] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const lastSendRef = useRef(0);
  const speechRecRef = useRef(null);
  const letter1Ref = useRef('');
  const letter2Ref = useRef('');
  const prevLm1Ref = useRef(null);
  const prevLm2Ref = useRef(null);

  const SEND_INTERVAL = 600;
  const CONFIDENCE_THRESHOLD = 60;
  const STABLE_COUNT = 3;
  const q1Ref = useRef([]);
  const q2Ref = useRef([]);

  const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
    [5, 9], [9, 13], [13, 17]
  ];

  const navbarData = {
    logo: Logo,
    logoAlt: 'Logo',
    baseColor: '#ffffff',
    menuColor: '#000000',
    items: [
      {
        label: 'Navegación',
        bgColor: '#f8f9fa',
        textColor: '#000000',
        links: [
          { label: 'Modelos', href: '/modelos', ariaLabel: 'Ver modelos' },
          { label: 'Entrenar', href: '/entrenar', ariaLabel: 'Ir a entrenar' },
          { label: 'Vocales', href: '/reconocer/5dca4642-15c8-42b3-ac3d-65d295b09d20', ariaLabel: 'Reconocer Vocales' }
        ]
      },
      {
        label: 'Accesos',
        bgColor: '#e3f2fd',
        textColor: '#000000',
        links: [
          { label: 'Formar Palabras', href: '/formar-palabras/4a2445ab-ff3f-4535-a91a-d50d2a417b4b', ariaLabel: 'Formar Palabras' },
          { label: 'Modelos Personalizados', href: '/modelos-personalizados', ariaLabel: 'Crear Modelo' }
        ]
      },
      {
        label: 'Ayuda',
        bgColor: '#f3e5f5',
        textColor: '#000000',
        links: [
          { label: 'Aprender', href: '/aprender', ariaLabel: 'Aprender' },
          { label: 'ChatBot', href: '/chatbot', ariaLabel: 'ChatBot' }
        ]
      }
    ]
  };

  const loadModelData = async () => {
    try {
      const models = await apiService.getModels();
      const model = models.find(m => m.id === modelId);
      if (!model) throw new Error(`Modelo con ID ${modelId} no encontrado`);
      setModelData(model);
    } catch (e) {
      setError(`Error al cargar los datos del modelo: ${e.message}`);
    }
  };

  const sendToBackend = async (landmarks) => {
    try {
      if (!landmarks || landmarks.length === 0) return;
      // Para el modelo "Abecedario" usamos 63 features (x,y,z)
      const arr = [];
      for (const p of landmarks) arr.push(p.x, p.y, p.z ?? 0);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`https://backendcodehand.onrender.com/models/${modelId}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ landmarks: arr }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.prediction) {
          const letter = String(data.prediction).toUpperCase();
          const conf = Math.round((data.confidence || 0.85) * 100);
          return { letter, confidence: conf };
        }
      } else if (response.status === 500) {
        // Intento de auto-reentrenar como en ReconocerVocales
        try {
          setIsAutoTraining(true);
          const train = await fetch(`https://backendcodehand.onrender.com/models/${modelId}/train`, { method: 'POST' });
          setTimeout(() => setIsAutoTraining(false), 3000);
        } catch (_) {
          setIsAutoTraining(false);
        }
      }
      return null;
    } catch (_) {}
  };

  const startCamera = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
        initializeMediaPipe();
        // Iniciar reconocimiento de voz tras gesto del usuario (clic en Activar Cámara)
        try {
          setupSpeechRecognition();
          if (speechRecRef.current) {
            speechRecRef.current.start();
            setIsVoiceActive(true);
            setVoiceError('');
          }
        } catch (e) {
          setVoiceError('No se pudo iniciar el micrófono');
          setIsVoiceActive(false);
        }
      }
      setIsLoading(false);
    } catch (err) {
      setError('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
      setIsLoading(false);
    }
  };

  const initializeMediaPipe = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
    hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.75, minTrackingConfidence: 0.85, selfieMode: true });
    handsRef.current = hands;
    hands.onResults(onResults);
    const camera = new Camera(videoRef.current, { onFrame: async () => { if (videoRef.current && handsRef.current) { await handsRef.current.send({ image: videoRef.current }); } }, width: 640, height: 480 });
    cameraRef.current = camera;
    camera.start();
  };

  const drawHand = (ctx, landmarks, colorStroke, colorFill) => {
    HAND_CONNECTIONS.forEach(([start, end]) => {
      const s = landmarks[start];
      const e = landmarks[end];
      if (s && e) {
        const sx = s.x * ctx.canvas.width;
        const sy = s.y * ctx.canvas.height;
        const ex = e.x * ctx.canvas.width;
        const ey = e.y * ctx.canvas.height;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = colorStroke;
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    });
    landmarks.forEach((lm) => {
      const x = lm.x * ctx.canvas.width;
      const y = lm.y * ctx.canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, 2 * Math.PI);
      ctx.strokeStyle = colorStroke;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = colorFill;
      ctx.fill();
    });
  };

  const onResults = (results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    setIsMediaPipeWorking(true);

    const handsLandmarks = results.multiHandLandmarks || [];
    if (handsLandmarks.length > 0) {
      // Suavizado con EMA
      const smooth1 = handsLandmarks[0] ? smoothLandmarks(handsLandmarks[0], prevLm1Ref, 0.8) : null;
      const smooth2 = handsLandmarks[1] ? smoothLandmarks(handsLandmarks[1], prevLm2Ref, 0.8) : null;
      // Mano 1: azul
      if (smooth1) drawHand(ctx, smooth1, '#00BFFF', '#87CEEB');
      // Mano 2: verde
      if (smooth2) drawHand(ctx, smooth2, '#22c55e', '#86efac');

      const now = Date.now();
      if (now - lastSendRef.current > SEND_INTERVAL) {
        lastSendRef.current = now;
        if (!error) {
          // Enviar ambas manos por separado (suavizadas si existen)
          sendToBackend(smooth1 || handsLandmarks[0])?.then((res) => {
            if (res) {
              setConfidence1(res.confidence);
              const q = q1Ref.current; q.push(res.letter); if (q.length > STABLE_COUNT) q.shift();
              const stable = q.length === STABLE_COUNT && q.every(x => x === res.letter);
              if (stable && res.confidence >= CONFIDENCE_THRESHOLD) {
                setRecognizedLetter1(res.letter);
                letter1Ref.current = res.letter;
              }
            }
          });
          if (smooth2 || handsLandmarks[1]) {
            sendToBackend(smooth2 || handsLandmarks[1])?.then((res) => {
              if (res) {
                setConfidence2(res.confidence);
                const q = q2Ref.current; q.push(res.letter); if (q.length > STABLE_COUNT) q.shift();
                const stable = q.length === STABLE_COUNT && q.every(x => x === res.letter);
                if (stable && res.confidence >= CONFIDENCE_THRESHOLD) {
                  setRecognizedLetter2(res.letter);
                  letter2Ref.current = res.letter;
                }
              }
            });
          } else {
            setRecognizedLetter2('');
            letter2Ref.current = '';
            setConfidence2(0);
          }
        }
      }
    } else {
      setRecognizedLetter1('');
      letter1Ref.current = '';
      setConfidence1(0);
      setRecognizedLetter2('');
      letter2Ref.current = '';
      setConfidence2(0);
      prevLm1Ref.current = null;
      prevLm2Ref.current = null;
    }
  };

  const stopCamera = () => {
    if (cameraRef.current) { cameraRef.current.stop(); cameraRef.current = null; }
    if (handsRef.current) { handsRef.current.close(); handsRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) { videoRef.current.srcObject = null; }
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setIsCameraActive(false);
    setRecognizedLetter1('');
    setConfidence1(0);
    setRecognizedLetter2('');
    setConfidence2(0);
    // Parar voz
    try { speechRecRef.current?.stop(); } catch (_) {}
    setIsVoiceActive(false);
  };

  useEffect(() => {
    loadModelData();
    return () => { if (cameraRef.current) cameraRef.current.stop(); if (handsRef.current) handsRef.current.close(); if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, [modelId]);

  // Configurar reconocimiento de voz (se inicia en startCamera por política de interacción)
  const setupSpeechRecognition = () => {
    if (speechRecRef.current) return; // ya configurado
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Reconocimiento de voz no soportado en este navegador');
      return;
    }
    const recog = new SpeechRecognition();
    recog.lang = 'es-ES';
    recog.continuous = true;
    recog.interimResults = false;

    recog.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const raw = (last?.[0]?.transcript || '').trim().toLowerCase();
      if (!raw) return;
      const text = raw.normalize('NFD').replace(/\p{Diacritic}/gu, ''); // quitar acentos
      setLastHeard(raw);
      console.log('[voz] escuchado:', raw);
      if (/(\benviar\b|\bmandar\b|\bconfirmar\b|\bagregar\b|\banadir\b|\baanadir\b)/.test(text)) {
        const l1 = letter1Ref.current || '';
        const l2 = letter2Ref.current || '';
        setCurrentWord(prev => prev + l1 + l2);
      } else if (/(\bespacio\b|\bspace\b|\bseparar\b)/.test(text)) {
        setCurrentWord(prev => (prev ? prev + ' ' : prev));
      } else if (/(\blimpiar\b|\bclear\b)/.test(text)) {
        setCurrentWord('');
      } else if (/(\bborrar\b|\bretroceder\b|\beliminar\b|\bquitar\b|\bborra\b)/.test(text)) {
        setCurrentWord(prev => prev.slice(0, -1));
      }
    };

    recog.onerror = (e) => {
      setVoiceError('Error de micrófono: ' + (e?.error || 'desconocido'));
      setIsVoiceActive(false);
    };

    recog.onstart = () => { setIsVoiceActive(true); setVoiceError(''); };
    recog.onend = () => {
      // reintentar siempre, mantener micrófono activo hasta recargar la página
      try { recog.start(); setIsVoiceActive(true); } catch (_) {}
    };

    speechRecRef.current = recog;
  };

  if (!modelData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            {error ? (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Modelo no encontrado</h3>
                <p className="text-gray-600">El modelo con ID "{modelId}" no existe</p>
              </div>
            ) : (
              <div className="text-gray-600">Cargando modelo...</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        logo={navbarData.logo}
        logoAlt={navbarData.logoAlt}
        items={navbarData.items}
        baseColor={navbarData.baseColor}
        menuColor={navbarData.menuColor}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8 mt-40">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">Formar Palabras</h1>
          <p className="text-gray-600">Modelo: {modelData.name}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Vista de la Cámara</h2>
              <div className="flex items-center gap-2">
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${isCameraActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {isCameraActive ? 'Cámara OK' : 'Cámara off'}
                </div>
                {isCameraActive && (
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${isMediaPipeWorking ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {isMediaPipeWorking ? 'MediaPipe OK' : 'Iniciando…'}
                  </div>
                )}
                {isCameraActive && (
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${isVoiceActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                    {isVoiceActive ? 'Micrófono ON' : 'Micrófono OFF'}
                  </div>
                )}
              </div>
            </div>
            <div className="relative bg-gray-900 rounded-lg overflow-hidden shadow-md">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-80 object-cover" style={{ transform: 'scaleX(-1)' }} />
              <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} width="640" height="480" />
            </div>
            <div className="mt-4 flex justify-center gap-3">
              {!isCameraActive ? (
                <button onClick={startCamera} disabled={isLoading} className="bg-[#A78D78] hover:brightness-95 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed">{isLoading ? 'Iniciando...' : 'Activar Cámara'}</button>
              ) : (
                <button onClick={stopCamera} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200">Detener Cámara</button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            {(voiceError || lastHeard) && (
              <div className="mb-4 text-xs">
                {voiceError ? (
                  <div className="text-red-600">{voiceError}</div>
                ) : (
                  <div className="text-gray-500">Último comando: “{lastHeard}”</div>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="border rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Mano 1</div>
                <div className="flex items-end gap-4">
                  <div className="text-6xl font-bold text-blue-600">{recognizedLetter1 || '-'}</div>
                  <div className="text-sm text-gray-600">{confidence1}%</div>
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Mano 2</div>
                <div className="flex items-end gap-4">
                  <div className="text-6xl font-bold text-green-600">{recognizedLetter2 || '-'}</div>
                  <div className="text-sm text-gray-600">{confidence2}%</div>
                </div>
              </div>
            </div>

            <div className="mb-2 text-sm text-gray-500">Palabra</div>
            <div className="min-h-[56px] p-3 rounded-lg border bg-gray-50 text-2xl tracking-wide">
              {currentWord || <span className="text-gray-400">Di “enviar”, “espacio”, “borrar”, “limpiar”.</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReconocerPalabras;



// Suavizado exponencial de landmarks (EMA)
function smoothLandmarks(current, prevRef, alpha = 0.6) {
  try {
    if (!current || current.length === 0) return current;
    const prev = prevRef.current;
    const smoothed = current.map((p, i) => {
      const px = prev?.[i]?.x ?? p.x;
      const py = prev?.[i]?.y ?? p.y;
      const pz = prev?.[i]?.z ?? (p.z ?? 0);
      return {
        x: alpha * px + (1 - alpha) * p.x,
        y: alpha * py + (1 - alpha) * p.y,
        z: alpha * pz + (1 - alpha) * (p.z ?? 0)
      };
    });
    prevRef.current = smoothed;
    return smoothed;
  } catch {
    prevRef.current = current;
    return current;
  }
}
