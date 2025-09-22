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


