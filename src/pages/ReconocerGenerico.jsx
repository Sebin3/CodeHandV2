import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../componentes/Nadvar.jsx';
import Logo from '../assets/Logo.png';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import apiService from '../services/api.js';

const ReconocerGenerico = () => {
  const { modelId } = useParams();
  const [modelData, setModelData] = useState(null);
  const [error, setError] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isMediaPipeWorking, setIsMediaPipeWorking] = useState(false);
  const [prediction, setPrediction] = useState('');
  const [confidence, setConfidence] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const handsRef = useRef(null);
  const streamRef = useRef(null);
  const lastSendRef = useRef(0);
  const prevLmRef = useRef(null);
  const predsRef = useRef([]);
  const lastStableRef = useRef('');

  const CONFIDENCE_THRESHOLD = 60;
  const STABLE_COUNT = 3;

  const SEND_INTERVAL = 600;

  const navbarData = {
    logo: Logo,
    logoAlt: 'Logo',
    baseColor: '#ffffff',
    menuColor: '#000000',
    items: []
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
    return () => { stopCamera(); };
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
  };

  const initializeMediaPipe = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
    hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.75, minTrackingConfidence: 0.85, selfieMode: true });
    handsRef.current = hands;
    hands.onResults(onResults);
    const camera = new Camera(videoRef.current, { onFrame: async () => { if (videoRef.current && handsRef.current) await handsRef.current.send({ image: videoRef.current }); }, width: 640, height: 480 });
    cameraRef.current = camera; camera.start();
  };

  const onResults = (results) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    setIsMediaPipeWorking(true);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const raw = results.multiHandLandmarks[0];
      const landmarks = smoothLandmarks(raw, prevLmRef, 0.8);
      const now = Date.now();
      if (now - lastSendRef.current > SEND_INTERVAL) {
        lastSendRef.current = now;
        sendToBackend(landmarks);
      }
    }
  };

  const sendToBackend = async (landmarks) => {
    try {
      const arr = [];
      for (const p of landmarks) arr.push(p.x, p.y); // 42 features por defecto
      const r = await fetch(`https://backendcodehand.onrender.com/models/${modelId}/predict`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ landmarks: arr })
      });
      if (!r.ok) return;
      const data = await r.json();
      if (data.prediction) {
        const conf = Math.round((data.confidence || 0.85) * 100);
        setConfidence(conf);
        const p = String(data.prediction);
        const q = predsRef.current; q.push(p); if (q.length > STABLE_COUNT) q.shift();
        const stable = q.length === STABLE_COUNT && q.every(x => x === p);
        if (stable && conf >= CONFIDENCE_THRESHOLD) {
          if (lastStableRef.current !== p) {
            lastStableRef.current = p;
            setPrediction(p);
          }
        }
      }
    } catch {}
  };

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
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">Reconocimiento de señas</h1>
          <p className="text-gray-600">Modelo: {modelData.name}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Panel cámara */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Vista de la Cámara</h2>
              <div className="flex items-center gap-2">
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${isCameraActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{isCameraActive ? 'Activa' : 'Inactiva'}</div>
                {isCameraActive && (
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${isMediaPipeWorking ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{isMediaPipeWorking ? 'MediaPipe OK' : 'Iniciando…'}</div>
                )}
              </div>
            </div>

            <div className="relative bg-gray-900 rounded-lg overflow-hidden shadow-md">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-80 object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
                width="640"
                height="480"
              />
              {!isCameraActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-center text-white">
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium mb-1">Cámara Inactiva</p>
                    <p className="text-gray-400 text-sm">Haz clic en "Activar Cámara" para comenzar</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-center gap-3">
              {!isCameraActive ? (
                <button onClick={startCamera} className="bg-[#A78D78] hover:brightness-95 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 shadow-md">
                  Activar Cámara
                </button>
              ) : (
                <button onClick={stopCamera} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200">
                  Detener Cámara
                </button>
              )}
            </div>
          </div>

          {/* Panel reconocimiento */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Reconocimiento de señas</h2>
              <div className="flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Analizando</span>
              </div>
            </div>

            <div className="text-center">
              {prediction ? (
                <div className="bg-green-50 rounded-xl p-8 border-2 border-green-200">
                  <div className="text-8xl font-bold text-green-600 mb-4">{prediction}</div>
                  <div className="bg-green-100 rounded-lg p-3">
                    <p className="text-lg text-green-800 font-semibold mb-1">¡Seña Detectada!</p>
                    <div className="flex items-center justify-center gap-2 text-sm text-green-700">Confianza: {confidence}%</div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-8 border-2 border-gray-200">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3">
                    <p className="text-lg text-gray-800 font-semibold mb-1">Activa la cámara para comenzar</p>
                    <p className="text-gray-600 text-sm">Presiona el botón para iniciar</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReconocerGenerico;


// Suavizado exponencial de landmarks (EMA)
function smoothLandmarks(current, prevRef, alpha = 0.8) {
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
