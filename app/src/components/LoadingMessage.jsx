function LoadingMessage({ message = 'Loading...' }) {
  return (
    <div className="notice notice-loading" role="status">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export default LoadingMessage;
