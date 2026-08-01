export const isAbortError = (error) => {
  const name = String(error?.name || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  return name === 'aborterror' || message.includes('abort');
};

export const getErrorDetails = (error) => {
  if (!error) {
    return { message: 'Error desconocido' };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return {
    name: error.name || undefined,
    message: error.message || String(error),
    code: error.code || undefined,
    details: error.details || undefined,
    hint: error.hint || undefined,
    status: error.status || error.statusCode || undefined,
  };
};
