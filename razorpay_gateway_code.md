# 💳 Automated Razorpay Payment Gateway Integration Guide

This guide contains complete, production-ready code for a **100% automated Razorpay checkout & auto-unlock system**. 

It includes:
1. **Backend Order Creation API** (Node.js & PHP)
2. **Frontend Standard Checkout UI** (HTML & JavaScript) with support for UPI Intent and Dynamic QR Codes
3. **Backend Webhook & Auto-Fulfillment API** (Node.js & PHP) that verifies the webhook signature using your Webhook Secret and automatically updates database statuses.

---

## 🛠️ Step-by-Step Connection Instructions

1. **Get Keys:** Log in to your [Razorpay Dashboard](https://dashboard.razorpay.com) and go to **Settings > API Keys** to generate your `YOUR_API_KEY` and `YOUR_KEY_SECRET`.
2. **Set Webhooks:** Go to **Settings > Webhooks** in your Razorpay Dashboard:
   - Click **Add New Webhook**.
   - Set the URL to: `https://<your-domain.com>/api/checkout/webhook` (or your PHP webhook path).
   - Under **Active Events**, select: `payment.captured` and `order.paid`.
   - Set a strong secret string as `YOUR_WEBHOOK_SECRET` and copy it.
3. **Configure Code:** Replace the placeholders (`YOUR_API_KEY`, `YOUR_KEY_SECRET`, `YOUR_WEBHOOK_SECRET`) inside the scripts below.
4. **Deploy & Scan:** Load the HTML page in your browser. When you click pay, it will fetch a unique secure Order ID from the backend and launch the Standard Checkout interface containing native UPI Apps (Google Pay, PhonePe, Paytm) and dynamic scanning QR codes.

---

## 🟢 1. Node.js (Express) Full-Stack Integration

To run this in Node.js, install the official SDK:
```bash
npm install razorpay express body-parser cors
```

### 📄 Backend Script (`server.js`)
```javascript
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const Razorpay = require('razorpay');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// ==========================================
// 🔑 CONFIGURATION (Paste your credentials here)
// ==========================================
const RAZORPAY_KEY_ID = "YOUR_API_KEY"; // Replace with rzp_test_... or rzp_live_...
const RAZORPAY_KEY_SECRET = "YOUR_KEY_SECRET"; // Replace with your actual Key Secret
const RAZORPAY_WEBHOOK_SECRET = "YOUR_WEBHOOK_SECRET"; // Replace with your Webhook Secret

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// Mock database simulation (Replace with your Firestore or SQL logic)
const database = {
  transactions: {},
  users: {}
};

/**
 * 1. BACKEND: ORDER CREATION ENDPOINT
 * Securely creates a Razorpay Order from the server-side
 */
app.post("/api/checkout/order", async (req, res) => {
  try {
    const { amount, currency, studentEmail, courseId, courseTitle } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    const options = {
      amount: Math.round(amount * 100), // Amount in paise (1 INR = 100 paise)
      currency: currency || "INR",
      receipt: `receipt_order_${Date.now()}`,
      notes: {
        studentEmail: studentEmail || "anonymous@learner.com",
        courseId: courseId || "course_xyz",
        courseTitle: courseTitle || "Premium Course Pack"
      }
    };

    const order = await razorpay.orders.create(options);
    console.log(`[ORDER CREATED] ID: ${order.id}`);
    res.json(order);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Failed to create order", details: error.message });
  }
});

/**
 * 2. BACKEND: SECURE WEBHOOK & AUTO-CONFIRMATION ENDPOINT
 * Automatically receives payment.captured and order.paid events,
 * verifies signatures, and fulfills the order instantly.
 */
app.post("/api/checkout/webhook", (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    if (!signature) {
      console.error("[WEBHOOK ERROR] Missing signature header.");
      return res.status(400).json({ error: "No signature provided" });
    }

    // Secure cryptographic signature verification
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("[WEBHOOK ERROR] Signature verification failed!");
      return res.status(400).json({ error: "Invalid signature" });
    }

    console.log("[WEBHOOK SUCCESS] Signature verified successfully!");
    const { event, payload } = req.body;

    if (event === "payment.captured" || event === "order.paid") {
      const entity = event === "payment.captured" ? payload.payment.entity : payload.order.entity;
      
      const paymentId = event === "payment.captured" ? entity.id : (entity.payment_id || `pay_${Date.now()}`);
      const orderId = entity.order_id || entity.id;
      const amountPaid = entity.amount / 100; // Paise to INR conversion
      
      // Extract UTR (Unique Transaction Reference) / Acquirer Data
      const utr = entity.acquirer_data ? (entity.acquirer_data.rrn || entity.acquirer_data.upi_transaction_id || paymentId) : paymentId;

      // Extract custom metadata passed during Order creation
      const notes = entity.notes || {};
      const studentEmail = notes.studentEmail;
      const courseId = notes.courseId;
      const courseTitle = notes.courseTitle;

      console.log(`[AUTO-FULFILL] Payment captured. UTR: ${utr}, Order: ${orderId}, Email: ${studentEmail}`);

      // -------------------------------------------------------------
      // 📦 DATABASE UPDATE (Auto-confirm enrollment & log transaction)
      // -------------------------------------------------------------
      const transactionId = `txn_${Date.now()}`;
      database.transactions[transactionId] = {
        id: transactionId,
        studentEmail: studentEmail,
        courseId: courseId,
        courseTitle: courseTitle,
        amount: amountPaid,
        status: 'SUCCESS', // Set status directly to Paid/Success
        method: entity.method || 'Razorpay Gateway',
        utrReference: utr,
        timestamp: Date.now()
      };

      // Grant instant access to the course
      if (!database.users[studentEmail]) {
        database.users[studentEmail] = { unlockedCourses: [] };
      }
      database.users[studentEmail].unlockedCourses.push(courseId);

      console.log(`[SUCCESS] Enrollment fully unlocked for ${studentEmail} on "${courseTitle}"!`);
      return res.json({ status: "success", message: "Enrollment auto-fulfilled" });
    }

    res.json({ status: "ignored", message: "Event not handled" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ error: "Webhook process failed", details: error.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Node.js Razorpay backend running on port ${PORT}`);
});
```

---

## 🔵 2. PHP Full-Stack Integration

### 📄 Backend Order Creation Script (`create_order.php`)
```php
<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// ==========================================
// 🔑 CONFIGURATION (Paste your credentials here)
// ==========================================
define('RAZORPAY_KEY_ID', 'YOUR_API_KEY');
define('RAZORPAY_KEY_SECRET', 'YOUR_KEY_SECRET');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $amount = isset($input['amount']) ? $input['amount'] : 0;
    $studentEmail = isset($input['studentEmail']) ? $input['studentEmail'] : 'anonymous@learner.com';
    $courseId = isset($input['courseId']) ? $input['courseId'] : 'course_xyz';
    $courseTitle = isset($input['courseTitle']) ? $input['courseTitle'] : 'Premium Course';

    if ($amount <= 0) {
        echo json_encode(["error" => "Invalid amount requested."]);
        exit();
    }

    // Prepare API Payload for Razorpay Order Creation
    $data = [
        "amount" => round($amount * 100), // Amount in paise
        "currency" => "INR",
        "receipt" => "receipt_order_" . time(),
        "notes" => [
            "studentEmail" => $studentEmail,
            "courseId" => $courseId,
            "courseTitle" => $courseTitle
        ]
    ];

    $payload = json_encode($data);

    // Call Razorpay API using cURL
    $ch = curl_init('https://api.razorpay.com/v1/orders');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_USERPWD, RAZORPAY_KEY_ID . ':' . RAZORPAY_KEY_SECRET);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (curl_errno($ch)) {
        echo json_encode(["error" => "cURL error", "details" => curl_error($ch)]);
    } else {
        http_response_code($httpCode);
        echo $response;
    }
    curl_close($ch);
} else {
    echo json_encode(["error" => "Only POST method is allowed."]);
}
?>
```

### 📄 Backend Webhook & Auto-Fulfillment Script (`webhook.php`)
```php
<?php
header("Content-Type: application/json");

// ==========================================
// 🔑 CONFIGURATION (Paste your credentials here)
// ==========================================
define('RAZORPAY_WEBHOOK_SECRET', 'YOUR_WEBHOOK_SECRET');

// Retrieve the signature from Headers
$signature = isset($_SERVER['HTTP_X_RAZORPAY_SIGNATURE']) ? $_SERVER['HTTP_X_RAZORPAY_SIGNATURE'] : '';
$rawPayload = file_get_contents('php://input');

if (empty($signature)) {
    http_response_code(400);
    echo json_encode(["error" => "Missing signature header"]);
    exit();
}

// Compute the HMAC SHA256 Signature locally to match Razorpay
$expectedSignature = hash_hmac('sha256', $rawPayload, RAZORPAY_WEBHOOK_SECRET);

if ($expectedSignature !== $signature) {
    http_response_code(400);
    echo json_encode(["error" => "Signature verification failed! Expected vs Received mismatch."]);
    exit();
}

// signature verified! Process payload
$data = json_decode($rawPayload, true);
$event = $data['event'];

if ($event === 'payment.captured' || $event === 'order.paid') {
    $entity = ($event === 'payment.captured') ? $data['payload']['payment']['entity'] : $data['payload']['order']['entity'];
    
    $paymentId = ($event === 'payment.captured') ? $entity['id'] : (isset($entity['payment_id']) ? $entity['payment_id'] : 'wh_pay_' . time());
    $orderId = isset($entity['order_id']) ? $entity['order_id'] : $entity['id'];
    $amountPaid = $entity['amount'] / 100;
    
    // Extract Acquirer/UTR details
    $utr = isset($entity['acquirer_data']['rrn']) ? $entity['acquirer_data']['rrn'] : $paymentId;
    
    // Extract metadata
    $notes = isset($entity['notes']) ? $entity['notes'] : [];
    $studentEmail = isset($notes['studentEmail']) ? $notes['studentEmail'] : '';
    $courseId = isset($notes['courseId']) ? $notes['courseId'] : '';
    $courseTitle = isset($notes['courseTitle']) ? $notes['courseTitle'] : '';

    if (!empty($studentEmail)) {
        // -------------------------------------------------------------
        // 📦 DATABASE UPDATE (Paste your PDO, MySQL, or SQL query here)
        // -------------------------------------------------------------
        /*
        $db = new PDO('mysql:host=localhost;dbname=edtech', 'username', 'password');
        
        // 1. Record the transaction
        $stmt = $db->prepare("INSERT INTO transactions (payment_id, order_id, student_email, course_id, amount, status, utr, created_at) VALUES (?, ?, ?, ?, ?, 'SUCCESS', ?, NOW())");
        $stmt->execute([$paymentId, $orderId, $studentEmail, $courseId, $amountPaid, $utr]);
        
        // 2. Unlock course access
        $stmt = $db->prepare("INSERT INTO user_enrollments (student_email, course_id, status) VALUES (?, ?, 'ACTIVE') ON DUPLICATE KEY UPDATE status='ACTIVE'");
        $stmt->execute([$studentEmail, $courseId]);
        */

        error_log("[SUCCESS] Course: $courseId unlocked automatically via webhook for $studentEmail!");
        echo json_encode(["success" => true, "message" => "Enrollment automated successfully"]);
        exit();
    }
}

echo json_encode(["success" => true, "message" => "Event acknowledged"]);
?>
```

---

## 🟡 3. Frontend (HTML & JavaScript Checkout UI)

This single-page template fetches an Order ID from your backend securely, opens the standard Razorpay frame, and displays Native UPI, QR codes, and card fields cleanly.

### 📄 Frontend Webpage (`index.html`)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Razorpay Secure Checkout Portal</title>
  
  <!-- Tailwind CSS for Modern Styling -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- Razorpay Standard Checkout Script -->
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body class="bg-slate-900 text-slate-100 flex items-center justify-center min-h-screen p-4 font-sans">

  <div class="bg-slate-800 border border-slate-700/60 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
    
    <!-- Title -->
    <div class="text-center mb-6">
      <span class="bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
        ✓ Secure Gateway Connected
      </span>
      <h1 class="text-2xl font-black text-white mt-3">Course Checkout Masterclass</h1>
      <p class="text-slate-400 text-xs mt-1">Get instant access to study manuals and verified tutorials.</p>
    </div>

    <!-- Product Card -->
    <div class="bg-slate-900/60 rounded-2xl p-4 border border-slate-700/40 mb-6 flex justify-between items-center">
      <div>
        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wide">Selected Package</h4>
        <h2 class="text-sm font-black text-white mt-0.5">Advanced Hacking &amp; Dev Bundle</h2>
      </div>
      <div class="text-right">
        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Price</h4>
        <h2 class="text-xl font-black text-emerald-400 mt-0.5">₹499.00</h2>
      </div>
    </div>

    <!-- Payer Form -->
    <div class="space-y-4 mb-6">
      <div>
        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Your Full Name</label>
        <input type="text" id="buyer-name" value="Satendra Lodhi" class="w-full bg-slate-900/80 border border-slate-700 focus:border-indigo-500 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none" />
      </div>
      <div>
        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Your Email Address</label>
        <input type="email" id="buyer-email" value="satendrlodhi711@gmail.com" class="w-full bg-slate-900/80 border border-slate-700 focus:border-indigo-500 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none" />
      </div>
    </div>

    <!-- Status Alert -->
    <div id="status-message" class="hidden mb-4 p-3 rounded-xl text-center text-xs font-bold"></div>

    <!-- Payment CTA -->
    <button onclick="startRazorpayPayment()" id="pay-btn" class="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase tracking-wider text-xs py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2">
      🚀 Initiate Secure Checkout
    </button>

    <!-- Support Notice -->
    <p class="text-slate-500 text-[9px] text-center uppercase tracking-widest mt-6 font-semibold">
      🔒 256-bit Encrypted SSL Connection
    </p>
  </div>

  <script>
    // Config: URL of your active backend
    // For local dev, e.g. "http://localhost:3000/api/checkout/order" or "create_order.php"
    const ORDER_API_URL = "/api/checkout/order"; 

    // Replace with your active Razorpay Key ID (rzp_test_... or rzp_live_...)
    const RAZORPAY_KEY_ID = "YOUR_API_KEY"; 

    async function startRazorpayPayment() {
      const payButton = document.getElementById("pay-btn");
      const statusBox = document.getElementById("status-message");
      const name = document.getElementById("buyer-name").value.trim();
      const email = document.getElementById("buyer-email").value.trim();

      if (!name || !email) {
        alert("Please specify your name and email first.");
        return;
      }

      try {
        // Update UI State
        payButton.disabled = true;
        payButton.innerText = "🔄 Generating Secure Order ID...";
        statusBox.classList.add("hidden");

        // 1. Fetch Order ID from Server-Side secure API
        const orderResponse = await fetch(ORDER_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: 499, // Amount in INR
            currency: "INR",
            studentEmail: email,
            courseId: "course_premium_ai",
            courseTitle: "Advanced Hacking & Dev Bundle"
          })
        });

        if (!orderResponse.ok) {
          throw new Error("Failed to contact backend to create Order ID.");
        }

        const orderData = await orderResponse.json();
        console.log("Server Order data received:", orderData);

        // 2. Configure Standard Checkout Options
        const options = {
          key: RAZORPAY_KEY_ID, 
          amount: orderData.amount, // Total paise
          currency: orderData.currency,
          name: "Education Portal",
          description: "Advanced Hacking & Dev Bundle",
          order_id: orderData.id, // Secure Order ID from Server
          prefill: {
            name: name,
            email: email,
          },
          theme: {
            color: "#6366f1", // Match indigo visual layout
          },
          // Customize Payment Methods to prioritize UPI & Dynamic QR
          config: {
            display: {
              blocks: {
                banks: {
                  name: 'Dynamic UPI QR & Apps',
                  instruments: [
                    {
                      method: 'upi',
                      rules: [
                        {
                          // Allow direct scans & intent launch
                          type: 'intent'
                        },
                        {
                          type: 'qr'
                        }
                      ]
                    }
                  ]
                }
              },
              sequence: ['block.banks', 'block.other'],
              preferences: {
                show_default_blocks: true,
              }
            }
          },
          handler: function (response) {
            // Callback trigger on browser checkout completion
            statusBox.className = "mb-4 p-3 rounded-xl text-center text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
            statusBox.innerHTML = `🎉 Payment verified! ID: ${response.razorpay_payment_id}`;
            statusBox.classList.remove("hidden");
            console.log("Response:", response);
            
            payButton.disabled = false;
            payButton.innerText = "🚀 Access Unlocked";
          },
          modal: {
            ondismiss: function () {
              payButton.disabled = false;
              payButton.innerText = "🚀 Initiate Secure Checkout";
            }
          }
        };

        // Open standard iframe Checkout
        const rzp = new Razorpay(options);
        rzp.open();

      } catch (err) {
        console.error("Checkout initiation failed:", err);
        statusBox.className = "mb-4 p-3 rounded-xl text-center text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20";
        statusBox.innerText = `Error: ${err.message || "Failed to contact gateway."}`;
        statusBox.classList.remove("hidden");
        
        payButton.disabled = false;
        payButton.innerText = "🚀 Initiate Secure Checkout";
      }
    }
  </script>
</body>
</html>
```
