export default function LoadingState({ label = 'Loading', fullPage = false }) {
  return (
    <div className={`loading-state${fullPage ? ' full-page' : ''}`} role="status">
      <span className="spinner" />
      {label}
    </div>
  );
}
