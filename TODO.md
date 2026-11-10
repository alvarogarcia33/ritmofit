# Entregables de Ritmo Fit

## 1. Rutina del PDF y demostraciones originales

- [x] La app debe ajustarse únicamente a la rutina “Pérdida de Peso” del PDF; no debe incluir ni ofrecer otras rutinas por ahora.
- [x] Debe cubrir el ciclo de semanas 1–2 y 3–4, de lunes a sábado, con domingo de descanso.
- [x] Debe mostrar el split del PDF: lunes tren inferior enfocado en cuádriceps; martes tren superior, brazos y hombros; miércoles tren inferior enfocado en glúteos y femorales; jueves abdomen y tren superior/espalda; viernes pierna completa; sábado abdomen y cardio.
- [x] Debe incluir los ejercicios y super series de cada día y bloque de semanas tal como aparecen en el PDF, junto con las demostraciones originales enlazadas desde el documento.
- [x] Debe reflejar los niveles del PDF: principiante realiza la serie 1; intermedio, las series 1 y 2; avanzado, las series 1, 2 y 3.
- [x] Debe aplicar los parámetros del nivel: principiante 5 rondas, 10–12 repeticiones, descanso de 2 minutos y 25 minutos de cardio; intermedio 4 rondas, 12–15 repeticiones, descanso de 1:30 y 35 minutos de cardio; avanzado 3 rondas, 18–20 repeticiones, descanso de 1 minuto y 45 minutos de cardio.
- [x] Debe proporcionar temporizadores prácticos de descanso y cardio configurados según el nivel elegido, sin añadir ejercicios ni rutinas ajenos al PDF.

## 2. Cuentas, acceso y privacidad de progreso

- [x] La persona debe poder registrarse e iniciar sesión con usuario y contraseña.
- [x] La base de datos debe guardar las cuentas y el progreso individual de cada persona registrada; cada persona solo puede consultar y actualizar sus propios datos.
- [x] El acceso administrativo debe estar protegido por rol; una cuenta normal no debe poder abrir ni consultar el panel de administración.
- [x] Los datos y contraseñas deben manejarse de manera segura y persistente en la base de datos del proyecto.

## 3. Registro de sesiones y avance personal

- [x] Cada persona debe poder elegir su nivel y ver la rutina diaria correspondiente.
- [x] La sesión debe permitir marcar los ejercicios y series completados, guardar avances parciales y reanudar la rutina.
- [x] Al completar una serie, una sesión o la meta correspondiente, debe mostrarse una animación de estrella.
- [x] La vista personal debe mostrar el historial, cumplimiento y avance dentro del ciclo de cuatro semanas.

## 4. Recordatorios de rutina atrasada

- [x] La app debe identificar las sesiones programadas que ya quedaron pendientes y mostrar recordatorios de rutina atrasada para la persona correspondiente. Se calculan según fecha de inicio, horario y zona horaria, dentro de la app; la interfaz aclara que no se envían correos ni notificaciones push cuando está cerrada.

## 5. Administración y edición de contenido

- [x] Un panel de administración protegido debe permitir consultar usuarios registrados individualmente y visualizar su progreso mediante gráficas de cumplimiento.
- [x] El panel debe incluir un mecanismo para editar el contenido de la rutina existente —por ejemplo, texto del ejercicio y enlace de demostración— sin modificar archivos de código; esto no debe habilitar una segunda rutina en esta etapa.

## 6. Interfaz y marca

- [x] La app debe ser práctica, dinámica, adaptable a móvil y escritorio, y estar redactada en español.
- [x] Debe analizar y conservar el tono del PDF: blanco, rosa claro, rosa medio y fucsia, con bloques de color por nivel y titulares de alto contraste.

## 7. Demostraciones de ejercicio reproducibles

- [x] Para 91 movimientos distintos (106 de 108 fichas), el reproductor integra la alternativa de YouTube y conserva el Vimeo original como referencia. Los dos movimientos restantes tienen su enlace YouTube externo, claramente señalado porque no permite inserción. No se cambiaron nombres, ejercicios, orden, series, repeticiones ni calendario de la rutina.
- [x] Verificar con el IFrame API en Chromium con referente web cada video que se ofrece como reproducción integrada; etiquetar las demos externas sin atribuirlas a la autora del PDF. Los 91 enlaces insertables se validaron así; los dos que devuelven Error 150 se ofrecen solo como enlaces externos.
- [x] Agregar los siete enlaces proporcionados por la usuaria y conservar sus URLs en las fichas: Sentadilla con toque de rodilla — https://www.youtube.com/shorts/X0yrW-ta5b0; Desplante con codo cruzado — https://www.youtube.com/watch?v=LGlgmlCkuWg&pp=ygUaRGVzcGxhbnRlIGNvbiBjb2RvIGNydXphZG8%3D; Hip thrust — https://www.youtube.com/shorts/pSwLdoIwPik; Curl femoral sentado — https://www.youtube.com/shorts/VzXQuzPJwHU; Remo horizontal — https://www.youtube.com/shorts/iyh2wbpqlNY?feature=share; Pull over — https://www.youtube.com/shorts/rRZ8hhpKozA?feature=share; Agarre supino máquina Smith — https://www.youtube.com/watch?v=iGt14SeaOeQ&pp=ygUcQWdhcnJlIHN1cGlubyBtw6FxdWluYSBzbWl0aA%3D%3D.
- [x] Incorporar las 19 de las 21 nuevas alternativas proporcionadas por la usuaria que YouTube permite insertar: Sentadilla con doble jumping Jack — https://www.youtube.com/shorts/K-lxz2kSoR0; Bicicletas — https://www.youtube.com/shorts/XTzt-nekQh4?feature=share; Sprint a toda velocidad en caminadora — https://www.youtube.com/shorts/0fYVFELOyRI?feature=share; Plancha alta tocando puntas de los pies — https://www.youtube.com/shorts/VSCWAVQhQdk; V ups — https://www.youtube.com/shorts/saHkR_MvIdA; Mountain climber zancada completa — https://www.youtube.com/watch?v=kLh-uczlPLg&pp=ygUhTW91bnRhaW4gY2xpbWJlciB6YW5jYWRhIGNvbXBsZXRh0gcJCSkMAYcqIYzv; Prensa pies a la altura de tus hombros — https://www.youtube.com/shorts/B6ncs6zWsIo?feature=share; Sentadilla + desplante — https://www.youtube.com/shorts/kTETkyhfOM8?feature=share; Sentadilla con pies cruzados — https://youtu.be/_wucwNLt9h4?t=18; Salto en sentadilla + sentadilla lateral — https://www.youtube.com/shorts/WhwK4abpoD4; Rodilla – medio burpee — https://www.youtube.com/shorts/B_M3o3T1YFY; Medio burpee con toques de talones — https://www.youtube.com/shorts/U41BnapyufE; Agarre prono máquina Smith — https://www.youtube.com/watch?v=f4zUg5CAnNY&pp=ygUbQWdhcnJlIHByb25vIG3DoXF1aW5hIHNtaXRo; Alabanzas en polea — https://www.youtube.com/shorts/xYIVO1nCm3E?t=6&feature=share; Sentadilla con toque y salto — https://www.youtube.com/shorts/u22GCGFa00w; Rebotes en sentadilla adelante y atrás — https://www.youtube.com/shorts/F43lMNff864; Sentadilla con toque cruzado — https://www.youtube.com/shorts/c1OqCwe2eOs; Sentadilla lado a lado toque trasero — https://www.youtube.com/watch?v=JEu3HxYrGSc&pp=ygUkU2VudGFkaWxsYSBsYWRvIGEgbGFkbyB0b3F1ZSB0cmFzZXJv; Elevación de rodillas alternadas en silla romana — https://www.youtube.com/shorts/G_xkqJkTxOg.
- [x] Conservar los dos videos nuevos que respondieron con Error 150 como enlaces externos a YouTube, no como reproductores integrados: Sentadilla sumo — https://www.youtube.com/shorts/gdfmmOq-Ypw?feature=share; Crunch piernas flexionadas — https://www.youtube.com/shorts/js5_QOy2PL8. En el modal se informa que YouTube no permite la reproducción insertada y se conserva el Vimeo original como referencia.

## Evidencia de implementación

El catálogo contiene 12 días distintos y 108 fichas con 108 miniaturas originales. La revisión de solo lectura comprobó que los 108 enlaces coinciden con las anotaciones del PDF. La app tiene 6 rutas de página declaradas en `/manus-routes.json`, verificadas por HTTP; `/api/health` devuelve 200. Las APIs de progreso y administración rechazan acceso anónimo con 401; la autorización y el ownership se comprueban en el servidor.

`pnpm check`, `pnpm test` (20 pruebas en 5 archivos) y `pnpm build` finalizaron correctamente con 93 alternativas/referencias: 91 insertables y dos enlaces externos por Error 150. Las 19 nuevas URLs con evento `onReady` en Chromium se integraron; los dos casos bloqueados ofrecen enlace a YouTube fuera del reproductor. El test cubre las 93 entradas, las URLs que indicó la usuaria y la conservación de los Vimeo originales. La revisión independiente anterior no encontró defectos críticos; se corrigieron sus observaciones: estrella para cada serie y navegación reactiva por query/historial. Las sesiones guardan su nivel histórico y fecha de cumplimiento. La cuenta administrativa se creó por CLI, no mediante un registro público, y sus credenciales permanecen fuera del repositorio.

## 8. Biblioteca de planes y selección visual

- [x] Mostrar una pre pantalla con Adelgazar y Tonificar, imágenes de referencia y colores diferentes, solo después de iniciar sesión o crear una cuenta. Adelgazar mantiene rosa/fucsia y Tonificar usa violeta. Permitir regresar a esta pantalla para cambiar de plan.
- [x] La primera pantalla de la app debe ser iniciar sesión/crear cuenta. Sin sesión no se puede abrir la biblioteca, rutina, historial, ajustes ni administración; solo el acceso. Tras iniciar sesión, abrir la biblioteca de planes. Los endpoints del catálogo y contenido también requieren autenticación. Al cerrar sesión, regresar al acceso. La sesión persistente permite volver a la biblioteca en futuras visitas.
- [x] Persistir el plan activo por usuario registrado; el progreso requiere usuario y contraseña.
- [x] Cambiar de plan no elimina ni sobreescribe el historial ni avances del anterior. Mostrar el plan activo en las páginas y separar sesiones, fechas de inicio, recordatorios y gráficas por plan.

## 9. Tonificar a partir de las láminas

- [x] Incorporar las cinco láminas como un plan de lunes a viernes con 28 ejercicios: lunes glúteos y femorales (6), martes espalda y bíceps (5), miércoles cuádriceps y pantorrillas (6), jueves hombro/pecho/tríceps (5), viernes pierna completa (6).
- [x] Mantener tres series y las repeticiones/indicaciones específicas de cada ejercicio. Respetar planchas de 45 segundos x 3, repeticiones por pierna, cargas progresivas/sostenibles, femorales con reducción a la mitad y la indicación adicional del sillón de cuádriceps; no confundirlas con super series por nivel del PDF.
- [x] Mostrar las imágenes de referencia de las láminas y permitir ampliarlas al consultar la técnica. Conservar el material original sin sobrescribirlo.
- [x] Mantener opciones de serie y ejercicio realizado, sesión parcial reanudable, estrella por cumplimiento, temporizador de descanso y tiempo de plancha, historial, pendientes y gráficas. No agregar cardio obligatorio ni niveles no especificados para Tonificar.
- [x] Indicar expresamente que las cuatro semanas de seguimiento y el descanso inicial configurable de 90 segundos son opciones organizativas de la app porque las imágenes no prescriben duración del ciclo ni descanso. Sábado/domingo sin sesión.

## 10. Datos, administración y planes futuros

- [x] Aplicar solo migraciones aditivas. Los registros existentes de `fit_progress` corresponden a Adelgazar y deben quedar intactos; nuevos planes tienen aislamiento por usuario, plan y día en tablas separadas.
- [x] El panel admin permite consultar gráficos e historial de cada usuario filtrados por plan, sin datos ficticios, y conserva el editor anterior de Adelgazar.
- [x] Proporcionar formularios admin para crear/editar planes futuros: nombre, descripción, color, imagen de referencia, días y ejercicios con cantidades. Los nuevos planes se pueden guardar en borrador y solo publicados aparecen en la biblioteca; no se habilita edición directa de código.
- [x] No permitir acceso administrativo a usuarios normales ni acceso al progreso de otros usuarios mediante cambios de IDs.

Los criterios anteriores que limitaban la versión a una sola rutina describen la versión inicial; quedan ampliados expresamente por la solicitud del 8 de noviembre. La estructura y dosificación original de Adelgazar no se cambian.

## Evidencia de la ampliación multi-plan

La revisión independiente de solo lectura confirmó la transcripción de las 28 fichas, sus cantidades y días; también verificó aislamiento por usuario/plan, calendario sin sábado/domingo de Tonificar y reloj basado en tiempo real. Se corrigieron los rechazos de IDs existentes en el editor, los inputs de URLs relativas, el modo protegido de Adelgazar y los borradores incompletos. Una sesión cumplida requiere confirmación explícita para retirar su estrella al corregir series/cardio; cambiar de plan no modifica ninguna finalización. No se permite ocultar un plan con historial ni alterar su dosificación en uso. Los niveles se presentan solamente en planes de super series.

El inicio de una nueva inscripción propone el próximo lunes (o el actual si es lunes), ajustable antes de registrar progreso, para evitar atrasos retroactivos. El catálogo persistente conserva ediciones administrativas; las APIs de catálogo público excluyen borradores. Las imágenes de futuros planes se indican mediante rutas/URLs duraderas en el editor. Tonificar usa las láminas como referencia, sin asignar videos de variantes no comprobadas.

`pnpm check`, `pnpm test` (34 pruebas en 8 archivos) y `pnpm build` finalizaron correctamente. El catálogo real devuelve Adelgazar y Tonificar; 143 referencias locales comprobadas existen, con 33 assets nuevos optimizados de Tonificar. `/api/health`, las nueve rutas del manifiesto y las referencias WebP responden 200. Las APIs privadas rechazan acceso anónimo con 401 y las pruebas verifican rechazo de una cuenta normal en administración.

Antes y después del arranque aditivo, los 2 registros existentes de `fit_progress` conservan exactamente la misma huella SHA-256; permanecen las 5 cuentas existentes. No se crearon usuarios de prueba ni se modificaron registros personales durante las verificaciones.

## Evidencia de acceso obligatorio · 8 de noviembre

La entrada a `/` y una visita directa a `/planes` muestran iniciar sesión/crear cuenta en la comprobación móvil de Preview; no se renderizan las tarjetas de planes sin cuenta. Todas las páginas salvo `/acceso` están envueltas en la guardia de sesión, incluidos enlaces con semana/día y rutas desconocidas. Login y registro redirigen a `/planes`; logout regresa a `/acceso` y limpia el catálogo/progreso en memoria. La selección local antigua de invitado ya no se utiliza.

Las APIs de catálogo `/api/fit/plans` y contenido `/api/fit/content` requieren autenticación y devuelven 401 sin sesión, al igual que estado, progreso y administración. Una petición privada con sesión expirada elimina la credencial cliente y vuelve al acceso; una contraseña equivocada mantiene el formulario de login. La sesión válida continúa usando la cookie segura y las sesiones MySQL existentes. No se cambiaron tablas ni registros de usuarios o progreso.

La revisión independiente de solo lectura confirmó el flujo de la guardia, la carga de `/me` antes del catálogo y la redirección tras autenticar. TypeScript, la suite existente y las pruebas específicas de autenticación completaron correctamente; el build también finalizó correctamente. Se añadió prueba que rechaza catálogo anónimo antes de consultar su almacenamiento y pruebas del manejo de sesión expirada, contraseña incorrecta y sesión válida.

## Videos de Tonificar · lunes

- [x] Sustituir en las seis fichas del lunes las imágenes de ejercicio por miniaturas de video reproducible y conectar al reproductor estos enlaces: Hip thrust — https://www.youtube.com/shorts/zaSzxo6xleY?feature=share; Búlgaras — https://www.youtube.com/shorts/cytfxsIK_Hk; Peso muerto — https://www.youtube.com/shorts/QjP9g7M_Idg; Patada en polea a 45° — https://www.youtube.com/shorts/-YgMavu-_XQ; Femorales — https://www.youtube.com/shorts/nmqG-tIr0hc; Plancha frontal — https://www.youtube.com/shorts/XCOq6lfsFAk. Mantener las fichas, nombres, series y repeticiones; no cambiar imágenes ni videos de martes a viernes ni los del programa Adelgazar. Conservar las láminas como referencia original y hacer editables los videos desde la administración ya existente.

### Evidencia de videos de Tonificar · 10 de noviembre

Los seis enlaces resolvieron con metadatos públicos de YouTube y los seis reproductores YouTube IFrame API se inicializaron en Chromium sin errores de inserción; las miniaturas de `i.ytimg.com` y los videos aparecen solo en la sesión del lunes. El formulario de administración conserva campos editables de URL de video y miniatura.

Una migración transaccional única (`tonificar-monday-videos-2026-11-10`, versión 1) aplicó los seis enlaces al registro persistente de Tonificar. La consulta de solo lectura confirmó los seis IDs, URLs y miniaturas en la base del plan; conserva 3 series, repeticiones, duración de plancha y la ruta de cada lámina original. Los planes no se recrearon; el resto del payload del plan y las tablas de progreso quedan fuera de la migración. `pnpm check`, `pnpm test` (39 tests en 9 archivos), `pnpm build` y `git diff --check` finalizaron correctamente; Preview devuelve HTTP 200 en `/api/health`.
