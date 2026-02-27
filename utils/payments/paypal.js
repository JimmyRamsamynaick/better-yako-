const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');

function environment() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const sandbox = process.env.PAYPAL_ENV !== 'live';
  return sandbox
    ? new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret)
    : new checkoutNodeJssdk.core.LiveEnvironment(clientId, clientSecret);
}

function client() {
  return new checkoutNodeJssdk.core.PayPalHttpClient(environment());
}

async function createOrder({ amount = '4.99', currency = 'EUR', description = 'Yako Bot Premium Key' } = {}) {
  const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
  request.headers['prefer'] = 'return=representation';
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: { currency_code: currency, value: amount },
      description
    }],
    application_context: {
      brand_name: 'Yako Bot',
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW',
      return_url: process.env.PAYPAL_RETURN_URL || 'https://example.com/return',
      cancel_url: process.env.PAYPAL_CANCEL_URL || 'https://example.com/cancel'
    }
  });
  const response = await client().execute(request);
  const approveLink = response?.result?.links?.find(l => l.rel === 'approve')?.href;
  return {
    id: response?.result?.id,
    approveLink
  };
}

module.exports = {
  createOrder
};

