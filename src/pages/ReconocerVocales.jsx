import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import apiService from '../services/api';
import Navbar from '../componentes/Nadvar';
import Logo from '../assets/Logo.png';

const ReconocerVocales = () => {
  const { modelId } = useParams();
  
  // Estados básicos
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState(null);
  const [recognizedLetter, setRecognizedLetter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recognitionHistory, setRecognitionHistory] = useState([]);
  const [confidence, setConfidence] = useState(0);
  const [modelData, setModelData] = useState(null);
  const [isMediaPipeWorking, setIsMediaPipeWorking] = useState(false);
  const [isAutoTraining, setIsAutoTraining] = useState(false);
  
  // Referencias
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const lastSendRef = useRef(0);
  
  // Configuración del backend
  const SEND_INTERVAL = 500; // ms entre peticiones al backend

  
  // Definir conexiones de la mano manualmente
  const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Pulgar
    [0, 5], [5, 6], [6, 7], [7, 8], // Índice
    [0, 9], [9, 10], [10, 11], [11, 12], // Medio
    [0, 13], [13, 14], [14, 15], [15, 16], // Anular
    [0, 17], [17, 18], [18, 19], [19, 20], // Meñique
    [5, 9], [9, 13], [13, 17] // Conexiones entre dedos
  ];

  // Cargar datos del modelo
  const loadModelData = async () => {
    try {
      console.log('🔍 Buscando modelo con ID:', modelId);
      
      const models = await apiService.getModels();
      console.log('📋 Todos los modelos disponibles:', models);
      
      const model = models.find(m => m.id === modelId);
      
      if (!model) {
        console.error('❌ Modelo no encontrado con ID:', modelId);
        console.log('📋 IDs disponibles:', models.map(m => m.id));
        throw new Error(`Modelo con ID ${modelId} no encontrado`);
      } else {
        console.log('✅ Modelo encontrado:', model);
        setModelData(model);
      }
    } catch (error) {
      console.error('Error cargando modelo:', error);
      setError(`Error al cargar los datos del modelo: ${error.message}`);
    }
  };

  // Función para enviar landmarks al backend para predicción
  const sendToBackend = async (landmarks) => {
    try {
      if (!landmarks || landmarks.length === 0) {
        console.log('No hay landmarks para enviar');
        return;
      }

      console.log('Landmarks recibidos:', landmarks.length);
      console.log('Primeros 5 landmarks:', landmarks.slice(0, 5));

      // Convertir landmarks a array de floats [x,y, x,y, ...] - Solo x,y (2D)
      const arr = [];
      for (const p of landmarks) {
        arr.push(p.x, p.y);
      }

      console.log('Array enviado al backend:', arr.length, 'elementos');
      console.log('Primeros 10 valores:', arr.slice(0, 10));

      // Petición al backend con timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      console.log('🚀 Enviando petición al backend...');
      const response = await fetch(`https://backendcodehand.onrender.com/models/${modelId}/predict`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ landmarks: arr }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('✅ Respuesta recibida del backend:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [FRONTEND] Respuesta del backend:', data);
        
        if (data.prediction) {
          const prediction = data.prediction.toUpperCase();
          console.log('✅ [FRONTEND] Predicción recibida:', prediction);
          console.log('✅ [FRONTEND] Confianza recibida:', data.confidence);
          
          setRecognizedLetter(prediction);
          console.log('✅ [FRONTEND] Estado actualizado - recognizedLetter:', prediction);
          
          // Establecer confianza
          if (data.confidence) {
            const confidencePercent = Math.round(data.confidence * 100);
            setConfidence(confidencePercent);
            console.log('✅ [FRONTEND] Confianza actualizada:', confidencePercent + '%');
          } else {
            setConfidence(85);
            console.log('✅ [FRONTEND] Confianza por defecto: 85%');
          }
          
          // Agregar al historial solo si es diferente a la anterior
          setRecognitionHistory(prev => {
            if (prev.length === 0 || prev[0].letter !== prediction) {
              return [
                { letter: prediction, timestamp: new Date().toLocaleTimeString() },
                ...prev.slice(0, 4) // Mantener solo los últimos 5
              ];
            }
            return prev;
          });
        } else {
          console.log('No se recibió predicción del backend');
        }
      } else {
        console.error('Error del servidor:', response.status, response.statusText);
        
        // Si es error 500, intentar entrenar automáticamente
        if (response.status === 500) {
          console.log('🔄 Error 500 detectado, intentando entrenar modelo automáticamente...');
          setIsAutoTraining(true);
          try {
            const trainResponse = await fetch(`https://backendcodehand.onrender.com/models/${modelId}/train`, {
              method: 'POST'
            });
            
            if (trainResponse.ok) {
              console.log('✅ Modelo entrenado automáticamente');
              setError('Modelo entrenado automáticamente. Intenta de nuevo en unos segundos.');
              // Limpiar error después de 3 segundos
              setTimeout(() => {
                setError(null);
                setIsAutoTraining(false);
              }, 3000);
            } else {
              setError('Error del servidor: No se pudo entrenar el modelo automáticamente.');
              setIsAutoTraining(false);
            }
          } catch (trainError) {
            console.error('❌ Error entrenando modelo:', trainError);
            setError('Error del servidor: El modelo no está disponible.');
            setIsAutoTraining(false);
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.error("Timeout al predecir - servidor muy lento");
        setError('El servidor no responde. El modelo puede estar corrupto. Intenta reentrenar.');
      } else {
        console.error("Error al predecir:", err);
        setError('Error de conexión con el servidor.');
      }
    }
  };

  const startCamera = async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
        
        // Inicializar MediaPipe Hands
        initializeMediaPipe();
      }
      setIsLoading(false);
    } catch (err) {
      setError('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
      setIsLoading(false);
      console.error('Error accessing camera:', err);
    }
  };

  const initializeMediaPipe = () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Configurar MediaPipe Hands con mayor precisión
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      selfieMode: true
    });

    handsRef.current = hands;

    // Función para procesar resultados
    hands.onResults(onResults);

    // Configurar cámara
    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current && handsRef.current) {
          await handsRef.current.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480
    });

    cameraRef.current = camera;
    camera.start();
  };

  const onResults = (results) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar imagen del video
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    // Indicar que MediaPipe está funcionando
    setIsMediaPipeWorking(true);

    // Si se detectan manos, dibujar landmarks
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      console.log('Landmarks detectados:', landmarks.length);
      
      // Dibujar conexiones de la mano manualmente
      HAND_CONNECTIONS.forEach(([start, end]) => {
        const startPoint = landmarks[start];
        const endPoint = landmarks[end];
        
        if (startPoint && endPoint) {
          const startX = startPoint.x * canvas.width;
          const startY = startPoint.y * canvas.height;
          const endX = endPoint.x * canvas.width;
          const endY = endPoint.y * canvas.height;
          
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = '#00BFFF';
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      });
      
      // Dibujar círculos alrededor de cada landmark
      landmarks.forEach((landmark, index) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        
        // Círculo exterior (más grande)
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, 2 * Math.PI);
        ctx.strokeStyle = '#00BFFF';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Círculo interior (punto central)
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#87CEEB';
        ctx.fill();
      });

      // Enviar al backend cada SEND_INTERVAL ms
      const now = Date.now();
      if (now - lastSendRef.current > SEND_INTERVAL) {
        console.log('Enviando landmarks al backend...');
        lastSendRef.current = now;
        
        // Solo enviar si no hay error previo
        if (!error) {
          sendToBackend(landmarks);
        }
      }
    } else {
      // No se detecta mano, limpiar predicción
      setRecognizedLetter('');
      setConfidence(0);
    }
  };

  const stopCamera = () => {
    // Detener MediaPipe
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (handsRef.current) {
      handsRef.current.close();
      handsRef.current = null;
    }

    // Detener stream de cámara
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Limpiar canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    setIsCameraActive(false);
    setRecognizedLetter('');
    setConfidence(0);
  };


  useEffect(() => {
    loadModelData();
    
    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (handsRef.current) {
        handsRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [modelId]);

  if (!modelData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            {error ? (
              <div>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Modelo no encontrado
                </h3>
                <p className="text-gray-600 mb-4">
                  El modelo con ID "{modelId}" no existe
                </p>
                <button
                  onClick={() => navigate('/seleccionar-modelo')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Seleccionar Modelo
                </button>
              </div>
            ) : (
              <div>
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando modelo...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
        {/* Professional Header */}
        <div className="text-center mb-12 mt-26">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {modelData ? modelData.name : 'Reconocimiento de Señas'}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Reconocimiento inteligente del lenguaje de señas
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Error:</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}


        {/* Camera and Recognition Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Video Feed */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                Vista de la Cámara
              </h2>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${
                  isCameraActive 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  {isCameraActive ? 'Activa' : 'Inactiva'}
                </div>
                {isCameraActive && (
                  <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${
                    isAutoTraining
                      ? 'bg-orange-100 text-orange-700'
                      : isMediaPipeWorking 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      isAutoTraining 
                        ? 'bg-orange-500 animate-pulse' 
                        : isMediaPipeWorking 
                          ? 'bg-blue-500' 
                          : 'bg-yellow-500'
                    }`}></div>
                    {isAutoTraining 
                      ? 'Entrenando...' 
                      : isMediaPipeWorking 
                        ? 'MediaPipe OK' 
                        : 'Iniciando...'
                    }
                  </div>
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
            
            {/* Camera Control Button */}
            <div className="mt-4 flex justify-center gap-3">
              {!isCameraActive ? (
                <button
                  onClick={startCamera}
                  disabled={isLoading}
                  className="bg-[#A78D78] hover:brightness-95 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                  )}
                  {isLoading ? 'Iniciando...' : 'Activar Cámara'}
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 active:scale-95"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                  </svg>
                  Detener Cámara
                </button>
              )}
              
              {/* Botones para errores y prueba */}
              {error && (
                <div className="flex gap-2">
                  {error.includes('modelo no está disponible') && (
                    <button
                      onClick={() => window.open(`/entrenar-modelo/${modelId}`, '_blank')}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                      Reentrenar Modelo
                    </button>
                  )}
                  
                  <button
                    onClick={() => setError(null)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Limpiar Error
                  </button>
                </div>
              )}
              
            </div>
          </div>

          {/* Recognition Results */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Reconocimiento de señas
              </h2>
              <div className="flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Analizando</span>
              </div>
            </div>
            
            <div className="text-center">
              {recognizedLetter ? (
                <div className="bg-green-50 rounded-xl p-8 border-2 border-green-200">
                  <div className="text-8xl font-bold text-green-600 mb-4">
                    {recognizedLetter}
                  </div>
                  <div className="bg-green-100 rounded-lg p-3">
                    <p className="text-lg text-green-800 font-semibold mb-1">
                      ¡Seña Detectada!
                    </p>
                    <p className="text-green-700 text-sm mb-2">
                      Reconocimiento exitoso
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-green-600">Confianza:</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-2 bg-green-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 transition-all duration-300"
                            style={{ width: `${confidence}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-green-700">{confidence}%</span>
                      </div>
                    </div>
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
                    <p className="text-lg text-gray-800 font-semibold mb-1">
                      {isCameraActive ? 'Realiza una seña...' : 'Activa la cámara para comenzar'}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {isCameraActive ? 'El sistema está analizando tu mano' : 'Presiona el botón para iniciar'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Historial de reconocimiento */}
            {recognitionHistory.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    Historial Reciente
                  </span>
                  <button
                    onClick={() => setRecognitionHistory([])}
                    className="px-3 py-1 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 active:scale-95 transition"
                    aria-label="Limpiar historial"
                  >
                    Limpiar
                  </button>
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {recognitionHistory.map((item, index) => (
                    <div key={index} className="flex-shrink-0 bg-gray-100 rounded-lg p-2 min-w-[60px] text-center">
                      <div className="text-xl font-bold text-gray-800 mb-1">{item.letter}</div>
                      <div className="text-xs text-gray-500">{item.timestamp}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReconocerVocales;