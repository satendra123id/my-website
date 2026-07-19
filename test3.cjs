const Razorpay = require('razorpay');
const razorpay = new Razorpay({
  key_id: "rzp_live_T9JX6rNwr0VmQV",
  key_secret: "adminpassword123"
});
razorpay.orders.create({amount: 100, currency: "INR"}).then(console.log).catch(console.error);
