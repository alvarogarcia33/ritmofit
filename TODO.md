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

## Evidencia de implementación

El catálogo contiene 12 días distintos y 108 fichas con 108 miniaturas originales. La revisión de solo lectura comprobó que los 108 enlaces coinciden con las anotaciones del PDF. La app tiene 6 rutas de página declaradas en `/manus-routes.json`, verificadas por HTTP; `/api/health` devuelve 200. Las APIs de progreso y administración rechazan acceso anónimo con 401; la autorización y el ownership se comprueban en el servidor.

`pnpm check`, `pnpm test` (14 pruebas en 4 archivos) y `pnpm build` finalizaron correctamente. La revisión independiente no encontró defectos críticos y se corrigieron sus dos observaciones: estrella para cada serie añadida y navegación reactiva por query/historial. Las sesiones guardan su nivel histórico y fecha de cumplimiento. La cuenta administrativa se creó por CLI, no mediante un registro público, y sus credenciales permanecen fuera del repositorio.
