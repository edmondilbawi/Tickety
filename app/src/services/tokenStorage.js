const TOKEN_KEY = 'ticketyToken';

const getAuthToken = () => localStorage.getItem(TOKEN_KEY);

const setAuthToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export { clearAuthToken, getAuthToken, setAuthToken };
