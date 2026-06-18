const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export const generateBookingCode = (): string => {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
};

export const validateBookingCode = (code: string): boolean => {
  return /^[A-Z0-9]{6}$/.test(code);
};
