const getBaseUrl = () => {
  if (typeof window !== 'undefined' && window.appConfig && window.appConfig.serviceBaseUrl) {
    return window.appConfig.serviceBaseUrl;
  }
  return 'http://localhost:3001';
};

export const fetchWorkers = async (token) => {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/get-workers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ Token: token }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch workers: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

export const updateSkills = async (workerSids, action, skill, token) => {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/update-skills`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ workerSids, action, skill, Token: token }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update skills: ${response.status} ${response.statusText}`);
  }

  return response.json();
};
