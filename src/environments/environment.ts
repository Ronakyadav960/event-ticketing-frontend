// src/environments/environment.ts

export const environment = {
  production: false,

  // 🔗 Backend API base
  apiUrl: 'http://localhost:5000',

  // 🔗 Stripe-related endpoints (used indirectly)
  paymentsApi: 'http://localhost:5000/api/payments',
};
