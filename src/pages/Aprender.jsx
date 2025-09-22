import React from 'react';
import CardNav from '../componentes/Nadvar.jsx';
import MagicBento from '../componentes/MagicBento.jsx';
import Logo from '../assets/Logo.png';

const Aprender = () => {
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

  return (
    <div className="min-h-screen bg-white">
      <CardNav
        logo={navbarData.logo}
        logoAlt={navbarData.logoAlt}
        items={navbarData.items}
        baseColor={navbarData.baseColor}
        menuColor={navbarData.menuColor}
      />
      
      <div className="min-h-[calc(100vh-80px)] px-4 pb-20">
        {/* Desktop Layout */}
        <div className="hidden lg:flex items-center justify-end min-h-[calc(100vh)]">
          {/* Sección izquierda - Título y descripción */}
          <div className="absolute left-40 top-1/2 transform -translate-y-1/2 w-1/3">
            <h1 className="text-4xl font-bold text-black mb-5">
              Aprende con HandCode
            </h1>
            
            <p className="text-sm text-gray-700 leading-relaxed">
              Elige cualquiera de las opciones disponibles para comenzar tu experiencia de aprendizaje con inteligencia artificial y reconocimiento de gestos.
            </p>
          </div>
          
          {/* Sección derecha - MagicBento */}
          <div className="flex justify-end">
            <MagicBento 
              textAutoHide={true}
              enableStars={true}
              enableSpotlight={true}
              enableBorderGlow={true}
              enableTilt={true}
              enableMagnetism={true}
              clickEffect={true}
              spotlightRadius={300}
              particleCount={12}
              glowColor="132, 0, 255"
            />
          </div>
        </div>

        {/* Tablet Layout */}
        <div className="hidden md:flex lg:hidden flex-col items-center justify-center min-h-[calc(100vh-80px)] space-y-8">
          {/* Título y descripción arriba */}
          <div className="text-center max-w-2xl">
            <h1 className="text-4xl font-bold text-black mb-4">
              Aprende con HandCode
            </h1>
            
            <p className="text-base text-gray-700 leading-relaxed">
              Elige cualquiera de las opciones disponibles para comenzar tu experiencia de aprendizaje con inteligencia artificial y reconocimiento de gestos.
            </p>
          </div>
          
          {/* MagicBento centrado */}
          <div className="flex justify-center">
            <MagicBento 
              textAutoHide={true}
              enableStars={true}
              enableSpotlight={true}
              enableBorderGlow={true}
              enableTilt={true}
              enableMagnetism={true}
              clickEffect={true}
              spotlightRadius={300}
              particleCount={12}
              glowColor="132, 0, 255"
            />
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="flex md:hidden flex-col items-center justify-center min-h-[calc(100vh-80px)] space-y-6 px-4">
          {/* Título y descripción arriba */}
          <div className="text-center max-w-sm">
            <h1 className="text-3xl font-bold text-black mb-4">
              Aprende con HandCode
            </h1>
            
            <p className="text-sm text-gray-700 leading-relaxed">
              Elige cualquiera de las opciones disponibles para comenzar tu experiencia de aprendizaje.
            </p>
          </div>
          
          {/* MagicBento centrado y más pequeño */}
          <div className="flex justify-center scale-75">
            <MagicBento 
              textAutoHide={true}
              enableStars={true}
              enableSpotlight={true}
              enableBorderGlow={true}
              enableTilt={true}
              enableMagnetism={true}
              clickEffect={true}
              spotlightRadius={300}
              particleCount={12}
              glowColor="132, 0, 255"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Aprender;