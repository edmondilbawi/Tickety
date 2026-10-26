function StatusBadge({ status }) {
  const labels = {
    pending: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
  };

  return (
    <span className={`status-badge status-${status}`}>
      {labels[status] || status}
    </span>
  );
}

export default StatusBadge;
