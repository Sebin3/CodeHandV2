import React from 'react';
import CardNav from '../componentes/Nadvar.jsx';
import Logo from '../assets/Logo.png';

const ChatBot = () => {
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
      
      <div className="pt-20 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Modelos Personalizados</h1>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
