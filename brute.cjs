const https = require('https');

const id_base = 'rzp_live_T9VYFGs0wv50Fc';
const id_vars = [
  'rzp_live_T9VYFGs0wv50Fc',
  'rzp_live_T9VYFGsOwv50Fc',
  'rzp_live_T9VYFGs0wv5OFc',
  'rzp_live_T9VYFGsOwv5OFc',
  'rzp_live_T9VYFGs0wvS0Fc',
];

const secret_base = 'yG4z16yoBijp6qLM4hlvpC0y';
const secret_vars = [
  'yG4z16yoBijp6qLM4hlvpC0y',
  'yG4zl6yoBijp6qLM4hlvpC0y',
  'yG4zI6yoBijp6qLM4hlvpC0y',
  'yG4z16yoB1jp6qLM4hlvpC0y',
  'yG4z16yoBljp6qLM4hlvpC0y',
  'yG4z16yoBIjp6qLM4hlvpC0y',
  'yG4z16yoBujp6qLM4hlvpC0y',
  'yG4z16yo8ijp6qLM4hlvpC0y',
  'yG4z16yoBijpGqLM4hlvpC0y',
  'yG4z16yoBijp6qLM4hlvpCOy',
  'yG4z16yoBijp6qLM4hIvpC0y',
  'yG4z16yoBijp6qLM4h1vpC0y',
  'yG4z16yoBijp6qLM4hIvpC0y',
  'yG4z16yoBijp6qLM4h1vpC0y',
];

async function check(id, secret) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.razorpay.com',
      port: 443,
      path: '/v1/orders',
      method: 'POST',
      auth: id + ':' + secret,
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        resolve({ code: res.statusCode, body });
      });
    });
    req.write(JSON.stringify({amount: 100, currency: 'INR'}));
    req.end();
  });
}

async function run() {
  for (const id of id_vars) {
    for (const secret of secret_vars) {
      const res = await check(id, secret);
      if (res.code !== 401) {
        console.log("FOUND IT!", id, secret, res);
        return;
      }
    }
  }
  console.log("No valid combination found");
}

run();
