import {Spinner, StatusMessage} from '@inkjs/ui';
import {Box, Text} from 'ink';
import {useEffect, useState} from 'react';

export interface Step {
  label: string;
  run: () => Promise<void>;
}

interface StepRunnerProps {
  steps: Step[];
  onComplete?: () => void;
  onError?: (error: Error, stepLabel: string) => void;
}

export default function StepRunner({steps, onComplete, onError}: StepRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [error, setError] = useState<{message: string; step: string} | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done || error || currentIndex >= steps.length) return;

    const step = steps[currentIndex]!;
    let cancelled = false;

    (async () => {
      try {
        await step.run();
        if (cancelled) return;
        setCompletedSteps((prev) => [...prev, step.label]);
        if (currentIndex + 1 >= steps.length) {
          setDone(true);
          onComplete?.();
        } else {
          setCurrentIndex((i) => i + 1);
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setError({message, step: step.label});
        onError?.(err instanceof Error ? err : new Error(message), step.label);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentIndex, done, error]);

  return (
    <Box flexDirection="column" paddingTop={1}>
      {completedSteps.map((label) => (
        <StatusMessage key={label} variant="success">
          {label}
        </StatusMessage>
      ))}

      {!done && !error && currentIndex < steps.length && (
        <Spinner label={steps[currentIndex]!.label} />
      )}

      {error && (
        <Box flexDirection="column">
          <StatusMessage variant="error">{error.step}</StatusMessage>
          <Box marginLeft={2} marginTop={1}>
            <Text color="red">{error.message}</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
