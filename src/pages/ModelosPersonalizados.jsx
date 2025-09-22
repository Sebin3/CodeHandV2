import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CardNav from '../componentes/Nadvar.jsx';
import Logo from '../assets/Logo.png';
import apiService from '../services/api.js';

const ModelosPersonalizados = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newModel, setNewModel] = useState({
    name: '',
    categories: []
  });
  const [newCategory, setNewCategory] = useState('');
  const navigate = useNavigate();

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

  // Cargar modelos existentes
  const loadModels = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Cargando modelos desde backend...');
      
      const data = await apiService.getModels();
      console.log('✅ Modelos cargados:', data);
      setModels(data);
    } catch (error) {
      console.error('❌ Error al cargar modelos:', error);
      setError('Error al conectar con el backend. Verifica tu conexión.');
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  // Crear nuevo modelo
  const createModel = async () => {
    if (!newModel.name.trim() || newModel.categories.length === 0) {
      setError('Por favor completa el nombre y al menos una categoría');
      return;
    }

    try {
      setError(null);
      console.log('🔄 Creando nuevo modelo:', newModel);
      
      const result = await apiService.createModel(newModel.name, newModel.categories);
      console.log('✅ Modelo creado:', result);
      
      // Recargar modelos
      await loadModels();
      
      // Limpiar formulario
      setNewModel({ name: '', categories: [] });
      setShowCreateForm(false);
      
      alert(`¡Modelo "${newModel.name}" creado exitosamente!`);
      
    } catch (error) {
      console.error('❌ Error creando modelo:', error);
      setError('Error al crear el modelo. Verifica los datos.');
    }
  };

  // Agregar categoría
  const addCategory = () => {
    if (newCategory.trim() && !newModel.categories.includes(newCategory.trim())) {
      setNewModel(prev => ({
        ...prev,
        categories: [...prev.categories, newCategory.trim()]
      }));
      setNewCategory('');
    }
  };

  // Eliminar categoría
  const removeCategory = (category) => {
    setNewModel(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c !== category)
    }));
  };

  // Obtener estado del modelo en español
  const getModelStatus = (status) => {
    switch (status) {
      case 'created': return { text: 'Creado', color: 'bg-blue-100 text-blue-800' };
      case 'training': return { text: 'Entrenando', color: 'bg-yellow-100 text-yellow-800' };
      case 'trained': return { text: 'Entrenado', color: 'bg-green-100 text-green-800' };
      case 'error': return { text: 'Error', color: 'bg-red-100 text-red-800' };
      default: return { text: 'Desconocido', color: 'bg-gray-100 text-gray-800' };
    }
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
          {/* Título justo debajo del navbar */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Modelos Personalizados
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Crea y gestiona tus propios modelos de reconocimiento
            </p>
            {error && (
              <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg max-w-2xl mx-auto">
                {error}
              </div>
            )}
          </div>

          {/* Contenido principal */}
          <div className="pb-16">

          {/* Botón para crear nuevo modelo */}
          <div className="mb-8 text-center">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showCreateForm ? 'Cancelar' : '+ Crear Nuevo Modelo'}
            </button>
          </div>

          {/* Formulario para crear modelo */}
          {showCreateForm && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Crear Nuevo Modelo
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Modelo
                  </label>
                  <input
                    type="text"
                    value={newModel.name}
                    onChange={(e) => setNewModel(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Emociones, Colores, Números..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categorías (Elementos a reconocer)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: Feliz, Triste, Enojado..."
                    />
                    <button
                      onClick={addCategory}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Agregar
                    </button>
                  </div>
                  
                  {newModel.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newModel.categories.map((category, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {category}
                          <button
                            onClick={() => removeCategory(category)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={createModel}
                    disabled={!newModel.name.trim() || newModel.categories.length === 0}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Crear Modelo
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewModel({ name: '', categories: [] });
                      setNewCategory('');
                    }}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lista de modelos existentes */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Cargando modelos...</span>
            </div>
          ) : models.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🤖</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                No hay modelos creados
              </h2>
              <p className="text-gray-600">
                Crea tu primer modelo personalizado usando el formulario de arriba
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {models.map((model) => {
                const statusInfo = getModelStatus(model.status);
                return (
                  <div
                    key={model.id}
                    className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {model.name}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.text}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4">
                      Modelo personalizado con {model.categories.length} categorías
                    </p>
                    
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Muestras capturadas</span>
                        <span>{model.total_samples || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min((model.total_samples || 0) / 10 * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">Categorías:</p>
                      <div className="flex flex-wrap gap-1">
                        {model.categories.slice(0, 3).map((category, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600"
                          >
                            {category}
                          </span>
                        ))}
                        {model.categories.length > 3 && (
                          <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                            +{model.categories.length - 3} más
                          </span>
                        )}
                      </div>
                    </div>

                    {model.accuracy && (
                      <div className="mb-4 p-2 bg-green-50 rounded text-sm">
                        <span className="text-green-800 font-medium">
                          Precisión: {(model.accuracy * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/entrenar/${model.id}`)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Entrenar
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Estás seguro de eliminar el modelo "${model.name}"?`)) {
                            // TODO: Implementar eliminación
                            alert('Funcionalidad de eliminación próximamente');
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelosPersonalizados;