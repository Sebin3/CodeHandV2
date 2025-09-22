import InfiniteScroll from './InfiniteScroll';

const Stats = () => {
  const items = [
    { content: "Reconocimiento de Lenguaje de Señas" },
    { content: "Entrenamiento de Vocales Personalizado" },
    { content: "Formación de Palabras Inteligente" },
    { content: "Interfaz Adaptativa con MediaPipe" },
    { content: "Seguimiento de Manos en Tiempo Real" },
    { content: "Análisis de Gestos y Movimientos" },
    { content: "Sistema de Aprendizaje Progresivo" },
    { content: "Personalización por Usuario" },
    { content: "Interfaz Táctil Intuitiva" },
    { content: "Guia de Audios en Vivo" },
    { content: "Reportes de Progreso Detallados" },
  ];

  return (
    <section className="relative py-20 px-5 bg-white h-[60vh] overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center h-full">
          {/* Contenido de texto a la izquierda */}
          <div className="text-center lg:text-left z-10 relative">
            <h2 className="text-4xl md:text-3xl font-bold text-gray-900 mb-4">
              Nuevas Funcionalidades
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Descubre todas las tecnologías y servicios que utilizamos para crear 
              soluciones digitales de vanguardia que impulsan tu negocio.
            </p>
          </div>

          {/* InfiniteScroll ocupando toda la sección a la derecha */}
          <div className="absolute top-0 right-0 w-1/2 h-full overflow-hidden">
            <InfiniteScroll
              items={items}
              isTilted={true}
              tiltDirection='left'
              autoplay={true}
              autoplaySpeed={2.4}
              autoplayDirection="down"
              pauseOnHover={true}
              maxHeight="100vh"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default Stats
