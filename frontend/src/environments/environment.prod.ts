export const environment = {
  production: true,
  apiUrlAuth: 'http://localhost:3001/api',
  apiUrlProperties: 'http://localhost:3002/api',
  apiUrlSearch: 'http://localhost:3003/api',
  apiUrlUser: 'http://localhost:3004/api',
  apiUrlNotifications: 'http://localhost:3005/api',
  googleMapsApiKey: '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',
  geoSearchValues: {
    defaultRadiusKm: 50,
    maxRadiusKm: 150,
    minRadiusKm: 1
  },
  defaultPageSize: 20,
  notificationPollingIntervalMs: 5 * 60 * 1000
};
