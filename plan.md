# Ritmo Fit · Biblioteca de planes

## Alcance autorizado

La app evoluciona de una rutina única a varios planes. El plan actual se identifica como **Adelgazar**, conserva el PDF, las 108 fichas, niveles, videos, series y el historial ya registrado. Se incorpora **Tonificar** a partir de las cinco láminas aportadas, con 28 ejercicios de lunes a viernes. Una pantalla inicial permite elegir planes con imágenes y colores propios. Se podrá crear y editar contenido de planes futuros desde administración sin modificar código.

## Decisiones de producto y fuente

- Adelgazar sigue en rosa/fucsia. Tonificar usa violeta; cada plan futuro tiene un color configurable.
- Tonificar conserva orden, nombres, tres series, repeticiones, indicaciones de peso y excepciones de las fotos: búlgaras/zancadas por pierna; femorales con reducción de peso; sillón de cuádriceps con la indicación adicional al fallo; planchas de 45 segundos por tres series. Esas indicaciones de carga no son recomendaciones personalizadas y se acompañan de un aviso profesional.
- Las imágenes originales y referencias por ejercicio muestran cómo se hace. No se asignan videos a variantes nuevas sin comprobar correspondencia; el administrador puede agregarlos.
- Para Tonificar, reemplazar solo las miniaturas/referencias de los seis ejercicios del lunes con los videos específicos elegidos por la usuaria; dejar las láminas originales ampliables y conservar todo martes-viernes y Adelgazar tal como está. La migración transaccional persistente se ejecuta una sola vez sobre el medio de esos seis IDs, para que las ediciones administrativas posteriores no se sobrescriban. La administración conserva el control de sus enlaces y miniaturas.
- La siguiente actualización añade solo los cinco videos aportados para el martes de Tonificar, con su miniatura y una migración independiente de una sola ejecución sobre los cinco IDs de ese día. Conserva la dosis de 3 series de 10 repeticiones, la lámina original, todos los medios del lunes y miércoles-viernes, y el plan Adelgazar. Se mantiene el mismo reproductor y editor administrativo.
- La actualización del miércoles incorpora los seis videos indicados por la usuaria para los IDs existentes de ese día, con miniatura y una migración transaccional independiente. Mantiene sus cantidades, 45 segundos de plancha, lámina original, portada y todos los demás días y planes. Se reutilizan el reproductor con respaldo externo y la edición administrativa existentes, sin cambiar sesiones ni historial.
- Para el jueves se incorporan los cinco videos elegidos por la usuaria, con miniaturas y una migración independiente de una sola ejecución. Se conservan nombres, IDs, orden, 3 series de 10 repeticiones, lámina original y todo el resto de Tonificar y Adelgazar. El reproductor y su respaldo externo permanecen iguales; no se modifican sesiones ni historial.
- Para el viernes se incorporan los cinco videos indicados, con miniaturas y migración independiente limitada a `tone-d5-e1` a `tone-d5-e5`. Se mantiene su dosificación original, en particular 15 repeticiones de hip thrust. La sexta ficha, Pantorrillas de pie, queda intacta porque no se envió video; no se cambia ningún otro día, portada ni historial. Se conserva el respaldo externo y el editor administrativo.
- El IFrame API oficial detecta errores de YouTube y ofrece abrir el mismo video en YouTube como respaldo, sin alterar el progreso. El éxito de inicialización no se presenta como éxito de reproducción; el entorno de prueba devuelve 150 al reproducir, incluido el control del lunes. El soporte de errores no cambia ningún enlace ni ficha de los otros días.
- Las fotos no especifican semanas, descansos ni cardio. El ciclo de seguimiento de cuatro semanas es una organización de la app, no una dosificación de la fuente. El descanso inicial ajustable de 90 segundos se identifica como opción de la app y no como dato de las láminas; no se agrega cardio obligatorio ni niveles ficticios. Sábado y domingo no tienen sesión en Tonificar.
- La selección de otro plan no borra ni reinicia sesiones; regresar permite continuar. Cada inscripción conserva su fecha de inicio y progreso. Una inscripción nueva propone el próximo lunes (el mismo día si es lunes), modificable antes de registrar progreso, para no crear pendientes anteriores a su elección. El cambio de plan debe evitar mezclar el estado de un guardado en curso.

## Arquitectura y datos

React/Express existentes continúan en el mismo servidor y MySQL administrado. Un modelo compartido de plan envuelve las rutinas originales y admite ejercicios con cantidades específicas. Las APIs de autenticación actuales siguen intactas. Nuevas tablas de catálogo, inscripciones y progreso por plan se agregan de forma idempotente. Los datos actuales de `fit_progress` permanecen intactos y se tratan como Adelgazar; los demás programas se guardan con `(user_id, plan_id, day_key)`. No se elimina ni reemplaza la base existente. El catálogo conserva posteriores ediciones administrativas y valida IDs, colores, URLs, días y cantidades en servidor.

El cartel inferior de la biblioteca se convertirá en una acción para diseñar/editar un único Plan Personal por cuenta. Un catálogo compartido `shared/exercise-library.ts` agrupa ejercicios por músculo (pecho, espalda, hombros, brazos, piernas, glúteos, aductores/abductores, pantorrillas y core); el usuario selecciona días de lunes a domingo, incorpora ejercicios permitidos y configura series (1–10) y repeticiones (1–100), con 3 × 10 como valor inicial. La API reconstruye los ejercicios desde el catálogo validado: el navegador no puede elegir otro propietario, portada, URL, ID ni rol. El servidor persiste cada Plan Personal dentro del catálogo existente con `owner_user_id`, ID aleatorio globalmente único y un índice único de propietario; las consultas globales excluyen esas filas y las rutas ordinarias solo las devuelven al dueño. Se reutilizan matrícula, selección activa y progreso por pareja usuario/plan; guardar la rutina la selecciona y abre la experiencia existente. Al comenzar progreso se protege la estructura para no desalinear registros anteriores. El Plan Personal usa una portada estándar compartida, color propio y modo de series directas; no inventa videos ni cardio.

Cada día seleccionado admite entre 1 y 20 ejercicios, sin duplicados dentro del día, y permite ordenarlos. La plancha se configura por duración de 1–3600 segundos, con 30 segundos iniciales y 3 series. Los días sin ejercicios quedan libres. La creación y actualización son transaccionales; edición y primer progreso bloquean la misma fila para que una sesión no se guarde contra una versión antigua. Antes de registrar actividad se permite modificar la rutina; después se conserva su estructura y se puede seguir entrenando o ajustar el descanso desde el reloj existente.

El inicio de sesión o registro es la primera pantalla y la única ruta de la app disponible sin una cuenta autenticada. Tras autenticar, se abre la biblioteca de planes; entrenamiento, programa, historial, ajustes y administración requieren sesión. El servidor también protege el catálogo para que no se pueda listar por API sin autenticación. La sesión persistida permite volver a la app sin iniciar sesión repetidamente; al cerrar sesión, se regresa al acceso. Administración conserva además su control de rol. Las APIs privadas aíslan datos por usuario autenticado y plan solicitado. La administración tiene vistas de usuarios filtradas por plan y gestión de catálogo: tarjetas, nombre, descripción, color, imagen, días y ejercicios. Los planes nuevos se pueden preparar en borrador antes de mostrarlos; los identificadores de ejercicios son estables para no alterar historias.

## Estructura del proyecto

- `shared/programs.ts`: tipos, catálogo inicial Adelgazar/Tonificar y helpers de dosificación, días, series y progreso esperado.
- `shared/exercise-library.ts`: grupos musculares, catálogo tipado de ejercicios y constructor/validador del Plan Personal.
- `shared/routine.ts` y `shared/video-alternatives.ts`: datos originales de Adelgazar, sin cambios de orden o cantidades.
- `client/src/contexts/FitContext.tsx`: cuenta, catálogo, plan activo, inscripciones, progreso y selección persistente.
- `client/src/pages/Plans.tsx`: pantalla de selección y continuación mostrada después de autenticarse.
- `client/src/pages/PersonalPlanBuilder.tsx`: selección de días, grupos, ejercicios, series y repeticiones; guarda/edita el plan propio.
- `client/src/pages/Home.tsx`: entrenamiento del plan seleccionado, series, demostraciones, reloj y estrellas.
- `Program.tsx`, `Progress.tsx`, `Settings.tsx`: programa, historial y preferencias conscientes del plan.
- `client/src/pages/PlanAdmin.tsx`: creación/edición de catálogo desde formularios, protegida por rol.
- `server/fit-plans.ts`: nuevas APIs del catálogo y progreso, con validación y autorización.
- `server/fit-plan-db.ts`: columna/índice de propietario aditivos, operaciones de catálogo global o propio, inscripciones y progreso; sin leer ni escribir filas privadas ajenas.
- `client/public/plans/tonificar/`: referencias optimizadas a partir de las láminas aportadas; los originales no se sobrescriben.

## Diseño

Se conserva el sistema visual fitness editorial: tipografía Manrope/DM Sans, blanco amplio, curvas suaves y bloques de acento. La biblioteca se presenta con dos tarjetas amplias de portada, una introducción breve y un acceso inmediato para continuar, en lugar de una lista técnica. Cada tarjeta muestra días, estructura y procedencia; el color acompaña botones, progreso y cabecera del entrenamiento. El plan activo aparece siempre identificado y hay un acceso visible para cambiarlo. La selección confirma qué datos se conservan. Móvil usa una columna, controles táctiles y referencias ampliables; las estrellas y transiciones respetan movimiento reducido.

La opción 2, Tonificar / Fuerza + control, recibe una portada fotográfica original de entrenamiento de fuerza, horizontal, sin texto incrustado y en tonos violeta. Los rótulos existentes de la tarjeta se conservan. La imagen generada sustituye solo `coverImage`, con persistencia idempotente de una sola ejecución; no se reemplazan láminas de ejercicio ni se modifica el plan Adelgazar.

La opción 1, Adelgazar / Fuerza + movimiento, también recibe una portada fotográfica original: entrenamiento dinámico con mancuernas en rosa/fucsia, composición horizontal 3:2 y espacio para el título y número existentes. Se sustituye únicamente `coverImage`, con una migración independiente de una sola ejecución que respeta futuras ediciones administrativas. Se conservan íntegros todos los ejercicios, videos, niveles, progreso y el plan Tonificar.

El constructor reutiliza el lenguaje visual de los dos planes y crea tarjetas/timer en color teal propio para Plan Personal. En celular primero se elige el día, luego se abre un grupo muscular y se agregan ejercicios; una bandeja persistente permite ajustar dosis y confirmar. Si un ejercicio aún no tiene video o lámina específica, muestra sus indicaciones y un estado explícito en lugar de presentar una imagen genérica como si fuera demostración.

## Limitaciones explícitas

El historial antiguo corresponde exclusivamente a Adelgazar. Las láminas no incluyen enlaces de video ni una prescripción de descanso; se usan sus ilustraciones como demostración y el reloj configurable como ayuda. Las gráficas muestran cumplimiento de entrenamiento, no resultados corporales ni garantías de adelgazamiento o tonificación.
