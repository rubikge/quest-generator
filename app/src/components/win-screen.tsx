export function WinScreen({ message }: { message: string | null }) {
  return (
    <div className="panel">
      <h2 data-testid="win" className="msg-ok">
        🎉 Quest complete — you win!
      </h2>
      <p>{message ?? 'Report accepted. Humanity is saved!'}</p>
    </div>
  );
}
