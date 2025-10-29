export const USER_ROLES = ['client', 'agent', 'admin', 'owner'] as const;
export type UserRole = typeof USER_ROLES[number];