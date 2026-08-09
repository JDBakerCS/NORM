export default function EmptyState({ title, message, children }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">○</span>
      <h2>{title}</h2>
      <p>{message}</p>
      {children}
    </div>
  );
}
