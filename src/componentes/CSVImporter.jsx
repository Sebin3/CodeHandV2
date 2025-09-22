import React, { useState } from 'react';
import apiService from '../services/api';

const CSVImporter = ({ modelId, onSuccess }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      setError('Por favor, selecciona un archivo CSV.');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Por favor, selecciona un archivo CSV válido.');
      return;
    }

    if (!modelId) {
      setError('ID del modelo no proporcionado.');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setError(null);
    setMessage(null);

    try {
      // Simular progreso
      setImportProgress(25);

      // Enviar archivo al backend usando API service
      console.log('📤 Enviando CSV al backend...');
      const result = await apiService.importCSVDataset(modelId, file);
      console.log('📥 Respuesta del backend:', result);

      setImportProgress(100);

      setMessage(`¡Dataset CSV importado exitosamente! ${result.imported_count} muestras agregadas.`);
      
      if (onSuccess) {
        onSuccess(result.imported_count);
      }

    } catch (importError) {
      setError(`Error al importar el CSV: ${importError.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        📊 Importar Dataset CSV (Backend)
      </h3>

      <div className="space-y-4">
        {/* Upload de archivo CSV */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar archivo CSV:
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={isImporting}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 disabled:opacity-50"
          />
        </div>

        {/* Formato esperado */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Formato esperado del CSV:
          </h4>
          <pre className="text-xs text-gray-600 overflow-x-auto">
{`A,x1,y1,z1,x2,y2,z2,x3,y3,z3,...
E,x1,y1,z1,x2,y2,z2,x3,y3,z3,...
I,x1,y1,z1,x2,y2,z2,x3,y3,z3,...

Ejemplo:
A,0.446,0.397,0.351,0.330,0.343,0.382,...
E,0.123,0.456,0.789,0.321,0.654,0.987,...
I,0.111,0.222,0.333,0.444,0.555,0.666,...`}
          </pre>
        </div>

        {/* Progreso de importación */}
        {isImporting && (
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Importando CSV...</span>
              <span>{importProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-green-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${importProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Mensajes */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <p className="text-sm">{message}</p>
          </div>
        )}

        {/* Información adicional */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>💡 Ventajas del import CSV:</strong><br/>
            • Procesamiento directo en el backend (más rápido)<br/>
            • Lotes de 100 muestras por vez<br/>
            • Formato simple: categoría + landmarks separados por comas<br/>
            • Validación automática de datos<br/>
            • Soporte para miles de muestras
          </p>
        </div>
      </div>
    </div>
  );
};

export default CSVImporter;
