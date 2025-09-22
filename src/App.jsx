import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import CardNav from './componentes/Nadvar.jsx'
import Banner from './componentes/Banner.jsx'
import LogoLoop from './componentes/LogoLoop.jsx'
import Features from './componentes/Features.jsx'
import Stats from './componentes/Stats.jsx'
import CTA from './componentes/CTA.jsx'
import AprendeVocales from './pages/Aprender.jsx'
import Aprender from './pages/Aprender.jsx'
import Vocales from './pages/Vocales.jsx'
import Palabras from './pages/Palabras.jsx'
import ModelosPersonalizados from './pages/ModelosPersonalizados.jsx'
import Modelos from './pages/Modelos.jsx'
import Algebra from './pages/Algebra.jsx'
import Entrenar from './pages/Entrenar.jsx'
import EntrenarModelo from './pages/EntrenarModelo.jsx'
import ReconocerVocales from './pages/ReconocerVocales.jsx'
import AlgebraCalc from './pages/AlgebraCalc.jsx'
import ReconocerGenerico from './pages/ReconocerGenerico.jsx'
import ReconocerPalabras from './pages/ReconocerPalabras.jsx'
import SeleccionarModelo from './pages/SeleccionarModelo.jsx'
import ChatBot from './pages/ChatBot.jsx'
import { SiDocker, SiReact, SiGithub, SiTailwindcss, SiVercel } from 'react-icons/si'
import Logo from './assets/Logo.png'
import './App.css'

function App() {
  // Logos para el LogoLoop
  const techLogos = [
    { node: <SiDocker className="text-black" />, title: "Docker", href: "https://docker.com" },
    { node: <SiReact className="text-black" />, title: "React", href: "https://react.dev" },
    { node: <SiGithub className="text-black" />, title: "GitHub", href: "https://github.com" },
    { node: <SiTailwindcss className="text-black" />, title: "Tailwind CSS", href: "https://tailwindcss.com" },
    { node: <SiVercel className="text-black" />, title: "Vercel", href: "https://vercel.com" },
  ];

  // Datos de ejemplo para el Navbar - puedes personalizar estos valores
  const navbarData = {
    logo: Logo, // Puedes cambiar esto por tu logo
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
  }

  const Home = () => {
    return (
      <div className="app">
        <CardNav
          logo={navbarData.logo}
          logoAlt={navbarData.logoAlt}
          items={navbarData.items}
          baseColor={navbarData.baseColor}
          menuColor={navbarData.menuColor}
        />
        
        <Banner />
        
        {/* LogoLoop */}
        <section className="py-16 bg-gray-50">
          <LogoLoop
            logos={techLogos}
            speed={80}
            direction="left"
            logoHeight={42}
            gap={120}
            pauseOnHover
            scaleOnHover
            fadeOut
            fadeOutColor="#f9fafb"
            ariaLabel="Tecnologías que utilizamos"
          />
        </section>
        
        <Features />
        <Stats />
        <CTA />
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/aprende-vocales" element={<AprendeVocales />} />
        <Route path="/aprender" element={<Aprender />} />
        <Route path="/vocales" element={<Vocales />} />
        <Route path="/palabras" element={<Palabras />} />
        <Route path="/modelos-personalizados" element={<ModelosPersonalizados />} />
        <Route path="/modelos" element={<Modelos />} />
        <Route path="/algebra" element={<Algebra />} />
        <Route path="/entrenar" element={<Entrenar />} />
        <Route path="/entrenar/:modelId" element={<EntrenarModelo />} />
        <Route path="/reconocer/:modelId" element={<ReconocerVocales />} />
        <Route path="/formar-palabras/:modelId" element={<ReconocerPalabras />} />
        <Route path="/seleccionar-modelo" element={<SeleccionarModelo />} />
        <Route path="/algebra/:modelId" element={<AlgebraCalc />} />
        <Route path="/reconocer-generico/:modelId" element={<ReconocerGenerico />} />
        <Route path="/chatbot" element={<ChatBot />} />
      </Routes>
    </Router>
  )
}

export default App
