import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../componentes/Nadvar.jsx';
import Logo from '../assets/Logo.png';
import api from '../services/api.js';

const Modelos = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const navbarData = {
    logo: Logo,
    logoAlt: 'Logo',
    baseColor: '#ffffff',
    menuColor: '#000000',
    items: []
  };

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.getModels();
      setModels(data);
      setError('');
    } catch (e) {
      setError('No se pudieron cargar los modelos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const deleteModel = async (id) => {
    if (!confirm('¿Eliminar este modelo? Esta acción no se puede deshacer.')) return;
    try {
      setDeletingId(id);
      await api.deleteModel(id);
      await load();
    } catch (e) {
      alert('No se pudo eliminar el modelo');
    } finally {
      setDeletingId(null);
    }
  };

  const goRecognize = (m) => {
    const name = (m?.name || '').toLowerCase();
    const cats = Array.isArray(m.categories) ? m.categories : [];
    const isVocales = cats.length === 5 && ['A','E','I','O','U'].every(c => cats.includes(c));
    // Considerar Álgebra si el nombre contiene 'algebra/álgebra' o 'numeros/números'
    const isAlgebra =
      name.includes('algebra') ||
      name.includes('álgebra') ||
      name.includes('numeros') ||
      name.includes('números');
    if (isAlgebra) return navigate(`/algebra/${m.id}`);
    if (isVocales) return navigate(`/reconocer/${m.id}`);
    return navigate(`/reconocer-generico/${m.id}`);
  };

  const train = async (id) => {
    try {
      await api.trainModel(id);
      setTimeout(load, 1500);
    } catch (e) {
      alert('No se pudo iniciar el entrenamiento');
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar
        logo={navbarData.logo}
        logoAlt={navbarData.logoAlt}
        items={navbarData.items}
        baseColor={navbarData.baseColor}
        menuColor={navbarData.menuColor}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-10 mt-40">
          <h1 className="text-4xl font-bold tracking-tight">Tus Modelos</h1>
          <p className="text-sm text-neutral-600">Lista de modelos creados, su estado y acciones</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-black border-t-transparent"></div>
            <span className="ml-3 text-neutral-700">Cargando...</span>
          </div>
        ) : error ? (
          <div className="p-4 border border-black/10 text-black rounded-lg bg-neutral-50">{error}</div>
        ) : models.length === 0 ? (
          <div className="text-center py-20 text-neutral-600">No hay modelos. Crea uno desde la sección de Modelos Personalizados.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {models.map(m => (
              <div key={m.id} className="rounded-xl border border-black/10 shadow-[0_2px_0_#00000008] p-6 flex flex-col gap-4 hover:shadow-[0_6px_18px_#0000000d] transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{m.name}</h3>
                    <div className="text-xs text-neutral-500">ID: {m.id}</div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${m.status === 'trained' ? 'border-black/20 bg-white text-black' : m.status === 'training' ? 'border-black/20 bg-neutral-100 text-neutral-800' : m.status === 'error' ? 'border-black bg-black text-white' : 'border-black/20 bg-white text-neutral-700'}`}>{m.status}</span>
                </div>
                <div className="text-sm text-neutral-800 flex flex-wrap gap-6">
                  <span><span className="font-semibold">Clases:</span> {m.categories?.length || 0}</span>
                  <span><span className="font-semibold">Muestras:</span> {m.total_samples || 0}</span>
                  {typeof m.accuracy === 'number' && <span><span className="font-semibold">Accuracy:</span> {(m.accuracy * 100).toFixed(1)}%</span>}
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <button onClick={() => goRecognize(m)} className="px-4 py-2 rounded-lg text-sm border border-black bg-black text-white hover:bg-white hover:text-black transition-colors">
                    Reconocer
                  </button>
                  <button onClick={() => navigate(`/entrenar/${m.id}`)} className="px-4 py-2 rounded-lg text-sm border border-black bg-white text-black hover:bg-black hover:text-white transition-colors">
                    Entrenar
                  </button>
                  <button onClick={() => deleteModel(m.id)} disabled={deletingId === m.id} className="px-4 py-2 rounded-lg text-sm border border-black/60 bg-white text-black hover:bg-black hover:text-white transition-colors disabled:opacity-50">
                    {deletingId === m.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modelos;


