# Toolkit PXD

Sistema de gestión de observaciones y entrevistas para el Banco de Crédito del Perú (BCP). Permite crear proyectos, configurar cuestionarios personalizados, registrar sesiones de observación y exportar datos en formato CSV.

## 🚀 Características Principales

### 📊 Gestión de Proyectos

- **Creación de proyectos** con descripción y agencias
- **Control de acceso** por usuarios
- **Configuración de cuestionarios** personalizados
- **Exportación de datos** en formato CSV

### 📝 Sistema de Cuestionarios

- **Tipos de preguntas**:
  - **Texto libre** - Respuestas de texto abierto
  - **Sí/No** - Preguntas booleanas
  - **Opción única** - Radio buttons con opciones predefinidas
  - **Múltiple selección** - Checkboxes con opciones múltiples
- **Opciones por defecto** - Primera opción seleccionada automáticamente
- **Respuestas nulas** - Permite dejar preguntas sin responder

### 🏢 Gestión de Agencias

- **Múltiples agencias** por proyecto
- **Filtrado por agencia** en sesiones
- **Seguimiento de agencia** en observaciones

### 👥 Control de Usuarios

- **Acceso por proyecto** - Solo usuarios autorizados pueden ver proyectos
- **Roles diferenciados**:
  - **Creador del proyecto** - Control total (editar, eliminar, gestionar usuarios)
  - **Usuario agregado** - Solo puede crear sesiones y observaciones
- **Gestión de usuarios** - Agregar/quitar usuarios de proyectos

## 🛠️ Tecnologías Utilizadas

- **Frontend**: Next.js 14, React, TypeScript
- **UI Components**: shadcn/ui, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Deployment**: Vercel

## 📁 Estructura del Proyecto

```
src/
├── app/                    # Páginas de la aplicación
│   ├── login/             # Página de inicio de sesión
│   ├── projects/          # Lista de proyectos
│   ├── create-project/    # Crear nuevo proyecto
│   ├── project-settings/  # Configuración de proyecto
│   ├── calendar/          # Selección de fecha
│   └── sessions/          # Sesiones de observación
├── components/            # Componentes reutilizables
│   ├── ui/               # Componentes de UI base
│   ├── AuthForm.tsx      # Formulario de autenticación
│   ├── QuestionnaireForm.tsx # Formulario de cuestionario
│   └── ...
├── contexts/             # Contextos de React
│   └── AuthContext.tsx   # Contexto de autenticación
├── lib/                  # Utilidades y configuración
│   ├── supabase.ts       # Cliente de Supabase
│   └── utils.ts          # Funciones utilitarias
└── types/                # Definiciones de tipos TypeScript
    └── observation.ts     # Tipos de datos
```

## 🗄️ Base de Datos

### Tablas Principales

#### `projects`

- **id**: UUID único del proyecto
- **name**: Nombre del proyecto
- **description**: Descripción del proyecto
- **created_by**: ID del usuario creador
- **agencies**: Array de agencias asociadas
- **created_at/updated_at**: Timestamps

#### `project_users`

- **id**: UUID único
- **project_id**: Referencia al proyecto
- **user_id**: Referencia al usuario
- **added_by**: Usuario que agregó al proyecto
- **created_at**: Timestamp

#### `project_observation_options`

- **id**: UUID único
- **project_id**: Referencia al proyecto
- **name**: Texto de la pregunta
- **description**: Descripción opcional
- **question_type**: Tipo de pregunta (string, boolean, radio, checkbox)
- **options**: Array de opciones para radio/checkbox
- **is_visible**: Si la pregunta está visible
- **created_at/updated_at**: Timestamps

#### `sessions`

- **id**: UUID único
- **user_id**: Usuario que creó la sesión
- **project_id**: Proyecto asociado
- **agency**: Agencia seleccionada
- **start_time**: Hora de inicio
- **end_time**: Hora de finalización (opcional)
- **created_at/updated_at**: Timestamps

#### `observations`

- **id**: UUID único
- **session_id**: Referencia a la sesión
- **project_id**: Referencia al proyecto
- **user_id**: Usuario que creó la observación
- **project_observation_option_id**: Referencia a la pregunta
- **response**: Respuesta del usuario
- **agency**: Agencia (heredada de la sesión)
- **Campos denormalizados**: Para optimizar consultas
- **created_at/updated_at**: Timestamps

### Características de la Base de Datos

- **Row Level Security (RLS)**: Control de acceso a nivel de fila
- **Triggers automáticos**: Actualización de timestamps y campos denormalizados
- **Índices optimizados**: Para consultas rápidas
- **Integridad referencial**: Claves foráneas con cascada
- **Funciones helper**: Para operaciones comunes

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js 18+
- npm o yarn
- Cuenta de Supabase
- Cuenta de Vercel (para deployment)

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd observation-tracker
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Crear archivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Configurar Base de Datos

1. Ir a Supabase Dashboard
2. Ejecutar el script `final-database-schema.sql` en el SQL Editor
3. Verificar que todas las tablas, índices y políticas se crearon correctamente

### 5. Ejecutar en Desarrollo

```bash
npm run dev
```

### 6. Deployment en Vercel

```bash
npm run build
vercel deploy
```

## 📖 Guía de Uso

### 1. Autenticación

- Los usuarios deben iniciar sesión con su cuenta de Supabase
- El sistema maneja automáticamente la autenticación

### 2. Crear un Proyecto

1. Ir a la página de proyectos
2. Hacer clic en "Nuevo Proyecto"
3. Completar:
   - Nombre del proyecto
   - Descripción
   - Agencias (opcional)
   - Usuarios a agregar (opcional)
4. Configurar preguntas del cuestionario
5. Guardar el proyecto

### 3. Configurar Cuestionario

1. Ir a configuración del proyecto
2. Agregar preguntas:
   - **Texto**: Para respuestas libres
   - **Sí/No**: Para preguntas booleanas
   - **Opción única**: Para selección única con opciones
   - **Múltiple**: Para selección múltiple
3. Configurar opciones para radio/checkbox
4. Guardar cambios

### 4. Crear Sesión de Observación

1. Seleccionar proyecto
2. Elegir fecha en el calendario
3. Seleccionar agencia (si aplica)
4. Completar el cuestionario
5. Guardar respuestas

### 5. Exportar Datos

1. Ir a la lista de proyectos
2. Hacer clic en el ícono de descarga
3. Se descargará un CSV con:
   - ID de observación
   - Pregunta
   - Respuesta
   - Agencia
   - Fechas de creación y actualización
   - Email del usuario
   - Información de la sesión
   - Información del proyecto

## 🔧 Funcionalidades Técnicas

### Sistema de Cuestionarios

- **Auto-edit mode**: Las nuevas sesiones entran automáticamente en modo edición
- **Smart save**: El botón guardar se habilita solo cuando hay cambios
- **Default options**: Primera opción seleccionada por defecto
- **Null responses**: Permite respuestas vacías
- **Session state**: Diferencia entre sesiones nuevas y finalizadas

### Control de Acceso

- **Project-based**: Los usuarios solo ven proyectos a los que tienen acceso
- **Creator privileges**: Los creadores tienen control total
- **User management**: Solo creadores pueden gestionar usuarios
- **RLS policies**: Seguridad a nivel de base de datos

### Optimización de Rendimiento

- **Denormalized fields**: Campos calculados para evitar joins
- **Indexes**: Índices en columnas frecuentemente consultadas
- **Lazy loading**: Carga de datos bajo demanda
- **Caching**: Cache de consultas frecuentes

## 🐛 Solución de Problemas

### Error de Permisos

Si aparece error "permission denied":

1. Verificar que RLS esté configurado correctamente
2. Ejecutar el script de base de datos completo
3. Verificar que el usuario esté agregado al proyecto

### Error de Cuestionario

Si el cuestionario no guarda:

1. Verificar que la sesión esté activa
2. Comprobar que las preguntas estén configuradas
3. Revisar la consola del navegador para errores

### Error de Exportación

Si la exportación falla:

1. Verificar que hay observaciones en el proyecto
2. Comprobar permisos de usuario
3. Revisar la estructura de la base de datos

## 📊 Estructura del CSV Exportado

El archivo CSV exportado contiene las siguientes columnas:

1. **ID Observación** - Identificador único de la observación
2. **Pregunta** - Texto de la pregunta del cuestionario
3. **Respuesta** - Respuesta del usuario (puede ser nula)
4. **Agencia** - Agencia asociada a la sesión
5. **Fecha Creación Observación** - Cuándo se creó la observación
6. **Fecha Actualización Observación** - Última actualización
7. **Email Usuario Observación** - Email del usuario que creó la observación
8. **ID Sesión** - Identificador de la sesión
9. **Fecha Inicio Sesión** - Cuándo comenzó la sesión
10. **Fecha Fin Sesión** - Cuándo terminó la sesión (si aplica)
11. **ID Proyecto** - Identificador del proyecto
12. **Nombre Proyecto** - Nombre del proyecto

## 🔒 Seguridad

### Autenticación

- **Supabase Auth**: Sistema de autenticación robusto
- **JWT tokens**: Tokens seguros para sesiones
- **Password policies**: Políticas de contraseñas seguras

### Autorización

- **Row Level Security**: Control de acceso a nivel de fila
- **Project-based access**: Acceso basado en proyectos
- **User roles**: Roles diferenciados por usuario

### Protección de Datos

- **HTTPS**: Todas las comunicaciones encriptadas
- **Environment variables**: Variables sensibles en archivos de entorno
- **Input validation**: Validación de entrada en frontend y backend

## 🚀 Deployment

### Vercel (Recomendado)

1. Conectar repositorio a Vercel
2. Configurar variables de entorno
3. Deploy automático en cada push

### Variables de Entorno Requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📝 Changelog

### Versión 1.0.0

- ✅ Sistema completo de gestión de proyectos
- ✅ Cuestionarios personalizables con 4 tipos de preguntas
- ✅ Control de acceso por usuarios
- ✅ Exportación de datos en CSV
- ✅ Gestión de agencias
- ✅ Interfaz responsive para móviles
- ✅ Sistema de autenticación
- ✅ Base de datos optimizada con RLS

## 🤝 Contribución

Para contribuir al proyecto:

1. Fork el repositorio
2. Crear una rama para la feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit los cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o preguntas:

- Crear un issue en el repositorio
- Contactar al equipo de desarrollo
- Revisar la documentación de Supabase y Next.js

---

**Toolkit PXD** - Sistema de gestión de observaciones y entrevistas
