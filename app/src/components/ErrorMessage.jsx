function ErrorMessage({ message }) {
  if (!message) {
    return null;
  }

  return (
    <div className="notice notice-error" role="alert">
      <span aria-hidden="true">!</span>
      <span>{message}</span>
    </div>
  );
}

export default ErrorMessage;
