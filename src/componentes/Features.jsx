const Features = () => {
  return (
    <section className="py-20 px-5 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="group bg-white p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Misión</h3>
            <p className="text-gray-600 leading-relaxed text-center">
              Transformar ideas innovadoras en soluciones tecnológicas que impulsen el crecimiento y la transformación digital de nuestros clientes.
            </p>
          </div>
          
          <div className="group bg-white p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Visión</h3>
            <p className="text-gray-600 leading-relaxed text-center">
              Ser reconocidos como líderes en desarrollo de software, creando experiencias digitales excepcionales que marquen la diferencia en el mercado.
            </p>
          </div>
          
          <div className="group bg-white p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Principios</h3>
            <p className="text-gray-600 leading-relaxed text-center">
              Calidad, transparencia, innovación y compromiso son los valores fundamentales que guían cada decisión y proyecto en HandCode.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Features
