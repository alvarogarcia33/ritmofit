#!/usr/bin/env python3
"""Extract the Ritmo Fit routine catalog and original PDF media.

The exercise links are ordered from pypdf annotation rectangles by visual
position: y descending in PDF coordinates (top, middle, bottom), then x
ascending. Media is matched to the same link rectangle in PyMuPDF by overlap
so the exported thumbnails retain the embedded play overlay and original
framing.
"""
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Any

from pypdf import PdfReader

try:
    import pymupdf as fitz  # PyMuPDF >= 2
except ImportError:  # pragma: no cover - compatibility with older installs
    import fitz  # type: ignore


PDF_NOTES = [
    {
        "kind": "exception",
        "text": (
            "Principiante, explicación de la página 20: el desplante fijo con "
            "salto se indica por 30 segundos por pierna, aunque la tabla general "
            "de principiante marca 10–12 repeticiones."
        ),
    },
    {
        "kind": "contradiction",
        "text": (
            "Intermedio, explicación de la página 20: los desplantes fijos en "
            "Smith aparecen como 12–25 repeticiones, en contradicción con la "
            "tabla general de intermedio que marca 12–15."
        ),
    },
    {
        "kind": "omission",
        "text": (
            "Sprint a toda velocidad en caminadora: el PDF no especifica una "
            "duración exacta ni añade una intensidad máxima; se conserva solo "
            "como ejercicio del catálogo."
        ),
    },
]

# Ordered by the visual columns/blocks in each weekly page. The source PDF
# uses one 4-exercise beginner block, one 3-exercise intermediate block, and
# one 2-exercise advanced block.
PAGE_EXERCISES: dict[int, list[list[str]]] = {
    22: [
        [
            "Sentadilla Goblet",
            "Desplante fijo con salto",
            "Extensión de cuádriceps",
            "Sentadilla con toque de rodilla",
        ],
        [
            "Desplantes fijos en Smith",
            "Saltos en sentadilla",
            "Búlgara (enfoque en cuádriceps)",
        ],
        ["Desplantes caminando", "Desplante con codo cruzado"],
    ],
    23: [
        ["Press militar", "Burpees", "Máquina predicador", "Kick back"],
        ["Copa 2 manos", "Jumping jacks", "Elevaciones laterales"],
        ["Martillos con cuerda en polea", "Lagartijas con salto"],
    ],
    24: [
        [
            "Hip thrust",
            "Sentadilla con toque de pie",
            "Curl femoral sentado",
            "Saltos pequeños en rebote de sentadilla",
        ],
        ["Curl femoral acostado", "Jumping Jack con sentadilla", "Peso muerto"],
        ["Escalón con mancuernas", "Desplante con rodillazo"],
    ],
    25: [
        [
            "Jalón frontal con barra",
            "Planchas tocando hombros",
            "Remo horizontal",
            "Mountain climbers",
        ],
        ["Pull over", "Mountain climbers codo", "Agarre supino máquina Smith"],
        ["Jalón frontal agarre neutro", "Mountain climbers + burpee"],
    ],
    26: [
        [
            "Hip thrust",
            "Saltos de sentadilla lado a lado",
            "Sentadilla profunda en Smith",
            "Saltos en sentadilla",
        ],
        [
            "Desplante con rodillazo al frente en Smith",
            "Sentadilla con doble jumping Jack",
            "Abducción en máquina",
        ],
        ["Curl femoral sentado", "Desplante lateral con salto"],
    ],
    27: [
        [
            "Abdominales en banco declinado lado a lado",
            "Bicicletas",
            "Sprint a toda velocidad en caminadora",
            "Plancha alta tocando puntas de los pies",
        ],
        ["V ups", "Mountain climber zancada completa", "Frog crunch"],
        ["Elevaciones de rodillas colgado", "Plancha invertida con elevación de piernas"],
    ],
    28: [
        [
            "Prensa pies a la altura de tus hombros",
            "Saltos en sentadilla laterales",
            "Extensión de cuádriceps 1 pierna",
            "Sentadilla + desplante",
        ],
        ["Hip thrust", "Sentadilla con pies cruzados", "Sentadilla sumo"],
        ["Peso muerto 1 pierna", "Salto en sentadilla + sentadilla lateral"],
    ],
    29: [
        [
            "Curl 21 con barra",
            "Burpee abriendo piernas",
            "Extensión con barra en polea",
            "Rodilla – medio burpee",
        ],
        [
            "Elevaciones frontales en polea",
            "Mountain climbers + burpee",
            "Copa 1 mano en polea",
        ],
        ["Elevaciones laterales en máquina", "Burpees"],
    ],
    30: [
        [
            "Hip thrust 1 pierna",
            "Desplante con patada de glúteo",
            "Prensa pies arriba",
            "Desplante lateral con salto",
        ],
        ["Abductores en máquina", "Desplante con rodillazo", "Patada de glúteos en polea"],
        ["Búlgara enfocada en glúteos", "Salto en sentadilla + sentadilla lateral"],
    ],
    31: [
        [
            "Remo agarre supino en polea con barra",
            "Medio burpee con toques de talones",
            "Agarre prono máquina Smith",
            "Encogimientos laterales parado codo rodilla unilateral",
        ],
        ["Remo con mancuernas", "Máquina de abdomen", "Alabanzas en polea"],
        ["Dominadas", "Crunch piernas flexionadas"],
    ],
    32: [
        [
            "Sentadilla libre",
            "Sentadilla con toque y salto",
            "Prensa horizontal 1 pierna",
            "Rebotes en sentadilla adelante y atrás",
        ],
        ["Peso muerto", "Saltos en sumo", "Hip thrust"],
        ["Abductor unilateral en polea (pierna estirada)", "Sentadilla con toque cruzado"],
    ],
    33: [
        [
            "Crunch sobre pelota",
            "Plancha alta con toques al hombro",
            "Sprint a toda velocidad en caminadora",
            "Sentadilla lado a lado toque trasero",
        ],
        ["Elevación de rodillas alternadas en silla romana", "Plancha con saltos", "Alabanzas en polea"],
        ["Elevaciones de rodillas colgado", "Burpees"],
    ],
}

DAY_META = [
    ("Lunes", "Cuádriceps", "Tren inferior · enfocado más en cuádriceps"),
    ("Martes", "Brazos y hombros", "Tren superior · brazos y hombros"),
    ("Miércoles", "Glúteos y femorales", "Tren inferior · enfocado más en glúteos y femorales"),
    ("Jueves", "Espalda y abdomen", "Abdomen y tren superior (espalda)"),
    ("Viernes", "Pierna completa", "Tren inferior · pierna completa"),
    ("Sábado", "Abdomen y cardio", "Abdomen y cardio"),
]

# Compound exercises are explicitly marked in their short safety tip so the
# UI can reinforce that the linked demonstration should be followed.
COMBINED_NAMES = {
    "Sentadilla con toque de rodilla",
    "Desplante fijo con salto",
    "Desplante con codo cruzado",
    "Lagartijas con salto",
    "Sentadilla con toque de pie",
    "Saltos pequeños en rebote de sentadilla",
    "Jumping Jack con sentadilla",
    "Planchas tocando hombros",
    "Mountain climbers codo",
    "Mountain climbers + burpee",
    "Saltos de sentadilla lado a lado",
    "Desplante con rodillazo al frente en Smith",
    "Sentadilla con doble jumping Jack",
    "Desplante con rodillazo",
    "Abdominales en banco declinado lado a lado",
    "Plancha alta tocando puntas de los pies",
    "Mountain climber zancada completa",
    "Plancha invertida con elevación de piernas",
    "Sentadilla + desplante",
    "Salto en sentadilla + sentadilla lateral",
    "Sentadilla con pies cruzados",
    "Burpee abriendo piernas",
    "Rodilla – medio burpee",
    "Desplante con patada de glúteo",
    "Desplante lateral con salto",
    "Sentadilla con toque y salto",
    "Rebotes en sentadilla adelante y atrás",
    "Saltos en sumo",
    "Sentadilla con toque cruzado",
    "Plancha alta con toques al hombro",
    "Sentadilla lado a lado toque trasero",
    "Plancha con saltos",
    "Medio burpee con toques de talones",
}


def tip_for(name: str) -> str:
    """Return a short, non-prescriptive technique reminder for an exercise."""
    lower = name.lower()
    if name in COMBINED_NAMES:
        return "Combinado: mira el video y une cada fase con control; aterriza suave si hay salto."
    if "sprint" in lower:
        return "Mantén el tronco estable y detén la velocidad si pierdes control; el PDF no fija duración."
    if "plancha" in lower:
        return "Activa abdomen y glúteos, mantén la espalda neutra y apoya las manos bajo los hombros."
    if "crunch" in lower or "abdominal" in lower or "bicicleta" in lower or "v ups" in lower:
        return "Mueve el tronco desde el abdomen sin tirar del cuello y exhala al cerrar."
    if "mountain" in lower:
        return "Mantén hombros sobre las manos y lleva las rodillas sin perder la línea de la espalda."
    if "curl femoral" in lower:
        return "Alinea la rodilla con el eje de la máquina y vuelve despacio sin despegar la cadera."
    if "sentadilla" in lower or "prensa" in lower or "hip thrust" in lower:
        return "Apoya todo el pie, sigue la línea de las rodillas y usa un rango que controles."
    if "desplante" in lower or "búlgara" in lower or "escalón" in lower:
        return "Apoya el pie completo, mantén la rodilla alineada y controla la bajada."
    if "peso muerto" in lower or "remo" in lower or "jalón" in lower or "pull over" in lower or "dominada" in lower:
        return "Mantén la espalda neutra, acerca los hombros a las costillas y evita tirar con impulso."
    if "elevaciones" in lower or "martillos" in lower or "copa" in lower or "press" in lower or "lagartijas" in lower:
        return "Mantén muñecas neutrales, hombros lejos de las orejas y detén el movimiento si molesta."
    if "abduc" in lower or "patada" in lower or "alabanzas" in lower:
        return "Mantén la pelvis estable y realiza el recorrido sin balancear el cuerpo."
    if "saltos" in lower or "salto" in lower or "burpee" in lower or "rebote" in lower:
        return "Aterriza suave con rodillas flexionadas y reduce el impacto si pierdes control."
    if "remo" in lower:
        return "Mantén la espalda neutra y acerca los codos al cuerpo sin usar impulso."
    return "Muévete despacio, mantén una postura estable y detén el ejercicio si aparece dolor."


def annotation_links(reader_page: Any) -> list[dict[str, Any]]:
    """Read URI annotations and order them by pypdf PDF rectangle position."""
    found: list[dict[str, Any]] = []
    for annotation in reader_page.get("/Annots", []) or []:
        obj = annotation.get_object()
        action = obj.get("/A") or {}
        uri = action.get("/URI")
        rect = obj.get("/Rect")
        if not uri or not rect:
            continue
        values = [float(value) for value in rect]
        found.append({"uri": str(uri), "rect": values})
    # In pypdf/PDF coordinates, y grows upward: max y of the rect is highest
    # on the page, so descending y gives the visual top-to-bottom order.
    found.sort(key=lambda item: (-item["rect"][3], item["rect"][0]))
    return found


def rect_from_pypdf(rect: list[float], page_height: float) -> Any:
    """Convert a PDF bottom-left rectangle to PyMuPDF top-left coordinates."""
    x0, y0, x1, y1 = rect
    # A few PDF producers serialize the upper Y before the lower Y. Normalize
    # both variants before converting from bottom-left to top-left coordinates.
    y_top, y_bottom = max(y0, y1), min(y0, y1)
    return fitz.Rect(x0, page_height - y_top, x1, page_height - y_bottom)


def image_for_link(page: Any, target: Any) -> int:
    """Find the embedded image whose display rectangle overlaps the link."""
    best: tuple[float, int] | None = None
    for image in page.get_images(full=True):
        xref = int(image[0])
        for image_rect in page.get_image_rects(xref):
            intersection = image_rect & target
            score = intersection.get_area()
            # Prefer images that actually cover the target; the image itself
            # is usually inset by ~1–2 points from the link annotation.
            if score > 0:
                candidate = (score, xref)
                if best is None or candidate[0] > best[0]:
                    best = candidate
    if best is None:
        raise RuntimeError(f"No embedded image overlaps link rectangle {target}")
    return best[1]


def quote(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def make_routine_ts(records: list[dict[str, Any]], level_video: str | None) -> str:
    lines: list[str] = [
        "export type Level = 'beginner' | 'intermediate' | 'advanced';",
        "",
        "export const LEVELS: Record<Level, {",
        "  label: string;",
        "  rounds: number;",
        "  reps: string;",
        "  restSeconds: number;",
        "  cardioMinutes: number;",
        "  blocks: number;",
        "}> = {",
        "  beginner: { label: 'Principiante', rounds: 5, reps: '10–12', restSeconds: 120, cardioMinutes: 25, blocks: 1 },",
        "  intermediate: { label: 'Intermedio', rounds: 4, reps: '12–15', restSeconds: 90, cardioMinutes: 35, blocks: 2 },",
        "  advanced: { label: 'Avanzado', rounds: 3, reps: '18–20', restSeconds: 60, cardioMinutes: 45, blocks: 3 },",
        "};",
        "",
        "export type Exercise = {",
        "  id: string;",
        "  name: string;",
        "  videoUrl: string;",
        "  thumbnail: string;",
        "  block: number;",
        "  tips: string;",
        "};",
        "",
        "export type RoutineDay = {",
        "  day: number;",
        "  label: string;",
        "  focus: string;",
        "  subtitle: string;",
        "  page: number;",
        "  exercises: Exercise[];",
        "};",
        "",
        "export const WARMUP_LOWER = 'https://vimeo.com/755401745';",
        "export const WARMUP_UPPER = 'https://vimeo.com/812688551';",
        "export const STRETCH = 'https://vimeo.com/812692488';",
        f"export const LEVEL_VIDEO = {quote(level_video or '')};",
        "",
        "export const PDF_NOTES = [",
    ]
    for note in PDF_NOTES:
        lines.append(f"  {{ kind: {quote(note['kind'])}, text: {quote(note['text'])} }},")
    lines += ["];", ""]

    for week_key, week_label in (("first", "1–2"), ("second", "3–4")):
        lines.append(f"const {week_key.title()}Week: RoutineDay[] = [")
        for day_index, (label, focus, subtitle) in enumerate(DAY_META, start=1):
            page_number = 21 + (day_index if week_key == "first" else 6 + day_index)
            page_records = [r for r in records if r["page"] == page_number]
            lines += [
                "  {",
                f"    day: {day_index},",
                f"    label: {quote(label)},",
                f"    focus: {quote(focus)},",
                f"    subtitle: {quote(subtitle)},",
                f"    page: {page_number},",
                "    exercises: [",
            ]
            for record in page_records:
                lines += [
                    "      {",
                    f"        id: {quote(record['id'])},",
                    f"        name: {quote(record['name'])},",
                    f"        videoUrl: {quote(record['videoUrl'])},",
                    f"        thumbnail: {quote(record['thumbnail'])},",
                    f"        block: {record['block']},",
                    f"        tips: {quote(record['tips'])},",
                    "      },",
                ]
            lines += ["    ],", "  },"]
        lines += ["];", ""]
    lines += ["export const ROUTINE: Record<'first' | 'second', RoutineDay[]> = {", "  first: FirstWeek,", "  second: SecondWeek,", "};", ""]
    return "\n".join(lines)


def extract(args: argparse.Namespace) -> None:
    source = Path(args.pdf).expanduser().resolve()
    root = Path(args.project).expanduser().resolve()
    exercise_dir = root / "client/public/exercises"
    exercise_dir.mkdir(parents=True, exist_ok=True)
    (root / "scripts").mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, root / "client/public/programa-perdida-de-peso.pdf")

    reader = PdfReader(str(source))
    doc = fitz.open(str(source))
    records: list[dict[str, Any]] = []
    for page_number in range(22, 34):
        names = PAGE_EXERCISES[page_number]
        annotations = annotation_links(reader.pages[page_number - 1])
        if len(annotations) != 9:
            raise RuntimeError(f"Page {page_number}: expected 9 URI annotations, got {len(annotations)}")
        page = doc[page_number - 1]
        if sum(len(block) for block in names) != 9:
            raise RuntimeError(f"Page {page_number}: expected 9 exercise names")
        flat_names = [(block_no, name) for block_no, block in enumerate(names, start=1) for name in block]
        for index, ((block, name), annotation) in enumerate(zip(flat_names, annotations), start=1):
            target = rect_from_pypdf(annotation["rect"], float(reader.pages[page_number - 1].mediabox.height))
            xref = image_for_link(page, target)
            media = doc.extract_image(xref)
            from PIL import Image
            import io
            image = Image.open(io.BytesIO(media["image"])).convert("RGB")
            file_name = f"p{page_number}-e{index}.png"
            image.save(exercise_dir / file_name, format="PNG", optimize=True)
            records.append(
                {
                    "id": f"p{page_number}-e{index}",
                    "page": page_number,
                    "block": block,
                    "name": name,
                    "videoUrl": annotation["uri"],
                    "thumbnail": f"/exercises/{file_name}",
                    "tips": tip_for(name),
                }
            )

    # The weekly banner is the 909x219 image at the top of the exercise pages.
    banner_xref = None
    for image in doc[21].get_images(full=True):
        if int(image[2]) == 909 and int(image[3]) == 219:
            banner_xref = int(image[0])
            break
    if banner_xref is None:
        raise RuntimeError("Could not find the 909x219 weekly banner")
    from PIL import Image
    import io
    banner = Image.open(io.BytesIO(doc.extract_image(banner_xref)["image"])).convert("RGB")
    banner.save(exercise_dir / "program-banner.png", format="PNG", optimize=True)

    level_video = None
    page_19_links = annotation_links(reader.pages[18])
    if page_19_links:
        level_video = page_19_links[0]["uri"]

    routine_path = root / "shared/routine.ts"
    routine_path.parent.mkdir(parents=True, exist_ok=True)
    routine_path.write_text(make_routine_ts(records, level_video), encoding="utf-8")
    print(json.dumps({
        "pages": 12,
        "exercises": len(records),
        "levelVideo": level_video,
        "thumbnails": len(list(exercise_dir.glob("p*-e*.png"))),
        "banner": str(exercise_dir / "program-banner.png"),
        "routine": str(routine_path),
    }, ensure_ascii=False, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", default="/home/ubuntu/upload/Perdidadepeso(1).pdf")
    parser.add_argument("--project", default="/home/ubuntu/ritmofit")
    args = parser.parse_args()
    extract(args)


if __name__ == "__main__":
    main()
