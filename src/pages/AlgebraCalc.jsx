import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import Navbar from '../componentes/Nadvar.jsx';
import Logo from '../assets/Logo.png';
import apiService from '../services/api.js';

const AlgebraCalc = () => {
  const { modelId } = useParams();

  const [modelData, setModelData] = useState(null);
  const [error, setError] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isMediaPipeWorking, setIsMediaPipeWorking] = useState(false);
  const [currentDigit, setCurrentDigit] = useState('');
  const [provisionalDigit, setProvisionalDigit] = useState('');
  const [confidence, setConfidence] = useState(0);
  const confidenceRef = useRef(0);
  const [expression, setExpression] = useState([]); // tokens: digits '1'..'5' and ops '+','-','*','/'
  const [result, setResult] = useState(null);
  const [lastHeard, setLastHeard] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const handsRef = useRef(null);
  const streamRef = useRef(null);
  const lastSendRef = useRef(0);
  const speechRecRef = useRef(null);
  const lastStableDigitRef = useRef('');
  const currentDigitRef = useRef('');
  const provisionalDigitRef = useRef('');
  const expressionRef = useRef([]);
  const lastAutoAppendDigitRef = useRef('');
  const lastAutoAppendTimeRef = useRef(0);
  const prevLmRef = useRef(null);

  const SEND_INTERVAL = 450;
  const CONFIDENCE_THRESHOLD = 70;
  const STABLE_COUNT = 2; // mínimo repeticiones del mismo dígito (más reactivo)
  const COOLDOWN_MS = 400; // ventana para no duplicar (aún más corta)
  const digitQueueRef = useRef([]);
  const lastAppendTimeRef = useRef(0);

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
      }
    ]
  };

  useEffect(() => {
    const load = async () => {
      try {
        const models = await apiService.getModels();
        const m = models.find(mm => mm.id === modelId);
        if (!m) throw new Error('Modelo no encontrado');
        setModelData(m);
      } catch (e) {
        setError(e.message);
      }
    };
    load();
  }, [modelId]);

  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
        initializeMediaPipe();
        setupSpeechRecognition();
        try { speechRecRef.current?.start(); setIsVoiceActive(true); } catch {}
      }
    } catch (e) {
      setError('No se pudo acceder a la cámara');
    }
  };

  const stopCamera = () => {
    if (cameraRef.current) { cameraRef.current.stop(); cameraRef.current = null; }
    if (handsRef.current) { handsRef.current.close(); handsRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) { videoRef.current.srcObject = null; }
    setIsCameraActive(false);
    try { speechRecRef.current?.stop(); } catch {}
    setIsVoiceActive(false);
  };

  const initializeMediaPipe = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
    hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.75, minTrackingConfidence: 0.85, selfieMode: true });
    handsRef.current = hands;
    hands.onResults(onResults);
    const cam = new Camera(videoRef.current, { onFrame: async () => { if (videoRef.current && handsRef.current) await handsRef.current.send({ image: videoRef.current }); }, width: 640, height: 480 });
    cameraRef.current = cam;
    cam.start();
  };

  const onResults = (results) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    setIsMediaPipeWorking(true);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const raw = results.multiHandLandmarks[0];
      const landmarks = smoothLandmarks(raw, prevLmRef, 0.65);

      // Dibujo igual al de otros módulos (azul/celeste)
      const HAND_CONNECTIONS = [
        [0,1],[1,2],[2,3],[3,4],
        [0,5],[5,6],[6,7],[7,8],
        [0,9],[9,10],[10,11],[11,12],
        [0,13],[13,14],[14,15],[15,16],
        [0,17],[17,18],[18,19],[19,20],
        [5,9],[9,13],[13,17]
      ];

      HAND_CONNECTIONS.forEach(([start, end]) => {
        const s = landmarks[start];
        const e = landmarks[end];
        if (s && e) {
          const sx = s.x * canvas.width;
          const sy = s.y * canvas.height;
          const ex = e.x * canvas.width;
          const ey = e.y * canvas.height;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.strokeStyle = '#00BFFF';
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      });

      landmarks.forEach((lm) => {
        const x = lm.x * canvas.width;
        const y = lm.y * canvas.height;
        // Círculo exterior
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, 2 * Math.PI);
        ctx.strokeStyle = '#00BFFF';
        ctx.lineWidth = 3;
        ctx.stroke();
        // Círculo interior
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#87CEEB';
        ctx.fill();
      });

      const now = Date.now();
      if (now - lastSendRef.current > SEND_INTERVAL) {
        lastSendRef.current = now;
        sendToBackend(landmarks).then(res => {
          if (res) {
            setConfidence(res.confidence);
            confidenceRef.current = res.confidence;
            const d = String(res.digit);
            setProvisionalDigit(d);
            provisionalDigitRef.current = d;
            // Estabilidad: mantener un buffer y confirmar solo si se repite
            const q = digitQueueRef.current;
            q.push(d);
            if (q.length > STABLE_COUNT) q.shift();
            const allSame = q.length === STABLE_COUNT && q.every(x => x === d);
            if (allSame && res.confidence >= CONFIDENCE_THRESHOLD) {
              if (lastStableDigitRef.current !== d) {
                lastStableDigitRef.current = d;
                setCurrentDigit(d);
                currentDigitRef.current = d;
              }
              // Auto-agregar '5' a la expresión cuando el dígito estable sea 5
              if (d === '5') {
                const now3 = Date.now();
                const lastTime = lastAutoAppendTimeRef.current || 0;
                const lastDigit = lastAutoAppendDigitRef.current || '';
                const lastToken = expressionRef.current[expressionRef.current.length - 1];
                if (now3 - lastTime > COOLDOWN_MS && lastDigit !== '5' && lastToken !== '5') {
                  setExpression(prev => { const next = [...prev, '5']; expressionRef.current = next; return next; });
                  lastAutoAppendDigitRef.current = '5';
                  lastAutoAppendTimeRef.current = now3;
                }
              }
            }
          }
        });
      }
    } else {
      // Sin mano: limpiar estado para evitar que el dígito quede pegado
      digitQueueRef.current = [];
      lastStableDigitRef.current = '';
      setCurrentDigit('');
      currentDigitRef.current = '';
      setProvisionalDigit('');
      provisionalDigitRef.current = '';
      setConfidence(0);
      confidenceRef.current = 0;
    }
  };

  const sendToBackend = async (landmarks) => {
    try {
      const arr = [];
      for (const p of landmarks) arr.push(p.x, p.y); // 42 features (x,y)
      const r = await fetch(`https://backendcodehand.onrender.com/models/${modelId}/predict`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ landmarks: arr })
      });
      if (!r.ok) return null;
      const data = await r.json();
      // asumimos predicción '1'..'5'
      return { digit: data.prediction, confidence: Math.round((data.confidence || 0.85) * 100) };
    } catch { return null; }
  };

  const tokensToResult = (tokens) => {
    // shunting-yard simple: * y / primero
    const nums = [];
    const ops = [];
    const prec = { '+':1,'-':1,'*':2,'/':2 };
    const apply = () => {
      const b = Number(nums.pop()); const a = Number(nums.pop());
      const op = ops.pop();
      let v = 0; if (op === '+') v = a + b; else if (op === '-') v = a - b; else if (op === '*') v = a * b; else if (op === '/') v = b === 0 ? NaN : a / b;
      nums.push(v);
    };
    tokens.forEach(t => {
      if (/^[1-5]$/.test(t)) nums.push(Number(t)); else if (/[+\-*/]/.test(t)) {
        while (ops.length && prec[ops[ops.length-1]] >= prec[t]) apply();
        ops.push(t);
      }
    });
    while (ops.length) apply();
    return nums[0];
  };

  const setupSpeechRecognition = () => {
    if (speechRecRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return;
    const recog = new SR(); recog.lang = 'es-ES'; recog.continuous = true; recog.interimResults = false;
    recog.onresult = (e) => {
      const last = e.results[e.results.length - 1]; const raw = (last?.[0]?.transcript || '').trim().toLowerCase(); if (!raw) return;
      setLastHeard(raw);
      const text = raw.normalize('NFD').replace(/\p{Diacritic}/gu, '');
      // Confirmación de dígitos por voz
      const said = parseSpokenDigit(text);
      const matchesStable = said && String(said) === String(currentDigitRef.current);
      const matchesProvisional = said && String(said) === String(provisionalDigitRef.current);
      if (matchesStable || matchesProvisional) {
        const now2 = Date.now();
        if (now2 - lastAppendTimeRef.current > COOLDOWN_MS) {
          setExpression(prev => { const next = [...prev, String(said)]; expressionRef.current = next; return next; });
          lastAppendTimeRef.current = now2;
          // resetear estabilidad para permitir cambio de dígito inmediato
          digitQueueRef.current = [];
          lastStableDigitRef.current = '';
          setCurrentDigit('');
          currentDigitRef.current = '';
        }
        return;
      }
      if (/\bmas\b/.test(text)) setExpression(prev => { const next = [...prev, '+']; expressionRef.current = next; return next; });
      else if (/\bmenos\b/.test(text)) setExpression(prev => { const next = [...prev, '-']; expressionRef.current = next; return next; });
      else if (/(\bpor\b|\bmult(i|iplicar)?\b)/.test(text)) setExpression(prev => { const next = [...prev, '*']; expressionRef.current = next; return next; });
      else if (/(\bentre\b|\bdividir\b)/.test(text)) setExpression(prev => { const next = [...prev, '/']; expressionRef.current = next; return next; });
      else if (/(\bes\s+igual\s+a\b|\bigual\b)/.test(text)) {
        const res = tokensToResult(expressionRef.current);
        setResult(res);
      } else if (/\bborrar\b/.test(text)) setExpression(prev => { const next = prev.slice(0, -1); expressionRef.current = next; return next; });
      else if (/\blimpiar\b/.test(text)) { expressionRef.current = []; setExpression([]); setResult(null); }
    };
    recog.onend = () => { try { recog.start(); setIsVoiceActive(true); } catch {} };
    speechRecRef.current = recog;
  };

  const displayExpr = expression.join(' ');

  if (!modelData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96 text-gray-600">Cargando modelo...</div>
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
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">Álgebra por Señas</h1>
          <p className="text-gray-600">Modelo: {modelData.name}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Vista de la Cámara</h2>
              <div className="flex items-center gap-2">
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${isCameraActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{isCameraActive ? 'Cámara OK' : 'Cámara off'}</div>
                {isCameraActive && <div className={`px-2 py-1 rounded-full text-xs font-medium ${isMediaPipeWorking ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{isMediaPipeWorking ? 'MediaPipe OK' : 'Iniciando…'}</div>}
                {isCameraActive && <div className={`px-2 py-1 rounded-full text-xs font-medium ${isVoiceActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{isVoiceActive ? 'Micrófono ON' : 'Micrófono OFF'}</div>}
              </div>
            </div>
            <div className="relative bg-gray-900 rounded-lg overflow-hidden shadow-md">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-80 object-cover" style={{ transform: 'scaleX(-1)' }} />
              <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} width="640" height="480" />
            </div>
            <div className="mt-4 flex justify-center gap-3">
              {!isCameraActive ? (
                <button onClick={startCamera} className="px-6 py-2 rounded-lg bg-black text-white hover:bg-white hover:text-black border border-black transition-colors">Activar Cámara</button>
              ) : (
                <button onClick={stopCamera} className="px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">Detener Cámara</button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="mb-3 text-sm text-gray-500">Dígito detectado</div>
            <div className="flex items-end gap-4 mb-6">
              <div className="text-6xl font-bold text-blue-600">{currentDigit || provisionalDigit || '-'}</div>
              <div className="text-sm text-gray-600">{confidence}%</div>
              {lastHeard && <div className="ml-auto text-xs text-gray-500">Voz: “{lastHeard}”</div>}
            </div>

            <div className="mb-2 text-sm text-gray-500">Expresión</div>
            <div className="min-h-[56px] p-3 rounded-lg border bg-gray-50 text-2xl tracking-wide mb-4">{displayExpr || <span className="text-gray-400">Di “más/menos/por/entre” y “es igual a”.</span>}</div>

            <div className="mb-2 text-sm text-gray-500">Resultado</div>
            <div className="min-h-[56px] p-3 rounded-lg border bg-gray-50 text-2xl tracking-wide">{result !== null ? result : <span className="text-gray-400">Esperando “es igual a”.</span>}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlgebraCalc;

// Suavizado exponencial de landmarks
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

// Parseo de dígitos por voz en español
function parseSpokenDigit(text) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (/(numero|n[uú]mero)\s+uno\b|\buno\b|\b1\b/.test(t)) return 1;
  if (/(numero|n[uú]mero)\s+dos\b|\bdos\b|\b2\b/.test(t)) return 2;
  if (/(numero|n[uú]mero)\s+tres\b|\btres\b|\b3\b/.test(t)) return 3;
  if (/(numero|n[uú]mero)\s+cuatro\b|\bcuatro\b|\b4\b/.test(t)) return 4;
  if (/(numero|n[uú]mero)\s+cinco\b|\bcinco\b|\b5\b/.test(t)) return 5;
  return null;
}


