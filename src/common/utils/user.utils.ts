/**
 * Strip password from a user-like object. Use when returning user data in API responses.
 */
export function stripPasswordFromUser<T extends Record<string, unknown>>(
  user: T | null | undefined,
): Omit<T, 'password'> | undefined {
  if (user == null || typeof user !== 'object') return undefined;
  const { password: _password, ...rest } = user;
  return rest as Omit<T, 'password'>;
}

/**
 * Return a copy of an entity that has a nested `user` property, with user.password removed.
 */
export function sanitizeUserInEntity<T extends { user?: unknown }>(entity: T): T {
  if (entity.user != null && typeof entity.user === 'object' && 'password' in entity.user) {
    const safeUser = stripPasswordFromUser(entity.user as Record<string, unknown>);
    return { ...entity, user: safeUser } as T;
  }
  return entity;
}
