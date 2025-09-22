import React, { useState, useRef, useEffect } from 'react';
import apiService from '../services/api.js';
import LogoManos from '../assets/manos.png';


const CreateModelModal = ({ isOpen, onClose, onSuccess }) => {
  const [newModel, setNewModel] = useState({
    name: '',
    categories: []
  });
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const inputRef = useRef(null);

  // Autocompletar categorías A-Z si el nombre del modelo es "Abecedario"
  useEffect(() => {
    const name = (newModel.name || '').trim().toLowerCase();
    if (name === 'abecedario') {
      const alphabet = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
      setNewModel(prev => {
        const isSame = prev.categories.length === 26 && prev.categories.every((c, i) => c === alphabet[i]);
        if (isSame) return prev;
        return {
          ...prev,
          categories: alphabet
        };
      });
    }
  }, [newModel.name]);

  // Crear nuevo modelo
  const createModel = async () => {
    if (!newModel.name.trim() || newModel.categories.length === 0) {
      setError('Por favor completa el nombre y al menos una categoría');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Creando nuevo modelo:', newModel);
      
      const result = await apiService.createModel(newModel.name, newModel.categories);
      console.log('✅ Modelo creado:', result);

      // Entrenar automáticamente el modelo recién creado para evitar errores al usarlo
      try {
        if (result?.id) {
          console.log('🚀 Iniciando entrenamiento automático del modelo:', result.id);
          await apiService.trainModel(result.id);
          console.log('✅ Entrenamiento automático iniciado');
        }
      } catch (trainErr) {
        console.warn('⚠️ No se pudo iniciar el entrenamiento automático:', trainErr);
      }
      
      // Limpiar formulario
      setNewModel({ name: '', categories: [] });
      setNewCategory('');
      
      // Cerrar modal y notificar éxito
      onSuccess();
      onClose();
      
    } catch (error) {
      console.error('❌ Error creando modelo:', error);
      setError('Error al crear el modelo. Verifica los datos.');
    } finally {
      setLoading(false);
    }
  };

  // Agregar categoría (con soporte especial para "Abecedario")
  const addCategory = (category = null) => {
    const categoryToAdd = (category || newCategory).trim();
    if (!categoryToAdd) return;

    // Si el usuario escribe "Abecedario", autogenerar A-Z
    if (categoryToAdd.toLowerCase() === 'abecedario') {
      const alphabet = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
      setNewModel(prev => ({
        ...prev,
        categories: alphabet
      }));
      setNewCategory('');
      if (inputRef.current) inputRef.current.focus();
      return;
    }

    // Caso normal: agregar elemento individual evitando duplicados
    const normalized = categoryToAdd;
    if (!newModel.categories.includes(normalized)) {
      setNewModel(prev => ({
        ...prev,
        categories: [...prev.categories, normalized]
      }));
    }
    setNewCategory('');
    if (inputRef.current) inputRef.current.focus();
  };

  // Eliminar categoría
  const removeCategory = (category) => {
    setNewModel(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c !== category)
    }));
  };


  // Limpiar todas las categorías
  const clearAllCategories = () => {
    setNewModel(prev => ({
      ...prev,
      categories: []
    }));
  };

  // Limpiar formulario al cerrar
  const handleClose = () => {
    setNewModel({ name: '', categories: [] });
    setNewCategory('');
    setError(null);
    onClose();
  };

  // Efecto para animaciones y focus cuando se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      if (inputRef.current) {
        setTimeout(() => {
          inputRef.current.focus();
        }, 300); // Esperar a que termine la animación de entrada
      }
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className={`relative rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden transition-all duration-300 transform bg-white ${
        isAnimating 
          ? 'opacity-100 scale-100 translate-y-0' 
          : 'opacity-0 scale-95 translate-y-4'
      }`}>
        {/* Header */}
        <div className={`px-6 py-6 border-b border-gray-200 transition-all duration-400 ${
          isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}>
          <div className="relative">
            {/* Botón de cerrar - posición absoluta */}
            <button
              onClick={handleClose}
              className="absolute top-0 right-0 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Contenido centrado */}
            <div className="flex flex-col items-center gap-4">
              {/* Imagen */}
              <div className="flex justify-center">
                <img 
                  src={LogoManos} 
                  alt="HandCode Logo" 
                  className="w-44 h-44 rounded-lg object-contain"
                />
              </div>
              
              {/* Título y descripción */}
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Crear Modelo Personalizado
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Define un nuevo modelo con elementos personalizables
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`px-6 py-4 max-h-[calc(90vh-140px)] overflow-y-auto transition-all duration-500 delay-100 ${
          isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Nombre del modelo */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Nombre del Modelo
              </label>
              <input
                ref={inputRef}
                type="text"
                value={newModel.name}
                onChange={(e) => setNewModel(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors placeholder-gray-400"
                placeholder="Ej: Vocales, Emociones, Colores, Números..."
              />
            </div>


            {/* Elementos personalizados */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Elementos Personalizados
              </label>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                    className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors placeholder-gray-400"
                    placeholder="Escribe un elemento (sugerencia: Abecedario) y presiona Enter..."
                  />
                  {newCategory.trim() && (
                    <button
                      onClick={() => addCategory()}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>

              
              
              {/* Lista de elementos agregados */}
              {newModel.categories.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Elementos agregados ({newModel.categories.length})
                    </span>
                    <button
                      onClick={clearAllCategories}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Limpiar todo
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {newModel.categories.map((category, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-sm bg-blue-600 text-white"
                      >
                        {category}
                        <button
                          onClick={() => removeCategory(category)}
                          className="ml-1.5 text-white hover:text-red-200 font-medium"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Ejemplo de uso */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-medium text-gray-800 mb-2">
                Ejemplo de uso
              </h4>
              <div className="space-y-1 text-xs text-gray-600">
                <p><strong className="text-gray-900">Vocales:</strong> A, E, I, O, U (o A mayúscula, a minúscula, etc.)</p>
                <p><strong className="text-gray-900">Emociones:</strong> Feliz, Triste, Enojado, Sorprendido</p>
                <p><strong className="text-gray-900">Números:</strong> 1, 2, 3, 4, 5 (o Uno, Dos, Tres, etc.)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t border-gray-200 bg-gray-50 transition-all duration-500 delay-150 ${
          isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}>
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={createModel}
              disabled={!newModel.name.trim() || newModel.categories.length === 0 || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {loading ? 'Creando...' : 'Crear Modelo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateModelModal;
