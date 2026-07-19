import Razorpay from 'razorpay';
const razorpay = new Razorpay({
  key_id: "rzp_live_T9VYFGs0wv50Fc",
  key_secret: "yG4z16yoBijp6qLM4hlvpC0y"
});
razorpay.orders.create({amount: 100, currency: "INR"}).then(console.log).catch(console.error);
