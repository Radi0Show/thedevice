


export const FPS = 30;
export const MS_PER_FRAME = 1000 / FPS;



export function drain(accumulatorMs, elapsedMs, maxSteps = 5) {
  let acc = accumulatorMs + elapsedMs;
  let steps = 0;

  while (acc >= MS_PER_FRAME && steps < maxSteps) {
    acc -= MS_PER_FRAME;
    steps += 1;
  }

  if (steps === maxSteps && acc >= MS_PER_FRAME) {
    acc = 0;
  }

  return { steps, accumulator: acc };
}
