import { useNavigate } from 'react-router-dom';
import TextType from './TextType.jsx';
import logo from '../assets/Logo.png';

const Banner = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/aprender');
  };

  return (
    <section 
      className="h-[90vh] w-full flex items-center px-5 md:px-6 sm:px-4 py-10 md:py-8 sm:py-5 relative bg-gradient-to-br from-orange-100"
    >
      <div className="max-w-7xl mx-auto w-full flex justify-between items-center px-8 pt-16 gap-10">
        <div className="text-left max-w-5xl flex-1 flex flex-col gap-4">
          {/* Título Principal */}
          <TextType 
            as="h1"
            className="text-6xl md:text-5xl sm:text-4xl font-black leading-tight mb-6 text-black tracking-tight"
            text={["Comunicación sin Barreras", "Reconoce señas en vivo", "Forma palabras con tus manos"]}
            typingSpeed={75}
            pauseDuration={1500}
            showCursor={true}
            cursorCharacter="|"
            textColors={["#000000"]}
          />
          
          {/* Descripción */}
          <p className="text-xl md:text-lg sm:text-base leading-relaxed text-black/80 mb-4 font-medium max-w-3xl">
            CodeHand reconoce señas en tiempo real y te ayuda a formar palabras con precisión.
          </p>
          <p className="text-base md:text-sm text-black/70 mb-10 max-w-2xl font-normal">
            Crea, entrena y gestiona tus propios modelos. Todo en un solo lugar, simple y rápido.
          </p>
          
          {/* Botón */}
          <div className="mb-12">
            <button 
              onClick={handleGetStarted}
              className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg cursor-pointer transition-all duration-300 bg-black text-white hover:bg-black/90 hover:-translate-y-1 hover:shadow-2xl shadow-lg min-w-48"
            >
              <span>Get Started</span>
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
        <div className="shrink-0 flex items-center justify-end">
          <img
            src={logo}
            alt="Logo CodeHand"
            className="w-64 h-64 md:w-80 md:h-80 lg:w-[28rem] lg:h-[28rem] object-contain select-none"
          />
        </div>
      </div>
    </section>
  )
}

export default Banner
