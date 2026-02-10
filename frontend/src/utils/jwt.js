export const getToken = () => {
  return localStorage.getItem('token');
};

export const setToken = (token) => {
  localStorage.setItem('token', token);
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

export const getUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    const parsed = JSON.parse(userStr);
    // Ensure it's an object, not a string or other type
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      console.error('getUser: Invalid user data type, clearing storage');
      localStorage.removeItem('user');
      return null;
    }
    return parsed;
  } catch (error) {
    console.error('getUser: Error parsing user data:', error);
    localStorage.removeItem('user');
    return null;
  }
};

export const setUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const removeUser = () => {
  localStorage.removeItem('user');
};

