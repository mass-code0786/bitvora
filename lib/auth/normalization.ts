export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const normalizeUserUid = (uid: string) => uid.trim().toUpperCase();
export const USER_UID_PATTERN = /^BV\d{6}$/;
export const isValidUserUid = (uid: string) => USER_UID_PATTERN.test(normalizeUserUid(uid));
