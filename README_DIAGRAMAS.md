## Diagramas del Proyecto CodeHandV2

Este documento resume, a alto nivel, el flujo, la arquitectura y las interacciones principales del sistema (frontend React con MediaPipe + backend FastAPI + almacenamiento de modelos). Los diagramas están en formato Mermaid para fácil visualización.

### 1) Diagrama de Flujo (alto nivel)

```mermaid
flowchart LR
  A["Usuario"] -->|Navega / interactúa| B["Frontend React"]
  B -->|Video de cámara| C["MediaPipe Hands"]
  C -->|Landmarks (42/63)| D["Lógica de Página"]
  D -->|/models/:id/predict| E["Backend FastAPI"]
  E -->|Carga Modelo .pkl| F["Cache/Disco Persistente"]
  E -->|Predicción| D
  D -->|Actualiza UI / Voz| B
  B -->|Rutas (Router)| G["Pages:<br/>ReconocerVocales<br/>ReconocerPalabras<br/>AlgebraCalc<br/>Modelos<br/>EntrenarModelo<br/>ReconocerGenerico"]
```

Notas:
- La app utiliza 42 (x,y) por defecto; algunos módulos específicos pueden usar 63 (x,y,z) si el modelo fue entrenado así.
- La persistencia de modelos usa archivos `.pkl` en el backend. Si falta el archivo, se entrena nuevamente.

### 2) Diagrama de Secuencia: Reconocimiento en AlgebraCalc

```mermaid
sequenceDiagram
  participant U as Usuario
  participant FE as Frontend (AlgebraCalc.jsx)
  participant MP as MediaPipe Hands
  participant BE as Backend (FastAPI)
  participant FS as Modelos (.pkl)

  U->>FE: Activa cámara / voz
  FE->>MP: Procesa frames
  MP-->>FE: Landmarks suavizados (EMA)
  FE->>BE: POST /models/{id}/predict (42 features)
  BE->>FS: Cargar modelo .pkl (cache)
  FS-->>BE: Modelo cargado
  BE-->>FE: Predicción dígito (1-5)
  FE-->>U: Muestra dígito detectado (provisional/estable)
  U->>FE: Dice "uno", "dos", ..., "es igual a"
  FE-->>FE: Añade dígitos a expresión si coincide con detectado
  FE-->>FE: Parsea y evalúa expresión (shunting-yard)
  FE-->>U: Muestra resultado
```

### 3) Diagrama de Secuencia: Dos manos en ReconocerPalabras

```mermaid
sequenceDiagram
  participant U as Usuario
  participant FE as Frontend (ReconocerPalabras.jsx)
  participant MP as MediaPipe Hands (maxNumHands=2)
  participant BE as Backend (FastAPI)

  U->>FE: Activa cámara / voz
  FE->>MP: Procesa frames
  MP-->>FE: Landmarks mano 1 (celeste) y mano 2 (verde)
  FE->>BE: POST /models/{id}/predict (63 features si el modelo lo requiere)
  BE-->>FE: Letra1, Letra2 (estabilizadas por buffer)
  U->>FE: Dice "enviar" / "espacio" / "borrar" / "limpiar"
  FE-->>FE: Concatenar letras, añadir espacio, borrar último o limpiar
  FE-->>U: Actualiza palabra formada
```

### 4) Arquitectura Lógica (Frontend)

```mermaid
flowchart TB
  subgraph UI
    MB[MagicBento]
    NV[Nadvar / Navbar]
    BN[Banner + TextType]
  end

  subgraph Pages
    RV[ReconocerVocales.jsx]
    RP[ReconocerPalabras.jsx]
    AC[AlgebraCalc.jsx]
    MO[Modelos.jsx]
    EM[EntrenarModelo.jsx]
    RG[ReconocerGenerico.jsx]
  end

  subgraph Core
    API[api.js]
    SR[SpeechRecognition]
    MPH[MediaPipe Hands + smoothing EMA]
    ST[Buffers de estabilidad + cooldown]
    RT[React Router]
  end

  MB --> RT
  NV --> RT
  BN --> MB
  RT --> RV & RP & AC & MO & EM & RG
  RV & RP & AC & EM & RG --> MPH
  RV & RP & AC --> SR
  RV & RP & AC & EM & RG --> ST
  RV & RP & AC & EM & RG --> API
```

### 5) Arquitectura Backend (alto nivel)

```mermaid
flowchart LR
  FE[Frontend] -->|HTTP JSON| BE[FastAPI]
  BE --> DB[(DB modelos/categorías/muestras)]
  BE --> MS[(/opt/render/project/src/models/*.pkl)]
  BE --> TR[Entrenamiento sklearn]
  TR --> MS
```

Endpoints clave:
- GET /models
- POST /models/create
- POST /models/{id}/train
- POST /models/{id}/predict
- POST /models/{id}/samples/{category}
- POST /models/{id}/import-csv
- DELETE /models/{id}

### 6) Modelo de Datos (simplificado)

```mermaid
classDiagram
  class Model {
    id: UUID
    name: string
    status: string  // created | training | trained | error
    categories: string[]
    accuracy: number
  }
  class Sample {
    modelId: UUID
    category: string
    features: float[]  // 42 o 63
    createdAt: datetime
  }
  Model "1" --> "*" Sample
```

### 7) Flujo de Entrenamiento

```mermaid
flowchart TB
  A["Usuario captura muestras"] --> B["POST /models/:id/samples/:category"]
  B --> C["DB almacena features"]
  A --> D["POST /models/:id/train"]
  D --> E["FastAPI arma dataset X,y"]
  E --> F["Validación dimensiones (42/63 consistentes)"]
  F -->|ok| G["Entrena sklearn"]
  G --> H["Guarda .pkl en ruta persistente"]
  H --> I["status=trained"]
  F -->|mismatch| J["status=error + log"]
```

### 8) Notas de Implementación
- Suavizado EMA de landmarks y buffers de estabilidad para reducir “salto”.
- Reconocimiento por voz: comandos por página y asoc. de dígitos/palabras.
- Rutas dinámicas: `Modelos.jsx` decide si ir a `AlgebraCalc`, `ReconocerVocales` o `ReconocerGenerico` según nombre/categorías.
- Persistencia: si falta `.pkl`, reentrenar o marcar 503 para reintentar.

### 9) Cómo visualizar Mermaid
- En GitHub/VSCode con extensiones Mermaid.
- O usa `https://mermaid.live` para pegar los bloques y renderizarlos.

### 10) Diagrama de Secuencia End-to-End (Frontend + Backend)

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuario
  participant FE as Frontend React (App.jsx)
  participant RT as React Router
  participant PG as Página (RV/RP/AC/MO/EM/RG)
  participant MP as MediaPipe Hands
  participant SR as SpeechRecognition
  participant API as ApiService (fetch)
  participant BE as FastAPI (Backend)
  participant DB as DB (modelos/muestras)
  participant MC as ModeloCache
  participant FS as FS (/models/*.pkl)
  participant TR as Entrenamiento (sklearn)

  Note over U,FE: Navegación inicial / Home
  U->>FE: Abre la app
  FE->>RT: Resuelve ruta actual
  RT-->>FE: Elemento de página
  FE->>PG: Renderiza componente

  Note over PG,API: Listar modelos (Modelos.jsx)
  PG->>API: GET /models
  API->>BE: HTTP GET /models
  BE->>DB: Consulta modelos
  DB-->>BE: Lista de modelos
  BE-->>API: 200 JSON modelos
  API-->>PG: setState(modelos)
  PG-->>U: Render cards acciones (Reconocer/Entrenar/Eliminar)

  alt Crear modelo (CreateModelModal)
    U->>PG: Completa formulario (nombre, categorías)
    PG->>API: POST /models/create
    API->>BE: HTTP POST /models/create
    BE->>DB: Inserta modelo (status=created)
    DB-->>BE: id del modelo
    BE-->>API: 201 {id}
    API-->>PG: resultado creación
    PG->>API: POST /models/{id}/train (auto-train)
    API->>BE: HTTP POST /models/{id}/train
    BE->>DB: Lee muestras (si existen)
    alt Hay muestras suficientes y dimensiones válidas
      BE->>TR: Entrena sklearn
      TR-->>BE: Modelo en memoria
      BE->>FS: Guarda {id}.pkl
      BE->>DB: status=trained / accuracy
      BE-->>API: 200 {status: trained}
      API-->>PG: OK (actualiza UI)
    else Falta .pkl o mismatch 42/63
      BE-->>API: 4xx/5xx con detalle
      API-->>PG: Mostrar error / guía
    end
  end

  Note over PG,MP: Reconocimiento en tiempo real (cámara)
  U->>PG: Activa cámara
  PG->>MP: Inicializa y procesa frames
  MP-->>PG: Landmarks suavizados (EMA)
  loop Intervalo SEND_INTERVAL
    PG->>API: POST /models/{id}/predict (features 42/63)
    API->>BE: HTTP POST /models/{id}/predict
    BE->>MC: ¿Modelo en cache?
    alt Cache HIT
      MC-->>BE: clf
    else Cache MISS
      BE->>FS: Cargar {id}.pkl
      alt Archivo existe
        FS-->>BE: Modelo cargado
        BE->>MC: Cachear modelo
      else Archivo no encontrado
        BE-->>API: 503/500 Archivo de modelo no encontrado
        API-->>PG: Manejar error (opcional reentrenar)
      end
    end
    alt Modelo cargado
      BE-->>API: 200 {predicción, probas}
      API-->>PG: Actualiza buffers/estado
      PG-->>U: Muestra letra/dígito provisional y estable
    end
  end

  Note over PG,SR: Comandos de voz (ej. AlgebraCalc / ReconocerPalabras)
  U->>PG: Activa micrófono
  PG->>SR: start()
  SR-->>PG: onresult(transcript)
  alt AlgebraCalc
    PG-->>PG: Si transcript coincide con dígito detectado → añadir token
    PG-->>PG: Operadores: más/menos/por/entre
    PG-->>PG: "es igual a" → eval expresión → setResultado
    PG-->>U: Muestra expresión y resultado
  else ReconocerPalabras
    PG-->>PG: "enviar" concatena letra1+letra2
    PG-->>PG: "espacio","borrar","limpiar"
    PG-->>U: Actualiza palabra formada
  end

  Note over PG,API: Entrenar desde página de entrenamiento
  U->>PG: Captura muestras por categoría
  PG->>API: POST /models/{id}/samples/{cat}
  API->>BE: Guarda features
  BE->>DB: Inserta Sample
  DB-->>BE: OK
  BE-->>API: 200
  API-->>PG: OK
  U->>PG: Clic Entrenar
  PG->>API: POST /models/{id}/train
  API->>BE: Entrenar (validación 42 vs 63)
  BE->>TR: sklearn fit
  TR-->>BE: Modelo entrenado
  BE->>FS: Escribir {id}.pkl
  BE->>DB: status=trained/accuracy
  BE-->>API: 200
  API-->>PG: OK (feedback UI)
```


