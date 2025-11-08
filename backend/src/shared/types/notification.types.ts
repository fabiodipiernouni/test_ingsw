export const NOTIFICATION_TYPES = [
  'new_property_match_saved_search',
  'promotional_message',
  'visit_status_update',
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];
