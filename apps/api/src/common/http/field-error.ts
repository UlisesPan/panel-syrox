/** Error asociado a un campo del formulario (el front lo muestra debajo del input correspondiente). */
export const fieldError = (path: string, message: string) => ({ message, errors: [{ path, message }] });
