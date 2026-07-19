import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Cloud Function: Send Welcome Email Trigger upon Course Purchase
 * Fires when a new document is created in the 'transactions' collection.
 */
export const onTransactionCreated = onDocumentCreated("transactions/{transactionId}", async (event) => {
  const transactionData = event.data?.data();
  if (!transactionData) {
    console.log("No transaction data found.");
    return;
  }

  const recipientEmail = transactionData.studentEmail;
  const studentName = transactionData.studentName || "Student";
  const courseTitle = transactionData.courseTitle || "Course";
  const amount = transactionData.amount;
  const status = transactionData.status || "PENDING";

  console.log(`[Cloud Function] Processing transaction created. ID: ${event.params.transactionId}, Recipient: ${recipientEmail}, Course: ${courseTitle}, Status: ${status}`);

  const db = admin.firestore();

  // Create a simulated Email Notification document inside 'email_notifications'
  // In a production context, this collection would be integrated with a Mailer extension or SMTP service.
  await db.collection("email_notifications").add({
    transactionId: event.params.transactionId,
    recipientEmail,
    studentName,
    courseTitle,
    type: "WELCOME",
    subject: `Welcome to "${courseTitle}"! 🚀`,
    status: "SENT",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    body: `Hi ${studentName},\n\nThank you for purchasing "${courseTitle}"! We are thrilled to have you onboard.\n\nYou can access your lectures and downloadable reference guides from your dashboard anytime.\n\nBest regards,\nThe New Tips Team`
  });

  // If the transaction status is immediately SUCCESS (e.g. Razorpay), send the transaction verification/unlock confirmation as well!
  if (status === "SUCCESS") {
    await db.collection("email_notifications").add({
      transactionId: event.params.transactionId,
      recipientEmail,
      studentName,
      courseTitle,
      type: "VERIFICATION",
      subject: `Payment Verified: Course Unlocked! ✅`,
      status: "SENT",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      body: `Hi ${studentName},\n\nGood news! Your transaction (ID: ${transactionData.id || event.params.transactionId}) of ₹${amount} for "${courseTitle}" has been verified successfully. Your access is fully unlocked!\n\nStart learning now: https://thenewtips.com/dashboard\n\nBest regards,\nThe New Tips Team`
    });
  }
});

/**
 * Cloud Function: Send Confirmation Email Trigger after Transaction is Verified
 * Fires when an existing transaction document is updated.
 */
export const onTransactionUpdated = onDocumentUpdated("transactions/{transactionId}", async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (!beforeData || !afterData) {
    console.log("Stale or missing transaction data.");
    return;
  }

  // Trigger only when the status transitions from PENDING to SUCCESS
  if (beforeData.status !== "SUCCESS" && afterData.status === "SUCCESS") {
    const recipientEmail = afterData.studentEmail;
    const studentName = afterData.studentName || "Student";
    const courseTitle = afterData.courseTitle || "Course";
    const amount = afterData.amount;
    const transactionId = afterData.id || event.params.transactionId;

    console.log(`[Cloud Function] Transaction verified. Sending Confirmation Email to ${recipientEmail} for Transaction ID: ${transactionId}`);

    const db = admin.firestore();

    // Create a simulated Email Notification document inside 'email_notifications'
    await db.collection("email_notifications").add({
      transactionId: event.params.transactionId,
      recipientEmail,
      studentName,
      courseTitle,
      type: "VERIFICATION",
      subject: `Payment Verified: Course Unlocked! ✅`,
      status: "SENT",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      body: `Hi ${studentName},\n\nGood news! Your transaction (ID: ${transactionId}) of ₹${amount} for "${courseTitle}" has been verified successfully. Your access is fully unlocked!\n\nStart learning now: https://thenewtips.com/dashboard\n\nBest regards,\nThe New Tips Team`
    });
  }
});
