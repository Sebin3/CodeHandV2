import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CardNav from '../componentes/Nadvar.jsx';
import Logo from '../assets/Logo.png';
import apiService from '../services/api.js';

const Entrenar = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Función para cargar los modelos desde el backend
  const loadModels = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Cargando modelos desde backend...');

      const data = await apiService.getModels();
      console.log('✅ Modelos cargados:', data);

      // Ordenar los modelos por prioridad y nombre
      const sortedModels = data.sort((a, b) => {
        // Orden de prioridad: Vocales -> Palabras -> Álgebra -> Otros
        const priorityOrder = {
          'Vocales': 1,
          'Palabras': 2,
          'Álgebra': 3
        };
        
        const aPriority = priorityOrder[a.name] || 999;
        const bPriority = priorityOrder[b.name] || 999;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // Si tienen la misma prioridad, ordenar alfabéticamente
        return a.name.localeCompare(b.name);
      });

      setModels(sortedModels);
    } catch (error) {
      console.error('❌ Error al cargar modelos:', error);
      setError('Error al conectar con el backend. Verifica tu conexión.');
      setModels([]);
    } finally {
      setLoading(false);
    }
  };


  // Función para seleccionar un modelo y navegar a entrenamiento
  const selectModelForTraining = (modelId) => {
    console.log('🚀 Navegando a entrenamiento del modelo:', modelId);
    navigate(`/entrenar/${modelId}`);
  };

  // Función para obtener el estado del modelo en español
  const getModelStatus = (status) => {
    switch (status) {
      case 'created': return { text: 'Creado', color: 'text-gray-600' };
      case 'training': return { text: 'Entrenando', color: 'bg-yellow-100 text-yellow-800' };
      case 'trained': return { text: 'Entrenado', color: 'bg-green-100 text-green-800' };
      case 'error': return { text: 'Error', color: 'bg-red-100 text-red-800' };
      default: return { text: 'Desconocido', color: 'bg-gray-100 text-gray-800' };
    }
  };

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

  useEffect(() => {
    loadModels();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <CardNav
        logo={navbarData.logo}
        logoAlt={navbarData.logoAlt}
        items={navbarData.items}
        baseColor={navbarData.baseColor}
        menuColor={navbarData.menuColor}
      />
      
      <div className="px-6">
        <div className="max-w-6xl mx-auto">
          {/* Título al principio */}
          <div className="text-center mb-12 pt-35">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Entrenar Modelos Existentes
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Selecciona un modelo creado previamente para entrenarlo con tus datos
            </p>
            {error && (
              <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg max-w-2xl mx-auto">
                {error}
              </div>
            )}
          </div>

          {/* Contenido principal */}
          <div className="pb-16">

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Cargando modelos...</span>
            </div>
          ) : models.length === 0 ? (
            <div className="text-center py-20">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                No hay modelos disponibles
              </h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Primero crea un modelo desde la sección "Modelos Personalizados"
              </p>
              <button
                onClick={() => navigate('/modelos-personalizados')}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
              >
                Crear Nuevo Modelo
              </button>
            </div>
          ) : (
            <>
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
              {models.map((model) => {
                const statusInfo = getModelStatus(model.status);
                return (
                  <div
                    key={model.id}
                    className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden cursor-pointer hover:shadow-xl transition-shadow duration-200"
                    onClick={() => selectModelForTraining(model.id)}
                  >
                    {/* Header blanco */}
                    <div className="bg-white px-6 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-black">
                            {model.name}
                          </h3>
                          <p className="text-gray-600 text-xs">
                            {model.categories.length} elementos
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}>
                          {statusInfo.text}
                        </span>
                      </div>
                    </div>

                    {/* Contenido del card */}
                    <div className="px-6 py-5">
                      <p className="text-black mb-5 text-sm leading-relaxed">
                      </p>

                      {/* Barra de progreso */}
                      <div className="mb-5">
                        <div className="flex justify-between text-sm text-black mb-3">
                          <span className="font-medium">Progreso de entrenamiento</span>
                          <span className="font-bold">{model.total_samples || 0} muestras</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-black h-3 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min((model.total_samples || 0) / 10 * 100, 100)}%`
                            }}
                          />
                        </div>
                      </div>

                      {/* Elementos a entrenar */}
                      <div className="mb-5">
                        <p className="text-sm font-semibold text-black mb-3">Elementos a entrenar:</p>
                        <div className="flex flex-wrap gap-2">
                          {model.categories.slice(0, 4).map((category, index) => (
                            <span
                              key={index}
                              className="px-3 py-2 rounded-lg text-xs font-bold bg-gray-100 text-black border border-gray-300"
                            >
                              {category}
                            </span>
                          ))}
                          {model.categories.length > 4 && (
                            <span className="px-3 py-2 rounded-lg text-xs font-bold bg-gray-100 text-black border border-gray-300">
                              +{model.categories.length - 4}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Precisión si está entrenado */}
                      {model.accuracy && (
                        <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="flex items-center space-x-3">
                            <span className="text-black text-xl font-bold">✓</span>
                            <span className="text-black font-bold">
                              Precisión: {(model.accuracy * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Botón de acción */}
                      <button
                        className="w-full px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors duration-200 font-medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectModelForTraining(model.id);
                        }}
                      >
                        {model.status === 'trained' ? 'Re-entrenar' : 'Entrenar'} {model.name}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Entrenar;