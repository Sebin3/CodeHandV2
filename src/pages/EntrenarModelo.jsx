import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CardNav from '../componentes/Nadvar.jsx';
import Logo from '../assets/Logo.png';
import apiService from '../services/api.js';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import CSVImporter from '../componentes/CSVImporter';

const EntrenarModelo = () => {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const [modelData, setModelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [currentElement, setCurrentElement] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedSamples, setCapturedSamples] = useState({});
  const [isTraining, setIsTraining] = useState(false);
  const [isCapturingMultiple, setIsCapturingMultiple] = useState(false);
  const [captureProgress, setCaptureProgress] = useState({ current: 0, total: 0 });
  const [samplesToCapture, setSamplesToCapture] = useState(20);
  const [batchCapture, setBatchCapture] = useState(false);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);

  const navbarData = {
    logo: Logo,
    logoAlt: 'Logo',
    baseColor: '#ffffff',
    menuColor: '#000000',
    items: [
      {
        label: 'Desarrollo',
        bgColor: '#f8f9fa',
        textColor: '#000000',
        links: [
          { label: 'Frontend', href: '#', ariaLabel: 'Ver desarrollo Frontend' },
          { label: 'Backend', href: '#', ariaLabel: 'Ver desarrollo Backend' },
          { label: 'Full Stack', href: '#', ariaLabel: 'Ver desarrollo Full Stack' }
        ]
      },
      {
        label: 'Servicios',
        bgColor: '#e3f2fd',
        textColor: '#000000',
        links: [
          { label: 'Consultoría', href: '#', ariaLabel: 'Ver servicios de consultoría' },
          { label: 'Mantenimiento', href: '#', ariaLabel: 'Ver servicios de mantenimiento' }
        ]
      },
      {
        label: 'Recursos',
        bgColor: '#f3e5f5',
        textColor: '#000000',
        links: [
          { label: 'Documentación', href: '#', ariaLabel: 'Ver documentación' },
          { label: 'Tutoriales', href: '#', ariaLabel: 'Ver tutoriales' },
          { label: 'Blog', href: '#', ariaLabel: 'Ver blog' }
        ]
      }
    ]
  };

  // Cargar datos del modelo
  const loadModelData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Cargando datos del modelo:', modelId);
      
      const models = await apiService.getModels();
      const model = models.find(m => m.id === modelId);
      
      if (!model) {
        throw new Error('Modelo no encontrado');
      }
      
      console.log('✅ Modelo encontrado:', model);
      setModelData(model);
      
      // Obtener muestras reales de cada categoría usando el nuevo endpoint
      const samples = {};
      console.log('🔍 Categorías del modelo:', model.categories);
      
      for (const category of model.categories) {
        try {
          console.log(`🔍 Obteniendo muestras para categoría: ${category}`);
          const categoryData = await apiService.getCategorySamples(modelId, category);
          console.log(`📊 Datos para ${category}:`, categoryData);
          samples[category] = categoryData.count || 0;
        } catch (error) {
          console.error(`❌ Error obteniendo muestras para ${category}:`, error);
          samples[category] = 0;
        }
      }
      
      setCapturedSamples(samples);
      console.log('📊 Contadores finales:', samples);
      console.log('📊 Total de muestras del modelo:', model.total_samples);
      
    } catch (error) {
      console.error('❌ Error cargando modelo:', error);
      setError('Error al cargar los datos del modelo');
    } finally {
      setLoading(false);
    }
  };

  // Inicializar MediaPipe Hands
  const initializeMediaPipe = async () => {
    try {
      const hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.65,
        minTrackingConfidence: 0.8,
        selfieMode: true
      });

      hands.onResults(onResults);
      
      handsRef.current = hands;
      
      console.log('✅ MediaPipe Hands inicializado');
    } catch (error) {
      console.error('❌ Error inicializando MediaPipe:', error);
      setError('Error al inicializar MediaPipe Hands');
    }
  };

  // Estado para almacenar landmarks actuales
  const [currentLandmarks, setCurrentLandmarks] = useState(null);

  // Función para procesar resultados de MediaPipe
  const prevLmRef = useRef(null);
  const onResults = (results) => {
    if (canvasRef.current && videoRef.current) {
      const canvasCtx = canvasRef.current.getContext('2d');
      
      // Limpiar canvas
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Dibujar video
      canvasCtx.drawImage(
        results.image, 0, 0, canvasRef.current.width, canvasRef.current.height
      );

      // Dibujar landmarks de las manos
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Suavizado EMA y almacenar landmarks para captura
        const raw = results.multiHandLandmarks[0];
        const smooth = smoothLandmarks(raw, prevLmRef, 0.65);
        setCurrentLandmarks(smooth);
        
        results.multiHandLandmarks.forEach((landmarks, index) => {
          // Dibujar conexiones de la mano manualmente
          const HAND_CONNECTIONS = [
            [0, 1], [1, 2], [2, 3], [3, 4], // Pulgar
            [0, 5], [5, 6], [6, 7], [7, 8], // Índice
            [0, 9], [9, 10], [10, 11], [11, 12], // Medio
            [0, 13], [13, 14], [14, 15], [15, 16], // Anular
            [0, 17], [17, 18], [18, 19], [19, 20], // Meñique
            [5, 9], [9, 13], [13, 17] // Conexiones entre dedos
          ];

          HAND_CONNECTIONS.forEach(([start, end]) => {
            const startPoint = landmarks[start];
            const endPoint = landmarks[end];
            
            if (startPoint && endPoint) {
              const startX = startPoint.x * canvasRef.current.width;
              const startY = startPoint.y * canvasRef.current.height;
              const endX = endPoint.x * canvasRef.current.width;
              const endY = endPoint.y * canvasRef.current.height;
              
              canvasCtx.beginPath();
              canvasCtx.moveTo(startX, startY);
              canvasCtx.lineTo(endX, endY);
              canvasCtx.strokeStyle = '#00BFFF';
              canvasCtx.lineWidth = 4;
              canvasCtx.stroke();
            }
          });
          
          // Dibujar círculos alrededor de cada landmark
          landmarks.forEach((landmark, index) => {
            const x = landmark.x * canvasRef.current.width;
            const y = landmark.y * canvasRef.current.height;
            
            // Círculo exterior (más grande)
            canvasCtx.beginPath();
            canvasCtx.arc(x, y, 10, 0, 2 * Math.PI);
            canvasCtx.strokeStyle = '#00BFFF';
            canvasCtx.lineWidth = 3;
            canvasCtx.stroke();
            
            // Círculo interior (punto central)
            canvasCtx.beginPath();
            canvasCtx.arc(x, y, 5, 0, 2 * Math.PI);
            canvasCtx.fillStyle = '#87CEEB';
            canvasCtx.fill();
          });
        });
      } else {
        setCurrentLandmarks(null);
      }
      
      canvasCtx.restore();
    }
  };

  // Función para obtener landmarks actuales
  const getCurrentLandmarks = () => {
    if (currentLandmarks) {
      // Convertir landmarks a formato plano [x1,y1,z1,x2,y2,z2,...]
      const flatLandmarks = [];
      currentLandmarks.forEach(landmark => {
        // En entrenamiento usaremos 2D por estabilidad
        flatLandmarks.push(landmark.x, landmark.y);
      });
      return flatLandmarks;
    }
    return null;
  };

  // Iniciar cámara
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        
        // Configurar canvas
        if (canvasRef.current) {
          canvasRef.current.width = 640;
          canvasRef.current.height = 480;
        }
        
        // Inicializar MediaPipe si no está inicializado
        if (!handsRef.current) {
          await initializeMediaPipe();
        }
        
        // Configurar cámara de MediaPipe
        if (handsRef.current && videoRef.current) {
          const camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (handsRef.current && videoRef.current) {
                await handsRef.current.send({ image: videoRef.current });
              }
            },
            width: 640,
            height: 480
          });
          
          cameraRef.current = camera;
          camera.start();
        }
        
        console.log('📹 Cámara y MediaPipe iniciados');
      }
    } catch (error) {
      console.error('❌ Error iniciando cámara:', error);
      setError('Error al acceder a la cámara. Verifica los permisos.');
    }
  };

  // Detener cámara
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    // Detener cámara de MediaPipe
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    
    // Limpiar canvas
    if (canvasRef.current) {
      const canvasCtx = canvasRef.current.getContext('2d');
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    
    setCameraActive(false);
    console.log('📹 Cámara y MediaPipe detenidos');
  };

  // Capturar múltiples muestras automáticamente
  const captureMultipleSamples = async () => {
    if (!handsRef.current || !cameraActive) {
      setError('MediaPipe o cámara no están disponibles');
      return;
    }

    const currentCategory = modelData?.categories?.[currentElement];
    if (!currentCategory) return;

    const samplesToCaptureValue = Math.max(1, Math.min(1000, samplesToCapture)); // Entre 1 y 1000 muestras
    
    try {
      setIsCapturingMultiple(true);
      setCaptureProgress({ current: 0, total: samplesToCaptureValue });
      
      console.log(`📸 Capturando ${samplesToCaptureValue} muestras para: ${currentCategory}`);
      
      if (batchCapture) {
        // Captura rápida y confiable - envía en grupos de 5 muy rápido
        const groupSize = 5;
        let totalSent = 0;
        
        for (let i = 0; i < samplesToCaptureValue; i += groupSize) {
          const promises = [];
          const currentGroupSize = Math.min(groupSize, samplesToCaptureValue - i);
          
          // Capturar grupo de muestras
          for (let j = 0; j < currentGroupSize; j++) {
            const sampleIndex = i + j + 1;
            setCaptureProgress({ current: sampleIndex, total: samplesToCaptureValue });
            
            const landmarks = getCurrentLandmarks();
            if (landmarks) {
              promises.push(
                apiService.captureSample(modelId, currentCategory, landmarks)
                  .then(() => {
                    totalSent++;
                    console.log(`✅ Muestra ${sampleIndex}/${samplesToCaptureValue} guardada`);
                  })
                  .catch((error) => console.warn(`⚠️ Error en muestra ${sampleIndex}:`, error))
              );
            }
          }
          
          // Enviar grupo y esperar confirmación rápida
          await Promise.allSettled(promises);
          
          // Pausa mínima entre grupos (10ms)
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        console.log(`🚀 Captura rápida completada: ${totalSent}/${samplesToCaptureValue} muestras guardadas`);
      } else {
        // Captura individual con confirmación
        let successfulCaptures = 0;
        let failedCaptures = 0;
        
        for (let i = 0; i < samplesToCaptureValue; i++) {
          // Actualizar progreso
          setCaptureProgress({ current: i + 1, total: samplesToCaptureValue });
          
          // Obtener landmarks actuales
          const landmarks = getCurrentLandmarks();
          
          if (landmarks) {
            // Enviar al backend SIN esperar (máxima velocidad)
            apiService.captureSample(modelId, currentCategory, landmarks)
              .then((response) => {
                successfulCaptures++;
                console.log(`✅ Muestra ${i + 1}/${samplesToCaptureValue} enviada`);
              })
              .catch((error) => {
                failedCaptures++;
                console.warn(`⚠️ Error en muestra ${i + 1}:`, error);
              });
          } else {
            failedCaptures++;
            console.warn(`⚠️ No se detectaron landmarks para muestra ${i + 1}/${samplesToCaptureValue}`);
          }
          
          // Sin pausas - velocidad máxima
        }
        
        // Mostrar resumen
        console.log(`📊 Resumen de captura: ${successfulCaptures} exitosas, ${failedCaptures} fallidas`);
        if (failedCaptures > 0) {
          setError(`Se capturaron ${successfulCaptures} de ${samplesToCaptureValue} muestras. ${failedCaptures} fallaron.`);
        }
      }
      
      // Actualizar contador local
      setCapturedSamples(prev => ({
        ...prev,
        [currentCategory]: (prev[currentCategory] || 0) + samplesToCaptureValue
      }));
      
      console.log(`🎉 Captura completa: ${samplesToCaptureValue} muestras para ${currentCategory}`);
      
    } catch (error) {
      console.error('❌ Error capturando muestras:', error);
      setError('Error al capturar las muestras');
    } finally {
      setIsCapturingMultiple(false);
      setCaptureProgress({ current: 0, total: 0 });
    }
  };

  // Entrenar modelo
  const trainModel = async () => {
    try {
      setIsTraining(true);
      console.log('🤖 Iniciando entrenamiento del modelo...');
      
      const result = await apiService.trainModel(modelId);
      
      console.log('✅ Modelo entrenado:', result);
      
      // Recargar datos del modelo
      await loadModelData();
      
      alert(`¡Modelo entrenado exitosamente! Precisión: ${(result.accuracy * 100).toFixed(1)}%`);
      
    } catch (error) {
      console.error('❌ Error entrenando modelo:', error);
      setError('Error al entrenar el modelo');
    } finally {
      setIsTraining(false);
    }
  };

  // Navegar entre elementos
  const nextElement = () => {
    if (currentElement < modelData.categories.length - 1) {
      setCurrentElement(currentElement + 1);
    }
  };

  const prevElement = () => {
    if (currentElement > 0) {
      setCurrentElement(currentElement - 1);
    }
  };

  useEffect(() => {
    console.log('🎯 EntrenarModelo montado con modelId:', modelId);
    loadModelData();
    initializeMediaPipe();
    
    return () => {
      stopCamera();
    };
  }, [modelId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CardNav
          logo={navbarData.logo}
          logoAlt={navbarData.logoAlt}
          items={navbarData.items}
          baseColor={navbarData.baseColor}
          menuColor={navbarData.menuColor}
        />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Cargando modelo...</span>
        </div>
      </div>
    );
  }

  if (!modelData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CardNav
          logo={navbarData.logo}
          logoAlt={navbarData.logoAlt}
          items={navbarData.items}
          baseColor={navbarData.baseColor}
          menuColor={navbarData.menuColor}
        />
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Modelo no encontrado</h2>
            <button
              onClick={() => navigate('/entrenar')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Volver a modelos
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCategory = modelData?.categories?.[currentElement] || 'Cargando...';
  const samplesForCurrentCategory = capturedSamples[currentCategory] || 0;

  return (
    <div className="min-h-screen bg-gray-100">
      <CardNav
        logo={navbarData.logo}
        logoAlt={navbarData.logoAlt}
        items={navbarData.items}
        baseColor={navbarData.baseColor}
        menuColor={navbarData.menuColor}
      />
      
      <div className="px-6 pt-40">
        <div className="max-w-7xl mx-auto">
          {/* Título del modelo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Entrenar {modelData?.name || 'Modelo'}
            </h1>
            <p className="text-lg text-gray-600">
              Elemento {currentElement + 1} de {modelData?.categories?.length || 0}: {currentCategory}
            </p>
            {error && (
              <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg max-w-2xl mx-auto">
                {error}
              </div>
            )}
          </div>

          {/* Contenido principal - Dos paneles */}
          <div className="grid lg:grid-cols-2 gap-4 max-w-4xl mx-auto">
            
            {/* Panel izquierdo - Vista de la Cámara */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-fit">
              {/* Header del panel */}
              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gray-600 rounded flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Vista de la Cámara</h2>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${cameraActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="text-sm text-gray-600">{cameraActive ? 'Activa' : 'Inactiva'}</span>
                </div>
              </div>

              {/* Área de cámara */}
              <div className="p-3">
                <div className="relative bg-gray-800 rounded-xl overflow-hidden mb-3" style={{ aspectRatio: '4/3' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full"
                    style={{ pointerEvents: 'none' }}
                  />
                  
                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800">
                      <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-gray-400 font-medium mb-1 text-sm">Cámara Inactiva</p>
                      <p className="text-gray-500 text-xs text-center">Haz clic en 'Activar Cámara' para comenzar</p>
                    </div>
                  )}
                </div>

                {/* Botones de control */}
                <div className="flex gap-3">
                  {!cameraActive ? (
                    <button
                      onClick={startCamera}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
                      </svg>
                      Activar Cámara
                    </button>
                  ) : (
                    <button
                      onClick={stopCamera}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                      </svg>
                      Detener Cámara
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Panel derecho - Reconocimiento de señas */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-fit">
              {/* Header del panel */}
              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Entrenamiento</h2>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-sm text-gray-600">Analizando</span>
                </div>
              </div>

              {/* Contenido del panel */}
              <div className="p-3">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  
                  <h3 className="text-base font-medium text-gray-900 mb-1">
                    Activa la cámara para comenzar
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Presiona el botón para iniciar
                  </p>

                  {/* Elemento actual */}
                  <div className="bg-gray-50 rounded-lg p-2 mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-gray-700">
                        Elemento {currentElement + 1} de {modelData.categories.length}
                      </span>
                      <span className="text-xs text-gray-500">
                        {samplesForCurrentCategory} muestras
                      </span>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900 mb-1">{currentCategory}</div>
                      <p className="text-xs text-gray-600">Haz la seña correspondiente</p>
                    </div>
                  </div>

                  {/* Navegación entre elementos */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={prevElement}
                      disabled={currentElement === 0}
                      className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg disabled:bg-gray-100 disabled:text-gray-400 hover:bg-gray-300 transition-colors text-sm"
                    >
                      ← Anterior
                    </button>
                    <button
                      onClick={nextElement}
                      disabled={currentElement === (modelData?.categories?.length || 0) - 1}
                      className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg disabled:bg-gray-100 disabled:text-gray-400 hover:bg-gray-300 transition-colors text-sm"
                    >
                      Siguiente →
                    </button>
                  </div>

                  {/* Input para cantidad de muestras */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Cantidad de muestras:
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="1000"
              value={samplesToCapture}
              onChange={(e) => setSamplesToCapture(parseInt(e.target.value) || 1)}
              disabled={isCapturingMultiple}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              placeholder="20"
            />
            <span className="text-xs text-gray-500 self-center">muestras</span>
          </div>
        </div>
        
        <div className="mb-3">
          <div className="flex items-center gap-2 text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded">
            <span>🚀</span>
            <span>VELOCIDAD MÁXIMA - Sin pausas ni esperas</span>
          </div>
        </div>
        
        <div className="mb-3">
          <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
            <input
              type="checkbox"
              checked={batchCapture}
              onChange={(e) => setBatchCapture(e.target.checked)}
              disabled={isCapturingMultiple}
              className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
            />
            <span>🚀 MODO RÁPIDO (grupos de 5 muestras)</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            {batchCapture ? "⚡ Envía 5 muestras, espera confirmación, siguiente grupo - Rápido y confiable" : "🛡️ Individual con confirmación"}
          </p>
        </div>

                  {/* Progreso de captura */}
                  {isCapturingMultiple && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Capturando muestras...</span>
                        <span>{captureProgress.current}/{captureProgress.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(captureProgress.current / captureProgress.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Botones de acción */}
                  <div className="space-y-2 mb-3">
                    {cameraActive && (
                      <button
                        onClick={captureMultipleSamples}
                        disabled={isCapturingMultiple}
                        className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                      >
                        {isCapturingMultiple ? 'Capturando...' : `Capturar Muestras (${samplesToCapture})`}
                      </button>
                    )}
                    
                    <button
                      onClick={trainModel}
                      disabled={isTraining || Object.values(capturedSamples).every(count => count === 0)}
                      className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                    >
                      {isTraining ? 'Entrenando...' : `Entrenar Modelo (${Object.values(capturedSamples).reduce((sum, count) => sum + count, 0)} muestras)`}
                    </button>
                    
                    <button
                      onClick={loadModelData}
                      disabled={loading}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                    >
                      {loading ? 'Recargando...' : '🔄 Recargar Contadores'}
                    </button>
                    
                    <button
                      onClick={() => navigate('/entrenar')}
                      className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                    >
                      Volver a Modelos
                    </button>
                  </div>

                  {/* Lista de elementos */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-700 mb-2 text-left">Elementos del modelo:</h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(modelData?.categories || []).map((category, index) => (
                        <div
                          key={index}
                          className={`p-2 rounded-lg border text-left ${
                            index === currentElement
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-xs">{category}</span>
                            <span className="text-xs text-gray-500">
                              {capturedSamples[category] || 0}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {modelData?.accuracy && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg">
                      <p className="text-green-800 font-medium text-sm">
                        Modelo entrenado - Precisión: {(modelData.accuracy * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Importador CSV */}
        <div className="mt-8">
          <CSVImporter 
            modelId={modelId} 
            onSuccess={async (importedCount) => {
              console.log(`✅ CSV importado: ${importedCount} muestras`);
              // Recargar datos del modelo para actualizar contadores
              await loadModelData();
              // Mostrar mensaje de éxito
              alert(`¡Dataset importado exitosamente! ${importedCount} muestras agregadas.\n\n¡Ya puedes entrenar el modelo! Los contadores se han actualizado.`);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default EntrenarModelo;

function smoothLandmarks(current, prevRef, alpha = 0.65) {
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
