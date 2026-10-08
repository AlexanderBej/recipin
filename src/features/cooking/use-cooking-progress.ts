import { useEffect, useState } from 'react';

type Progress = {
  steps: string[];
  current: number;
  completed: number[];
  view: 'step' | 'checklist';
};
export function useCookingProgress(recipeId: string, steps: string[]) {
  const key = `foodhub.cooking.${recipeId}`;
  const [progress, setProgress] = useState<Progress>(() => {
    const initial: Progress = { steps, current: 0, completed: [], view: 'step' };
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null');
      if (!saved || JSON.stringify(saved.steps) !== JSON.stringify(steps)) return initial;
      return {
        steps,
        current: Number.isInteger(saved.current)
          ? Math.max(0, Math.min(steps.length - 1, saved.current))
          : 0,
        completed: Array.isArray(saved.completed)
          ? [
              ...new Set<number>(
                saved.completed.filter(
                  (index: unknown) =>
                    typeof index === 'number' &&
                    Number.isInteger(index) &&
                    index >= 0 &&
                    index < steps.length,
                ),
              ),
            ]
          : [],
        view: saved.view === 'checklist' ? 'checklist' : 'step',
      };
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(progress));
    } catch {
      /* Cooking remains usable when storage is unavailable. */
    }
  }, [key, progress]);
  return {
    ...progress,
    setView: (view: Progress['view']) => setProgress((previous) => ({ ...previous, view })),
    move: (direction: number) =>
      setProgress((previous) => ({
        ...previous,
        current: Math.max(0, Math.min(steps.length - 1, previous.current + direction)),
      })),
    toggle: (index: number) =>
      setProgress((previous) => ({
        ...previous,
        completed: previous.completed.includes(index)
          ? previous.completed.filter((step) => step !== index)
          : [...previous.completed, index],
      })),
    restart: () => setProgress((previous) => ({ ...previous, current: 0, completed: [] })),
  };
}
