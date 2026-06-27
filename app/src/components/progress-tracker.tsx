export function ProgressTracker({ current, solved }: { current: number; solved: number[] }) {
  return (
    <div className="progress" data-testid="progress">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className={`step ${solved.includes(n) ? 'done' : n === current ? 'current' : ''}`} data-testid={`step-${n}`} />
      ))}
    </div>
  );
}
