export const environment = {
  production: false,
  apiUrlAuth: '/api/auth',
  apiUrlProperties: '/api/property',
  apiUrlSearch: '/api/search',
  apiUrlNotifications: '/api/notifications',
  googleMapsApiKey: 'YOUR_API_KEY_HERE',
  geoSearchValues: {
    defaultRadiusKm: 50,
    maxRadiusKm: 150,
    minRadiusKm: 1
  },
  defaultPageSize: 20,
  notificationPollingIntervalMs: 5 * 60 * 1000
};
