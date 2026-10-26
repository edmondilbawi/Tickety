function EmptyState({ title = 'Nothing here yet', children, icon = null }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">{icon}</span>
      <h2>{title}</h2>
      {children && <div className="empty-state-copy">{children}</div>}
    </div>
  );
}

export default EmptyState;
