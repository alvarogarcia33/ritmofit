# Ritmo Fit

Ritmo Fit es una aplicación privada de entrenamiento con cuentas de usuario y seguimiento individual. La interfaz está en español y el acceso a los planes, sesiones, progreso y ajustes requiere iniciar sesión.

Repositorio: <https://github.com/alvarogarcia33/ritmofit>

## Qué ofrece

- **Adelgazar:** rutina basada en el PDF del proyecto, con niveles, ejercicios, series y cardio según el programa.
- **Tonificar:** rutina de fuerza y control organizada por días, con referencias y videos vinculados cuando están disponibles.
- **Plan Personal:** una rutina propia por cuenta. Se arma seleccionando ejercicios de un catálogo por grupo muscular y asignándolos a días de lunes a domingo; ahora se puede elegir **4, 8, 12 semanas o duración continua**. En el modo continuo se repite la distribución semanal sin reiniciar el historial.
- **Entrenamiento y seguimiento:** marcar series, **registrar peso (kg) y repeticiones reales por cada serie**, recuperar las marcas anteriores del mismo ejercicio, usar el reloj de descanso y consultar el historial individual de cada plan.
- **Uso rápido desde el celular:** fichas con registro de carga desplegable, botones de series de 44 píxeles y temporizador flotante que continúa contando al cerrar su panel. Al marcar una serie, sus valores ingresados de peso y repeticiones se guardan en **la misma petición** que el cumplimiento; el botón independiente sigue disponible para guardar marcas sin completar series. Si hay cambios sin guardar, se advierte antes de cambiar día o semana y al salir de la página.
- **Recordatorios dentro de la app:** los pendientes se calculan con la fecha de inicio y zona horaria de la cuenta. No se envían emails ni notificaciones push cuando la app está cerrada.
- **Demostraciones de ejercicios:** el catálogo personal ofrece una guía técnica para sus 74 ejercicios. Los videos externos se muestran solo si un administrador los vinculó a una variante específica. El editor `/admin/demostraciones` permite registrar o retirar videos de YouTube/Vimeo y atribuir su fuente, sin modificar rutinas ni progreso.
- **Administración:** las cuentas con rol `admin` pueden revisar usuarios, progreso y planes. «Plan Personal» es un filtro por usuario, no un plan público compartido.

## Guía rápida para entrenar

1. Abrí la app, registrate con usuario, contraseña, nombre y correo, o iniciá sesión. El registro crea una cuenta normal; no permite asignarse el rol de administración.
2. En **Mis planes**, elegí Adelgazar o Tonificar. El progreso y la inscripción se guardan por separado para cada plan.
3. Para crear tu rutina, elegí **Crear Plan Personal**. Seleccioná un día, abrí un grupo muscular y agregá ejercicios. Podés ordenarlos y quitarlos; dentro de un día no se repite el mismo ejercicio.
4. Elegí una duración de 4, 8 o 12 semanas, o **Sin fecha de fin**. En el modo continuo el calendario muestra bloques de cinco semanas navegables; el progreso registra cada semana con una clave propia y los recordatorios muestran solamente las cuatro semanas recientes. Configurá de 1 a 10 series por ejercicio (3 al agregarlo). Los ejercicios por repeticiones empiezan en 10 y aceptan de 1 a 100; la plancha se configura por duración, de 1 a 3600 segundos, con 30 segundos iniciales. Cada día armado admite de 1 a 20 ejercicios; los días vacíos quedan libres.
5. Confirmá para guardar y abrir el plan. En **Mi entrenamiento**, completá las series y seguí el reloj de descanso. En cada ejercicio podés escribir los kilos y repeticiones realizadas **por serie** y pulsar **Guardar marcas**. El registro es opcional e independiente de la marca de serie completa; la referencia **Última vez** recupera la sesión anterior del mismo ejercicio, incluso si cambió de día en otra versión del Plan Personal. En ejercicios cronometrados no aparece el campo de repeticiones.
6. En **Mi programa** consultá el calendario. En **Mi progreso** revisá el historial y los gráficos. En **Mi cuenta** ajustá perfil, fecha de inicio, descanso, hora, zona horaria y recordatorios.

Las cargas se registran siempre en **kilogramos**, entre 0 y 1000 kg y hasta dos decimales; las repeticiones deben ser enteras entre 1 y 200. Se admite una marca solo de peso o solo de repeticiones. Los historiales anteriores sin estas medidas siguen funcionando: ningún valor se inventa o estima. Las marcas se muestran en el historial de sesiones y quedan incorporadas al archivo de una edición anterior del Plan Personal.

El Plan Personal **no inventa videos ni láminas**: los 74 ejercicios muestran instrucciones técnicas y, cuando el administrador revisa y vincula una demostración, ofrecen el reproductor correspondiente. Los enlaces no vienen precargados por defecto: hay que comprobar que cada video corresponde a la variante concreta, respetar atribución y permisos del proveedor. No se descargan ni se alojan archivos de video en la aplicación. **Se puede editar aun con entrenamientos registrados**: al guardar una versión modificada se archivan atómicamente la rutina anterior y todas sus sesiones (completas y parciales), con las fechas, cantidades y ejercicios originales. La edición inicia un ciclo nuevo con la duración elegida el próximo lunes cuando existía progreso; las sesiones previas se consultan en **Mi progreso → Versiones anteriores**. El progreso activo vuelve a cero solo para esa nueva versión; no se borran los registros históricos. Cada edición sin cambios se ignora; ediciones obsoletas de otra pestaña se rechazan para evitar sobrescrituras.

## Secciones de la aplicación

| Ruta             | Uso                                                                   |
| ---------------- | --------------------------------------------------------------------- |
| `/acceso`        | Registro e inicio de sesión.                                          |
| `/` y `/planes`  | Biblioteca, selección y continuación de planes.                       |
| `/plan-personal` | Crear, revisar o editar la rutina personal.                           |
| `/entrenamiento` | Sesión del día, series, demostraciones disponibles y reloj.           |
| `/programa`      | Calendario semanal y sesiones previstas.                              |
| `/progreso`      | Historial y métricas del plan seleccionado.                           |
| `/ajustes`       | Perfil, fecha, descanso y preferencias de recordatorios.              |
| `/admin`         | Seguimiento de usuarios, visible solo para una cuenta administradora. |
| `/admin/planes`  | Gestión del catálogo de planes globales, para administración.         |
| `/admin/demostraciones` | Gestión de enlaces de video y fuentes de los 74 ejercicios del Plan Personal. |

## Requisitos

- Node.js 22 o compatible con `node:22`.
- pnpm 10.18.0 (la versión está fijada en `package.json` y `pnpm-lock.yaml`).
- MySQL accesible para la aplicación. El proceso del servidor requiere `DATABASE_URL`.

## Desarrollo local

Cloná el repositorio e instalá las dependencias bloqueadas:

```bash
git clone https://github.com/alvarogarcia33/ritmofit.git
cd ritmofit
corepack enable
corepack prepare pnpm@10.18.0 --activate
pnpm install --frozen-lockfile
```

Creá un archivo `.env` en la raíz del proyecto (está ignorado por Git) con una base **de desarrollo aislada**:

```dotenv
DATABASE_URL=mysql://USUARIO:CLAVE@HOST:3306/ritmofit_dev
PORT=3000
```

Reemplazá los valores de ejemplo; si la contraseña contiene caracteres reservados de URL, codificalos. La base de datos MySQL indicada en la URL debe existir y el usuario necesita permisos para crear y actualizar las tablas de la app. Nunca pegues credenciales reales en este README, en código del navegador ni en commits.

Iniciá el servidor y Vite:

```bash
pnpm dev
```

Abrí <http://localhost:3000>. El servidor expone `GET /api/health` para comprobar que está respondiendo. El arranque valida la conexión a MySQL, crea las tablas que faltan y carga los planes globales iniciales. Si falta `DATABASE_URL` o no se puede conectar a la base, el servidor no inicia.

En un entorno alojado, configurá `DATABASE_URL` y `PORT` en el gestor de variables/secrets del servicio. Las integraciones de la plataforma pueden requerir variables `MANUS_*`; usá el gestor del entorno y no las copies al cliente. El login propio de Ritmo Fit guarda usuarios y sesiones en MySQL.

## Comandos de desarrollo

| Comando       | Función                                                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`    | Inicia Express, API y Vite en modo desarrollo. Usa `PORT` o 3000.                                                           |
| `pnpm check`  | Verifica tipos con TypeScript.                                                                                              |
| `pnpm test`   | Ejecuta la suite Vitest. Las pruebas de propiedad y persistencia usan mocks; no reemplazan pruebas contra una base aislada. |
| `pnpm build`  | Compila frontend y servidor a `dist/`.                                                                                      |
| `pnpm start`  | Ejecuta el build de producción; requiere `pnpm build` y `DATABASE_URL`.                                                     |
| `pnpm format` | Formatea los archivos del proyecto con Prettier.                                                                            |

Para una compilación local de producción:

```bash
pnpm build
pnpm start
```

El comando lee el `PORT` configurado en `.env`; si no lo definís, usa 3000.

El contenedor usa Node 22 y respeta `PORT`. La ruta de salud sin autenticación es `/api/health`.

## Base de datos y datos

La persistencia de Fit está en MySQL y se implementa con `mysql2` en `server/fit-db.ts` y `server/fit-plan-db.ts`. Al iniciar, el servidor agrega de manera idempotente las tablas y columnas faltantes y mantiene la versión del esquema; los datos de usuarios no se deben borrar para desplegar una actualización. Entre las tablas están usuarios, sesiones, progreso legado, planes, inscripciones, plan activo, progreso por plan y `fit_personal_plan_versions` (ediciones anteriores de rutinas personales con instantánea de sus sesiones).

La tabla editorial `fit_personal_exercise_media` (schema de planes v5) almacena únicamente enlaces HTTPS de YouTube/Vimeo y su autor o canal. Es compartida, no contiene datos personales ni progreso; los cambios de demostración se reflejan en los ejercicios existentes sin reescribir versiones ni sesiones. Solo un usuario autenticado puede consultarla y solo administración puede editarla. El despliegue requiere ejecutar el inicializador Fit con una base MySQL de prueba antes de producción.

La duración del Plan Personal se guarda dentro del JSON existente del plan, sin agregar tablas ni columnas. Los planes anteriores permanecen en 4 semanas hasta que la persona los edite. **La opción continua no representa una prescripción de entrenamiento ni elimina el descanso:** cada usuario sigue teniendo días libres según su selección. Las vistas de calendario y métricas muestran un período limitado para evitar cálculos infinitos, pero el historial no se elimina.

**Antes de desplegar la edición por versiones y las marcas de fuerza:** respaldá la base real y probá con MySQL de staging aislado. La inicialización agrega la tabla `fit_personal_plan_versions` y la columna JSON nullable `set_performance` a `fit_progress` y `fit_plan_progress` (esquema de planes v4; esquema Fit v2) sin eliminar tablas existentes. Al editar un plan con actividad, el servidor archiva su contenido y progreso dentro de una transacción antes de liberar los identificadores de sesiones de la nueva edición. No ejecutes cambios manuales sobre `fit_plan_progress` sin verificar la existencia de los archivos históricos.

El código también conserva configuración Drizzle heredada de la plantilla. Los planes de entrenamiento usan las rutinas SQL y el inicializador de Fit; no ejecutes `pnpm db:push` como sustituto de una migración revisada de Fit. Respaldá la base antes de cambios de esquema.

**Importante:** la base administrada por el proyecto puede compartirse entre desarrollo, pruebas y producción. No apuntes un servidor local ni una prueba manual a esa base: registros, ediciones y eliminaciones afectarían datos reales. Usá una base MySQL local o de staging independiente.

## Provisionar una cuenta administradora

El registro público crea cuentas con rol `user`; no hay contraseña administrativa por defecto ni un campo de rol aceptado desde el navegador. Para un bootstrap inicial en un entorno Linux confiable, existe `server/create-admin.ts`. Configurá `DATABASE_URL` para la base correcta y las variables antes de ejecutarlo:

```bash
export RITMO_FIT_ADMIN_EMAIL="admin@example.com"
export RITMO_FIT_ADMIN_TIMEZONE="America/Argentina/Buenos_Aires" # opcional
pnpm exec tsx server/create-admin.ts
```

El script reserva el usuario `administrador`, genera una contraseña aleatoria y la escribe en `/home/ubuntu/ritmofit-admin-access.txt` con permisos restringidos. Leé ese archivo solo desde el host seguro, guardá la contraseña en un gestor de claves y eliminá la copia según la política de la organización. El script está pensado para Linux/Cloud y tiene esa ruta fija; **no lo ejecutes directamente en Windows u otro sistema sin adaptar y revisar dónde se guardan las credenciales**. Solo es para el alta inicial: si el usuario ya existe, no crea ni restablece la contraseña.

## Organización del código

```text
client/src/pages/              Pantallas de acceso, biblioteca, sesión, progreso y administración
client/src/contexts/FitContext.tsx  Sesión, plan activo, catálogo, inscripciones y progreso
client/src/components/         Layout, temporizador, estrellas y componentes compartidos
client/public/                 PDF, portadas, referencias y recursos estáticos
shared/routine.ts              Ejercicios y rutina base Adelgazar
shared/programs.ts             Tipo y catálogo de planes, calendario y reglas de progreso
shared/exercise-library.ts     Catálogo por músculo y constructor validado del Plan Personal
shared/set-performance.ts       Validación de marcas reales por serie y equivalencia entre versiones
client/src/lib/strength.ts      Consulta de las últimas marcas del mismo ejercicio
server/fit.ts                  Autenticación, perfiles y API Fit
server/fit-plans.ts            API de planes, inscripciones, progreso y filtros admin
server/fit-db.ts               Usuarios, sesiones y datos base en MySQL
server/fit-plan-db.ts          Planes, propietarios, selección activa y progreso multi-plan
server/_core/index.ts          Arranque Express, rutas de salud, API y entrega del frontend
```

Las llamadas de la app Fit están bajo `/api/fit/*`; las páginas están protegidas en el cliente y los endpoints vuelven a verificar la sesión en el servidor. Las consultas privadas toman el propietario de la sesión autenticada, no del body enviado por el navegador. Los planes personales no aparecen en el catálogo público/global; administración los resuelve al consultar un usuario específico.

## Seguridad y operación

- No subas `.env`, `DATABASE_URL`, tokens, claves ni el archivo de acceso administrativo a GitHub. Rotá cualquier credencial que se haya expuesto.
- Usá HTTPS en producción. La cookie de sesión es `HttpOnly`, `Secure` y `SameSite=None` para el acceso embebido; los datos de contraseña se guardan como hashes, nunca en texto plano.
- Las contraseñas nuevas deben tener entre 10 y 128 caracteres. El login y el registro tienen límite de intentos.
- Los recordatorios son avisos dentro de la app; no existe envío de email o push en segundo plano.
- Los videos de terceros requieren conexión a internet y pueden quedar sujetos a disponibilidad o restricciones del proveedor.
- Hacé un respaldo antes de tocar el esquema o cambiar las políticas de acceso. No publiques datos personales, progreso de usuarios ni credenciales en issues o capturas.

## Licencias y contenido

Este repositorio contiene el código y recursos versionados de Ritmo Fit, incluido el PDF de referencia. Revisá las licencias y permisos del material antes de redistribuirlo o reutilizarlo en otro proyecto.
