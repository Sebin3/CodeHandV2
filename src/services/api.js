// Servicio de API para comunicación con el backend
const API_BASE_URL = 'https://backendcodehand.onrender.com';

class ApiService {
  // Obtener todos los modelos
  async getModels() {
    try {
      const response = await fetch(`${API_BASE_URL}/models`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching models:', error);
      throw error;
    }
  }

  // Crear nuevo modelo
  async createModel(name, categories) {
    try {
      const response = await fetch(`${API_BASE_URL}/models/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          categories
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating model:', error);
      throw error;
    }
  }

  // Capturar datos de entrenamiento
  async captureSample(modelId, category, landmarks) {
    try {
      const response = await fetch(`${API_BASE_URL}/models/${modelId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          landmarks
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error capturing sample:', error);
      throw error;
    }
  }

  // Entrenar modelo
  async trainModel(modelId) {
    try {
      const response = await fetch(`${API_BASE_URL}/models/${modelId}/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error training model:', error);
      throw error;
    }
  }

  // Predecir con modelo entrenado
  async predict(modelId, landmarks) {
    try {
      const response = await fetch(`${API_BASE_URL}/models/${modelId}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          landmarks
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error predicting:', error);
      throw error;
    }
  }

  // Eliminar modelo
  async deleteModel(modelId) {
    try {
      const response = await fetch(`${API_BASE_URL}/models/${modelId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting model:', error);
      throw error;
    }
  }

  // Importar dataset CSV directamente al backend
  async importCSVDataset(modelId, file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/models/${modelId}/import-csv`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error importing CSV dataset:', error);
      throw error;
    }
  }

  // Obtener muestras de una categoría específica
  async getCategorySamples(modelId, category) {
    try {
      const response = await fetch(`${API_BASE_URL}/models/${modelId}/samples/${category}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching category samples:', error);
      throw error;
    }
  }
}

export default new ApiService();
