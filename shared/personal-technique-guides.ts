/**
 * Original, brief technique cues for the exact 74 Plan Personal exercises.
 * They are educational guidance, not a prescription, diagnosis or video.
 */
export type TechniqueGuide = {
  setup: string;
  movement: string;
  avoid: string;
};

/** Keys deliberately match the stable shared catalog IDs. */
export const PERSONAL_TECHNIQUE_GUIDES: Record<string, TechniqueGuide> = {
  "press-pecho-maquina": {
    setup: "Ajustá el asiento para que las manijas queden aproximadamente a la altura del pecho; apoyá espalda y pies.",
    movement: "Empujá hacia adelante sin bloquear bruscamente los codos y regresá con control.",
    avoid: "No despegues la espalda del respaldo ni dejes que los hombros se eleven.",
  },
  "flexiones-brazos": {
    setup: "Ubicá las manos ligeramente más abiertas que los hombros y alineá cabeza, tronco y piernas.",
    movement: "Flexioná los codos para acercar el pecho al suelo; empujá manteniendo el cuerpo estable.",
    avoid: "Evitá que la cadera se hunda o que los codos se abran de forma excesiva.",
  },
  "press-plano-barra": {
    setup: "Apoyá cabeza, espalda y pies; tomá la barra con un agarre estable y muñecas alineadas.",
    movement: "Bajá la barra de forma controlada hacia el pecho y empujá siguiendo una trayectoria cómoda.",
    avoid: "No rebotes la barra sobre el pecho; utilizá soportes o asistencia adecuados.",
  },
  "press-plano-mancuernas": {
    setup: "Acostate en el banco con pies firmes y mancuernas al lado del pecho.",
    movement: "Empujá las mancuernas hacia arriba y bajalas lentamente en un recorrido estable.",
    avoid: "No dejes caer los brazos por debajo de un rango que tus hombros controlen.",
  },
  "press-inclinado-barra": {
    setup: "Colocá el banco con inclinación moderada, pies firmes y muñecas alineadas con la barra.",
    movement: "Bajá hacia la parte superior del pecho y empujá de manera controlada.",
    avoid: "No exageres el arco lumbar ni conviertas el movimiento en un press vertical.",
  },
  "press-inclinado-mancuernas": {
    setup: "Ajustá un banco inclinado y sostené las mancuernas a ambos lados del pecho superior.",
    movement: "Presioná hacia arriba manteniendo control de ambos brazos y descendé sin golpes.",
    avoid: "No choques las mancuernas ni fuerces una apertura dolorosa de hombros.",
  },
  "aperturas-mancuernas": {
    setup: "Acostate en un banco con las mancuernas sobre el pecho y una ligera flexión de codos.",
    movement: "Abrí los brazos en arco hasta un estiramiento cómodo y regresá por el mismo trayecto.",
    avoid: "No conviertas las aperturas en un press ni bajes más allá de tu movilidad.",
  },
  "cruce-poleas": {
    setup: "Ajustá ambas poleas a una altura compatible con el cruce elegido y adoptá una postura estable.",
    movement: "Acercá las manos al frente en un arco suave y regresá lentamente.",
    avoid: "No uses impulso del tronco ni flexiones y extiendas los codos durante todo el recorrido.",
  },
  "jalon-polea-agarre-v": {
    setup: "Sentate con muslos sujetos y tomá el agarre V; mantené el pecho elevado sin arquear exageradamente.",
    movement: "Llevá los codos hacia abajo y atrás hasta acercar el agarre a la zona alta del pecho.",
    avoid: "No te balancees ni tires detrás de la nuca; controlá el retorno.",
  },
  "dominadas-asistidas": {
    setup: "Elegí una asistencia que te permita controlar la bajada y sujetá la barra con seguridad.",
    movement: "Elevate llevando los codos hacia las costillas y descendé progresivamente.",
    avoid: "No patees para impulsarte ni relajes los hombros de golpe al bajar.",
  },
  "remo-maquina-pecho-apoyado": {
    setup: "Ajustá asiento y apoyo para mantener el pecho apoyado y alcanzar las manijas sin encorvarte.",
    movement: "Llevá los codos hacia atrás y acercá las manijas al torso con control.",
    avoid: "No despegues el pecho para mover más peso ni encojas los hombros.",
  },
  "jalon-al-pecho": {
    setup: "Sentate estable, asegurá los muslos y agarrá la barra en una amplitud cómoda.",
    movement: "Dirigí los codos hacia abajo hasta acercar la barra al pecho superior; regresá despacio.",
    avoid: "No inclines el torso excesivamente ni tires de la barra detrás de la cabeza.",
  },
  "remo-barra": {
    setup: "Flexioná ligeramente las rodillas, incliná el torso desde las caderas y mantené la columna neutra.",
    movement: "Llevá la barra hacia el abdomen mientras sostenés el ángulo del torso.",
    avoid: "No redondees la espalda ni conviertas cada repetición en un tirón con el cuerpo.",
  },
  "remo-mancuerna": {
    setup: "Apoyá una mano y la pierna correspondiente en el banco o adoptá una posición estable.",
    movement: "Tirá de la mancuerna hacia la cadera y bajala sin girar el tronco.",
    avoid: "No eleves el hombro hacia la oreja ni uses rotación para completar el movimiento.",
  },
  "remo-polea-sentado": {
    setup: "Sentate erguido con pies apoyados y brazos extendidos hacia el agarre.",
    movement: "Acercá el agarre al abdomen desplazando los codos hacia atrás.",
    avoid: "No te balancees hacia adelante y atrás para mover la carga.",
  },
  "pullover-polea": {
    setup: "Parate frente a la polea alta, con ligera flexión de codos y tronco estable.",
    movement: "Bajá el agarre en arco hacia los muslos manteniendo casi constante el ángulo de los codos.",
    avoid: "No transformes el movimiento en una extensión de tríceps ni arquees la espalda.",
  },
  "face-pull": {
    setup: "Ajustá una cuerda en polea alta, con pies estables y brazos al frente.",
    movement: "Tirá de la cuerda hacia la cara separando las manos dentro de un rango cómodo.",
    avoid: "No eleves los hombros ni inclines el tronco hacia atrás para compensar.",
  },
  "press-arnold": {
    setup: "Sentate o parate estable; comenzá con las mancuernas frente a los hombros y palmas hacia vos.",
    movement: "Presioná hacia arriba mientras rotás las palmas gradualmente hacia adelante.",
    avoid: "No fuerces la rotación si molesta el hombro ni exageres el arco lumbar.",
  },
  "elevaciones-laterales-polea": {
    setup: "Colocate al lado de la polea baja y sostené el agarre con el brazo ligeramente flexionado.",
    movement: "Elevá el brazo hacia el costado hasta un rango cómodo, y bajá controlando la tensión.",
    avoid: "No te balancees ni encojas el hombro para ganar altura.",
  },
  "press-militar": {
    setup: "Sostené la carga a la altura de los hombros con abdomen activo y pies estables.",
    movement: "Empujá sobre la cabeza siguiendo una trayectoria controlada y bajá hasta los hombros.",
    avoid: "No arquees exageradamente la zona lumbar ni fuerces un rango doloroso.",
  },
  "elevaciones-laterales": {
    setup: "Parate estable con mancuernas a los costados y codos ligeramente flexionados.",
    movement: "Elevá los brazos hacia los lados hasta una altura cómoda y descendé despacio.",
    avoid: "No subas los hombros ni te impulses con las piernas.",
  },
  "elevaciones-frontales": {
    setup: "Sostené mancuernas frente a los muslos con postura neutra y codos suaves.",
    movement: "Elevá los brazos hacia el frente sin balancearte, luego bajá lentamente.",
    avoid: "No te inclines hacia atrás ni eleves por encima de un rango controlado.",
  },
  "pajaros-hombro": {
    setup: "Incliná el torso desde las caderas con espalda neutra y brazos debajo del pecho.",
    movement: "Abrí los brazos hacia los lados con ligera flexión de codos y retorná suavemente.",
    avoid: "No conviertas el gesto en un remo ni encogas el cuello.",
  },
  "curl-biceps-polea-baja": {
    setup: "Parate estable frente a la polea baja con codos cerca del tronco.",
    movement: "Flexioná los codos para acercar el agarre hacia el pecho y extendelos controladamente.",
    avoid: "No adelantes los hombros ni balancees el cuerpo para subir el peso.",
  },
  "curl-inclinado-mancuernas": {
    setup: "Recliná el banco, apoyá la espalda y dejá caer los brazos a los costados.",
    movement: "Flexioná los codos sin adelantar los hombros y descendé lentamente.",
    avoid: "No estires hasta un punto doloroso ni te impulses con la espalda.",
  },
  "curl-barra": {
    setup: "Parate erguido con agarre cómodo y codos cercanos a las costillas.",
    movement: "Flexioná los codos para subir la barra y bajá sin perder el control.",
    avoid: "No arquees la espalda ni balancees la cadera para elevarla.",
  },
  "curl-alterno": {
    setup: "Sostené una mancuerna a cada lado con hombros relajados y tronco estable.",
    movement: "Flexioná un codo por vez, rotando la palma según tu comodidad.",
    avoid: "No gires el tronco ni levantes el hombro del brazo activo.",
  },
  "curl-martillo": {
    setup: "Sostené las mancuernas con palmas enfrentadas y codos próximos al cuerpo.",
    movement: "Llevá las mancuernas hacia los hombros sin cambiar la orientación del agarre.",
    avoid: "No balancees las pesas ni adelantes excesivamente los codos.",
  },
  "curl-concentrado": {
    setup: "Sentate estable, apoyá el brazo de trabajo contra la cara interna del muslo.",
    movement: "Flexioná el codo con el brazo quieto y bajá lentamente.",
    avoid: "No ayudes con el tronco ni despegues el brazo del apoyo.",
  },
  "press-banca-agarre-cerrado": {
    setup: "Acostate con pies firmes y tomá la barra con un agarre algo más cerrado que el habitual, sin forzar muñecas.",
    movement: "Bajá controladamente hacia el pecho y empujá manteniendo codos relativamente cerca del torso.",
    avoid: "No juntes las manos en exceso ni permitas que las muñecas se doblen.",
  },
  "patada-triceps-mancuerna": {
    setup: "Inclinate desde la cadera con espalda neutra y brazo superior cercano al costado.",
    movement: "Extendé el codo hacia atrás sin mover el hombro y regresá controladamente.",
    avoid: "No balancees el brazo completo para generar impulso.",
  },
  "extension-polea": {
    setup: "Parate frente a una polea alta con codos pegados al costado.",
    movement: "Extendé los codos para bajar el agarre y permití un retorno lento.",
    avoid: "No uses el peso del cuerpo ni eleves los codos en cada repetición.",
  },
  "extension-sobre-cabeza": {
    setup: "Sostené la carga sobre o detrás de la cabeza con abdomen estable y codos orientados cómodamente.",
    movement: "Extendé los codos para elevar el peso y volvé con control.",
    avoid: "No arquees la espalda ni fuerces los hombros por detrás de su movilidad.",
  },
  "press-frances": {
    setup: "Acostate en banco con brazos sobre el torso y agarre firme.",
    movement: "Flexioná los codos para bajar la carga cerca de la cabeza y extendelos después.",
    avoid: "No separes en exceso los codos ni dejes caer el peso hacia la cara.",
  },
  "fondos-triceps": {
    setup: "Apoyate de forma estable en paralelas o una máquina asistida con hombros controlados.",
    movement: "Flexioná los codos dentro de un rango cómodo y empujá para regresar.",
    avoid: "No bajes más allá de la tolerancia de los hombros ni te balancees.",
  },
  "sentadilla-hack": {
    setup: "Ajustá la plataforma y el apoyo de la máquina; ubicá pies firmes separados a una distancia cómoda.",
    movement: "Flexioná caderas y rodillas siguiendo la dirección de los pies y volvé con control.",
    avoid: "No rebotes abajo ni despegues la espalda del respaldo.",
  },
  "sentadilla-goblet": {
    setup: "Sostené una mancuerna cerca del pecho y colocá pies firmes en una posición cómoda.",
    movement: "Bajá flexionando caderas y rodillas, y subí presionando el suelo.",
    avoid: "No colapses el tronco hacia adelante ni pierdas contacto con los talones.",
  },
  "sentadilla-libre": {
    setup: "Colocá pies estables y braceá el abdomen antes de iniciar.",
    movement: "Flexioná caderas y rodillas con un rango cómodo y volvé a ponerte de pie.",
    avoid: "No pierdas el control de la espalda ni dejes que las rodillas se desvíen bruscamente.",
  },
  "prensa-piernas": {
    setup: "Ajustá el asiento y ubicá los pies firmes en la plataforma.",
    movement: "Flexioná rodillas dentro de un rango cómodo y extendelas con control.",
    avoid: "No despegues la pelvis del respaldo ni bloquees las rodillas bruscamente.",
  },
  "extension-cuadriceps": {
    setup: "Ajustá la máquina para alinear su eje con la rodilla y apoyá bien la espalda.",
    movement: "Extendé las rodillas contra el rodillo y bajá lentamente.",
    avoid: "No uses impulso ni fuerces un arco que cause molestias en la rodilla.",
  },
  "zancadas": {
    setup: "Adoptá una postura erguida y un paso suficientemente amplio para mantener equilibrio.",
    movement: "Flexioná ambas piernas con control y regresá, alternando según la rutina.",
    avoid: "No golpees la rodilla contra el suelo ni pierdas el equilibrio por apresurarte.",
  },
  "sentadilla-bulgara": {
    setup: "Apoyá el pie trasero sobre un banco bajo y colocá el pie delantero a distancia estable.",
    movement: "Flexioná la rodilla delantera y la cadera, luego empujá sobre el pie delantero para subir.",
    avoid: "No dependas del pie trasero para impulsarte ni uses una separación inestable.",
  },
  "curl-femoral-pie": {
    setup: "Ajustá el rodillo detrás del tobillo y estabilizá la pelvis en la máquina.",
    movement: "Flexioná una rodilla acercando el talón hacia el glúteo y regresá lentamente.",
    avoid: "No arquees la espalda ni balancees la cadera.",
  },
  "curl-femoral-fitball": {
    setup: "Acostate boca arriba con talones sobre la pelota y caderas elevadas.",
    movement: "Acercá la pelota doblando las rodillas, manteniendo la pelvis elevada.",
    avoid: "No dejes caer la cadera ni pierdas el control de la pelota.",
  },
  "peso-muerto-rumano": {
    setup: "Parate con pies estables y carga cerca de los muslos; mantené rodillas ligeramente flexionadas.",
    movement: "Llevá la cadera hacia atrás y deslizá la carga cerca de las piernas antes de volver a extender la cadera.",
    avoid: "No redondees la espalda ni bajes más allá de tu control de movilidad.",
  },
  "curl-femoral-sentado": {
    setup: "Ajustá asiento y rodillos para que la rodilla coincida con el eje de la máquina.",
    movement: "Flexioná las rodillas llevando los tobillos hacia abajo o atrás, según la máquina.",
    avoid: "No levantes la pelvis del asiento ni dejes subir el peso de golpe.",
  },
  "curl-femoral-tumbado": {
    setup: "Acostate boca abajo en la máquina con rodillo sobre la parte baja de las piernas.",
    movement: "Flexioná las rodillas acercando los talones hacia los glúteos y bajá controladamente.",
    avoid: "No arquees la zona lumbar ni despegues las caderas del apoyo.",
  },
  "buenos-dias": {
    setup: "Usá una carga ligera y apoyá la barra estable sobre la espalda alta, pies firmes y rodillas suaves.",
    movement: "Incliná el torso desde las caderas manteniendo la espalda neutra; volvé extendiendo la cadera.",
    avoid: "No redondees la espalda ni intentes bajar más allá de tu control.",
  },
  "pull-through-polea": {
    setup: "Parate de espaldas a una polea baja, con cuerda entre las piernas y pasos hacia adelante.",
    movement: "Llevá la cadera atrás y luego extendela empujando el suelo, sin tirar con los brazos.",
    avoid: "No hiperextiendas la espalda al final ni permitas tirones de la polea.",
  },
  "step-up-banco": {
    setup: "Elegí un banco estable y una altura que permita apoyar el pie completo.",
    movement: "Subí empujando principalmente con el pie de arriba y descendé de forma controlada.",
    avoid: "No te impulses en exceso con la pierna de abajo ni pierdas el equilibrio.",
  },
  "hip-thrust": {
    setup: "Apoyá la parte alta de la espalda contra un banco estable y ubicá los pies debajo de las rodillas aproximadamente.",
    movement: "Elevá la cadera contrayendo glúteos y descendé sin perder el control.",
    avoid: "No hiperextiendas la región lumbar al final ni empujes solo con las puntas de los pies.",
  },
  "puente-gluteos": {
    setup: "Acostate boca arriba con rodillas dobladas y pies apoyados.",
    movement: "Empujá con los pies para elevar la cadera y volvé lentamente.",
    avoid: "No arquees excesivamente la espalda ni desplaces la carga hacia el cuello.",
  },
  "patada-polea": {
    setup: "Ajustá una tobillera a polea baja y sujetate de un apoyo estable.",
    movement: "Extendé la pierna hacia atrás desde la cadera manteniendo el tronco quieto.",
    avoid: "No balancees la pelvis ni eleves la pierna arqueando la espalda.",
  },
  "extension-cadera": {
    setup: "Ajustá el banco para que la cadera pueda flexionarse libremente y mantené los pies firmes.",
    movement: "Enderezá el cuerpo extendiendo la cadera hasta una línea neutra.",
    avoid: "No lleves el tronco más allá de la alineación neutra ni hiperextiendas la espalda.",
  },
  "aduccion-polea-baja": {
    setup: "Sujetá la tobillera a la polea baja y parate de lado con apoyo estable.",
    movement: "Acercá la pierna de trabajo hacia la línea media del cuerpo lentamente.",
    avoid: "No inclines el torso ni permitas que el cable arrastre la pierna.",
  },
  "aduccion-acostado": {
    setup: "Acostate de costado y apoyá la pierna superior por delante para dejar libre la inferior.",
    movement: "Elevá la pierna inferior hacia arriba en un arco pequeño y bajá con control.",
    avoid: "No gires la cadera ni levantes el tronco para compensar.",
  },
  "aductores-maquina": {
    setup: "Sentate erguido, apoyá la espalda y ajustá la apertura inicial sin forzar.",
    movement: "Acercá las piernas contra las almohadillas y regresá lentamente.",
    avoid: "No rebotes en la apertura ni uses una amplitud dolorosa.",
  },
  "clamshell-banda": {
    setup: "Acostate de costado con caderas apiladas, rodillas flexionadas y banda por encima de las rodillas.",
    movement: "Separá la rodilla superior manteniendo juntos los pies y volvé controladamente.",
    avoid: "No rotes todo el tronco ni despegues la pelvis del alineamiento.",
  },
  "elevacion-lateral-acostado": {
    setup: "Acostate de costado con el cuerpo alineado y la pierna superior extendida.",
    movement: "Elevá la pierna superior hacia el techo dentro de un rango cómodo y bajá lento.",
    avoid: "No gires el pie exageradamente hacia arriba ni balancees la cadera.",
  },
  "abductores-maquina": {
    setup: "Sentate firme y ajustá las almohadillas a una apertura inicial cómoda.",
    movement: "Separá las piernas contra la resistencia y regresá con control.",
    avoid: "No uses rebotes ni despegues el tronco del respaldo.",
  },
  "abduccion-polea": {
    setup: "Colocá la tobillera de polea baja, parate de lado y sujetate de un apoyo.",
    movement: "Alejá la pierna del cuerpo manteniendo la pelvis estable.",
    avoid: "No inclines el torso ni arrastres la pierna usando impulso.",
  },
  "caminata-banda": {
    setup: "Colocá una banda alrededor de muslos o tobillos y flexioná suavemente caderas y rodillas.",
    movement: "Da pasos laterales cortos manteniendo tensión constante y pies controlados.",
    avoid: "No arrastres los pies ni permitas que las rodillas colapsen hacia dentro.",
  },
  "pantorrillas-una-pierna": {
    setup: "Apoyate con una mano en algo estable y mantené un pie en el suelo.",
    movement: "Elevá el talón del pie de apoyo y descendé lentamente.",
    avoid: "No rebotes ni pierdas el equilibrio por buscar más altura.",
  },
  "pantorrillas-donkey": {
    setup: "Incliná el torso desde las caderas con apoyo seguro, pies sobre una plataforma estable.",
    movement: "Empujá con la parte delantera de los pies para elevar los talones y bajá controladamente.",
    avoid: "No sacudas la espalda ni uses un rebote rápido en el tobillo.",
  },
  "pantorrillas-de-pie": {
    setup: "Parate con pies firmes y una mano de apoyo si la necesitás.",
    movement: "Elevá los talones llevando el peso sobre la parte delantera del pie y descendé lentamente.",
    avoid: "No te impulses con las rodillas ni rebotes.",
  },
  "pantorrillas-sentado": {
    setup: "Sentate con muslos apoyados y pies sobre la plataforma.",
    movement: "Elevá los talones sin despegar los muslos y descendé con control.",
    avoid: "No uses la espalda para levantar la carga ni rebotes.",
  },
  "pantorrillas-prensa": {
    setup: "Sentate en la prensa con la pelvis apoyada y las puntas de los pies firmes en la plataforma.",
    movement: "Mové los tobillos para empujar la plataforma y regresar sin cambiar el ángulo de las rodillas.",
    avoid: "No bloquees el mecanismo de seguridad ni permitas que los pies resbalen.",
  },
  "plancha-lateral": {
    setup: "Apoyá antebrazo y costado del pie o rodillas, manteniendo hombro sobre el codo.",
    movement: "Elevá la cadera y sostené una línea recta del tronco durante el tiempo indicado.",
    avoid: "No dejes caer la cadera ni contengas la respiración.",
  },
  "crunch-polea-alta": {
    setup: "Arrodillate frente a una polea alta y sujetá la cuerda a ambos lados de la cabeza.",
    movement: "Flexioná el tronco acercando costillas a la pelvis, manteniendo la cadera relativamente quieta.",
    avoid: "No tires solo con los brazos ni conviertas el ejercicio en una flexión completa de cadera.",
  },
  "plancha-frontal": {
    setup: "Apoyá antebrazos y puntas de los pies o rodillas; alineá hombros y cadera.",
    movement: "Sostené el tronco estable mientras respirás de forma normal.",
    avoid: "No hundas la zona lumbar ni empujes la cadera exageradamente hacia arriba.",
  },
  "crunch-abdominal": {
    setup: "Acostate boca arriba con rodillas flexionadas, pies apoyados y cuello relajado.",
    movement: "Elevá ligeramente hombros y pecho acercando costillas a la pelvis; bajá con control.",
    avoid: "No tires del cuello con las manos ni uses impulso.",
  },
  "bicicleta-abdominal": {
    setup: "Acostate boca arriba con manos cerca de la cabeza y piernas elevadas.",
    movement: "Acercá alternadamente un hombro hacia la rodilla contraria mientras extendés la otra pierna.",
    avoid: "No tires de la nuca ni arquees excesivamente la espalda.",
  },
  "elevacion-rodillas": {
    setup: "Sujetate de las barras o apoyos de forma estable, con tronco controlado.",
    movement: "Elevá las rodillas hacia el abdomen sin impulso y descendé lentamente.",
    avoid: "No balancees el cuerpo ni eleves las piernas con tirones.",
  },
  "dead-bug": {
    setup: "Acostate boca arriba con brazos hacia el techo y caderas y rodillas flexionadas.",
    movement: "Extendé lentamente un brazo y la pierna opuesta manteniendo el tronco estable; alterná.",
    avoid: "No arquees la espalda ni dejes que los movimientos sean bruscos.",
  },
};
