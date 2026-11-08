# Ritmo Fit · Biblioteca de planes

## Alcance autorizado

La app evoluciona de una rutina única a varios planes. El plan actual se identifica como **Adelgazar**, conserva el PDF, las 108 fichas, niveles, videos, series y el historial ya registrado. Se incorpora **Tonificar** a partir de las cinco láminas aportadas, con 28 ejercicios de lunes a viernes. Una pantalla inicial permite elegir planes con imágenes y colores propios. Se podrá crear y editar contenido de planes futuros desde administración sin modificar código.

## Decisiones de producto y fuente

- Adelgazar sigue en rosa/fucsia. Tonificar usa violeta; cada plan futuro tiene un color configurable.
- Tonificar conserva orden, nombres, tres series, repeticiones, indicaciones de peso y excepciones de las fotos: búlgaras/zancadas por pierna; femorales con reducción de peso; sillón de cuádriceps con la indicación adicional al fallo; planchas de 45 segundos por tres series. Esas indicaciones de carga no son recomendaciones personalizadas y se acompañan de un aviso profesional.
- Las imágenes originales y referencias por ejercicio muestran cómo se hace. No se asignan videos a variantes nuevas sin comprobar correspondencia; el administrador puede agregarlos.
- Las fotos no especifican semanas, descansos ni cardio. El ciclo de seguimiento de cuatro semanas es una organización de la app, no una dosificación de la fuente. El descanso inicial ajustable de 90 segundos se identifica como opción de la app y no como dato de las láminas; no se agrega cardio obligatorio ni niveles ficticios. Sábado y domingo no tienen sesión en Tonificar.
- La selección de otro plan no borra ni reinicia sesiones; regresar permite continuar. Cada inscripción conserva su fecha de inicio y progreso. Una inscripción nueva propone el próximo lunes (el mismo día si es lunes), modificable antes de registrar progreso, para no crear pendientes anteriores a su elección. El cambio de plan debe evitar mezclar el estado de un guardado en curso.

## Arquitectura y datos

React/Express existentes continúan en el mismo servidor y MySQL administrado. Un modelo compartido de plan envuelve las rutinas originales y admite ejercicios con cantidades específicas. Las APIs de autenticación actuales siguen intactas. Nuevas tablas de catálogo, inscripciones y progreso por plan se agregan de forma idempotente. Los datos actuales de `fit_progress` permanecen intactos y se tratan como Adelgazar; los demás programas se guardan con `(user_id, plan_id, day_key)`. No se elimina ni reemplaza la base existente. El catálogo conserva posteriores ediciones administrativas y valida IDs, colores, URLs, días y cantidades en servidor.

Una API pública devuelve el catálogo publicado; la selección/inscripción requiere usuario y contraseña. Las APIs privadas aíslan datos por usuario autenticado y plan solicitado. Administración tiene vistas de usuarios filtradas por plan y gestión de catálogo: tarjetas, nombre, descripción, color, imagen, días y ejercicios. Los planes nuevos se pueden preparar en borrador antes de mostrarlos; los identificadores de ejercicios son estables para no alterar historias.

## Estructura del proyecto

- `shared/programs.ts`: tipos, catálogo inicial Adelgazar/Tonificar y helpers de dosificación, días, series y progreso esperado.
- `shared/routine.ts` y `shared/video-alternatives.ts`: datos originales de Adelgazar, sin cambios de orden o cantidades.
- `client/src/contexts/FitContext.tsx`: cuenta, catálogo, plan activo, inscripciones, progreso y selección persistente.
- `client/src/pages/Plans.tsx`: pantalla inicial de selección y continuación.
- `client/src/pages/Home.tsx`: entrenamiento del plan seleccionado, series, demostraciones, reloj y estrellas.
- `Program.tsx`, `Progress.tsx`, `Settings.tsx`: programa, historial y preferencias conscientes del plan.
- `client/src/pages/PlanAdmin.tsx`: creación/edición de catálogo desde formularios, protegida por rol.
- `server/fit-plans.ts`: nuevas APIs del catálogo y progreso, con validación y autorización.
- `server/fit-plan-db.ts`: tablas aditivas, catálogo persistente y almacenamiento de inscripciones/progreso.
- `client/public/plans/tonificar/`: referencias optimizadas a partir de las láminas aportadas; los originales no se sobrescriben.

## Diseño

Se conserva el sistema visual fitness editorial: tipografía Manrope/DM Sans, blanco amplio, curvas suaves y bloques de acento. La biblioteca se presenta con dos tarjetas amplias de portada, una introducción breve y un acceso inmediato para continuar, en lugar de una lista técnica. Cada tarjeta muestra días, estructura y procedencia; el color acompaña botones, progreso y cabecera del entrenamiento. El plan activo aparece siempre identificado y hay un acceso visible para cambiarlo. La selección confirma qué datos se conservan. Móvil usa una columna, controles táctiles y referencias ampliables; las estrellas y transiciones respetan movimiento reducido.

## Limitaciones explícitas

El historial antiguo corresponde exclusivamente a Adelgazar. Las láminas no incluyen enlaces de video ni una prescripción de descanso; se usan sus ilustraciones como demostración y el reloj configurable como ayuda. Las gráficas muestran cumplimiento de entrenamiento, no resultados corporales ni garantías de adelgazamiento o tonificación.
