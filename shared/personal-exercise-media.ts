import type { Exercise } from "./routine";
import { getVideoEmbedUrl } from "./video";
import { PERSONAL_TECHNIQUE_GUIDES } from "./personal-technique-guides";

/**
 * Editorially approved demonstrations from the shared catalog.
 * Videos are linked, never copied or hosted by Ritmo Fit.
 */
export type PersonalExerciseMedia = {
  exerciseId: string;
  videoUrl: string;
  credit: string;
};

export function catalogExerciseId(exerciseId: string): string | null {
  const match = /^pp-d[1-7]-([a-z0-9-]+)$/.exec(exerciseId);
  return match ? match[1] : null;
}

export function personalDemoThumbnail(rawUrl: string): string {
  const embed = getVideoEmbedUrl(rawUrl);
  if (!embed?.startsWith("https://www.youtube-nocookie.com/embed/"))
    return "";
  const id = embed.split("/embed/")[1]?.split("?")[0];
  return id && /^[A-Za-z0-9_-]{11}$/.test(id)
    ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    : "";
}

/**
 * Render live editorial media without changing any plan's saved exercises.
 * A change in a demonstration therefore never archives or resets progress.
 */
export function withPersonalDemo(
  exercise: Exercise,
  entries: readonly PersonalExerciseMedia[]
): Exercise {
  const exerciseId = catalogExerciseId(exercise.id);
  const demo = exerciseId
    ? entries.find(item => item.exerciseId === exerciseId)
    : null;
  const guide = exerciseId ? PERSONAL_TECHNIQUE_GUIDES[exerciseId] : undefined;
  if (!demo?.videoUrl || !getVideoEmbedUrl(demo.videoUrl))
    return guide ? { ...exercise, demoGuide: guide } : exercise;
  return {
    ...exercise,
    demoGuide: guide,
    videoUrl: demo.videoUrl,
    thumbnail: personalDemoThumbnail(demo.videoUrl),
    demoCredit: demo.credit,
  };
}
