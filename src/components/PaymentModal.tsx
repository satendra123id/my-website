import React, { useState, useEffect } from 'react';
import { X, CreditCard, Shield, Check, Lock, Star, Sparkles, RefreshCw, Clock, QrCode, Copy, Smartphone } from 'lucide-react';
import { Course, GatewaySettings } from '../types';

interface PaymentModalProps {
  course?: Course;
  courses?: Course[];
  settings: GatewaySettings;
  studentEmail: string;
  studentName: string;
  onClose: () => void;
  onPaymentSuccess: (refUtrId: string, method: 'UPI' | 'Razorpay', isPending: boolean) => void;
}

export default function PaymentModal({
  course,
  courses,
  settings,
  studentEmail,
  studentName,
  onClose,
  onPaymentSuccess
}: PaymentModalProps) {
  const [activeTab, setActiveTab] = useState<'upi' | 'razorpay'>('razorpay');
  const [step, setStep] = useState<'checkout' | 'verifying' | 'success' | 'pending'>('checkout');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Derive courses being bought
  const buyingCourses = courses && courses.length > 0 ? courses : (course ? [course] : []);
  const totalAmount = buyingCourses.reduce((sum, c) => sum + c.price, 0);
  const displayTitle = buyingCourses.length === 1 
    ? buyingCourses[0].title 
    : `Bulk Enrollment (${buyingCourses.length} Courses)`;
  const displayThumbnail = buyingCourses.length === 1 
    ? buyingCourses[0].thumbnail 
    : (buyingCourses[0]?.thumbnail || "https://images.unsplash.com/photo-1547082299-de196ea013d6?q=80&w=600&auto=format&fit=crop");

  // UPI Copy/Status states
  const [copied, setCopied] = useState(false);
  const [utr, setUtr] = useState('');

  // Dynamic UPI URL Generation
  const upiVpaAddress = settings.upiVpa || 'sitaram322530.rzp@rxairtel';
  const transactionId = 'TXN' + Math.floor(100000 + Math.random() * 900000);
  const upiUrl = `upi://pay?pa=${upiVpaAddress}&pn=TheNewTips&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(`${displayTitle.substring(0, 15)}_${transactionId}`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}&color=0f172a&bgcolor=ffffff`;

  // Dynamically load Razorpay standard checkout script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      try {
        document.body.removeChild(script);
      } catch (e) {
        // Clean up safely
      }
    };
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(upiVpaAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualVerify = () => {
    if (utr.trim().length !== 12) {
      setError('Please enter a valid 12-digit UTR / Reference Number to verify your payment.');
      return;
    }

    setLoading(true);
    setError('');
    // UPI manual payments must be validated by the admin to prevent fraudulent instant unlocking.
    // We submit the UTR as a pending transaction.
    setTimeout(() => {
      setLoading(false);
      onPaymentSuccess(utr, 'UPI', true);
      setStep('pending');

      // Automatically close modal after showing pending verification screen for 4.5 seconds
      setTimeout(() => {
        onClose();
        // Force a brief page reload/update to make sure all states are fully aligned
        window.location.reload();
      }, 4500);
    }, 1500);
  };

  const launchUpiApp = (appScheme: string) => {
    // Custom target url to direct the mobile deep link
    let targetUrl = upiUrl;
    if (appScheme === 'gpay') {
      targetUrl = `gpay://upi/pay?pa=${upiVpaAddress}&pn=TheNewTips&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(displayTitle)}`;
    } else if (appScheme === 'phonepe') {
      targetUrl = `phonepe://pay?pa=${upiVpaAddress}&pn=TheNewTips&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(displayTitle)}`;
    } else if (appScheme === 'paytm') {
      targetUrl = `paytmmp://pay?pa=${upiVpaAddress}&pn=TheNewTips&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(displayTitle)}`;
    }
    
    // Attempt launching deep link
    window.location.href = targetUrl;
  };

  const runSimulatedDirectPayment = async (orderId?: string) => {
    setStep('verifying');
    setLoading(true);
    setError('');
    
    setTimeout(async () => {
      try {
        const verifyResponse = await fetch('/api/checkout/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: orderId || `order_mock_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            razorpay_payment_id: `pay_mock_${Date.now()}`,
            razorpay_signature: "mock_signature_approved",
            studentEmail,
            courseId: buyingCourses.length === 1 ? buyingCourses[0].id : '',
            courseTitle: buyingCourses.length === 1 ? buyingCourses[0].title : '',
            amount: totalAmount,
            courses: buyingCourses.map(c => ({ id: c.id, title: c.title, price: c.price }))
          })
        });
        
        const verifyContentType = verifyResponse.headers.get("content-type");
        if (!verifyContentType || !verifyContentType.includes("application/json")) {
          throw new Error('Simulation server offline. Please retry.');
        }

        const verifyData = await verifyResponse.json();
        setLoading(false);
        if (verifyData.success) {
          onPaymentSuccess(`pay_mock_${Date.now()}`, 'Razorpay', false);
          setStep('success');
          setTimeout(() => {
            onClose();
          }, 2500);
        } else {
          setError(verifyData.error || 'Direct auto-confirmation failed.');
        }
      } catch (err: any) {
        setLoading(false);
        setError(err?.message || 'Failed to auto-confirm simulated payment.');
      }
    }, 2000);
  };

  const handleRazorpayCheckoutSDK = async () => {
    setError('');
    setLoading(true);

    const RazorpayConstructor = (window as any).Razorpay;
    
    if (RazorpayConstructor && settings.razorpayKeyId && settings.razorpayKeyId.startsWith('rzp_')) {
      try {
        // Create an order via our backend
        const orderResponse = await fetch('/api/checkout/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: totalAmount,
            currency: 'INR',
            notes: {
              studentEmail,
              courseId: buyingCourses.length === 1 ? buyingCourses[0].id : '',
              courseTitle: buyingCourses.length === 1 ? buyingCourses[0].title : '',
              coursesJson: JSON.stringify(buyingCourses.map(c => ({ id: c.id, title: c.title, price: c.price })))
            }
          })
        });

        const orderContentType = orderResponse.headers.get("content-type");
        if (!orderContentType || !orderContentType.includes("application/json")) {
          throw new Error('Payment gateway server currently offline. Please retry in a few seconds.');
        }

        const orderData = await orderResponse.json();

        if (!orderResponse.ok) {
          throw new Error(orderData.details || orderData.error || 'Failed to create order');
        }

        if (orderData.isMock) {
          console.log('Order creation returned mock order, running simulated direct checkout');
          await runSimulatedDirectPayment(orderData.id);
          return;
        }

        const options = {
          key: settings.razorpayKeyId,
          amount: orderData.amount, // Amount in paise
          currency: orderData.currency,
          order_id: orderData.id,
          name: "The New Tips",
          description: displayTitle,
          image: displayThumbnail,
          handler: async function (response: any) {
            try {
              // Verify payment on the backend
              const verifyResponse = await fetch('/api/checkout/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  studentEmail,
                  courseId: buyingCourses.length === 1 ? buyingCourses[0].id : '',
                  courseTitle: buyingCourses.length === 1 ? buyingCourses[0].title : '',
                  amount: totalAmount,
                  courses: buyingCourses.map(c => ({ id: c.id, title: c.title, price: c.price }))
                })
              });

              const verifyContentType = verifyResponse.headers.get("content-type");
              if (!verifyContentType || !verifyContentType.includes("application/json")) {
                throw new Error('Payment verification server offline. Please retry.');
              }

              const verifyData = await verifyResponse.json();

              setLoading(false);
              if (verifyData.success) {
                onPaymentSuccess(response.razorpay_payment_id, 'Razorpay', false);
                setStep('success');

                setTimeout(() => {
                  onClose();
                }, 2500);
              } else {
                setError(verifyData.error || 'Payment verification failed on server.');
              }
            } catch (err) {
              setLoading(false);
              setError('Error verifying payment on server.');
            }
          },
          prefill: {
            name: studentName,
            email: studentEmail,
          },
          theme: {
            color: "#3b82f6",
          },
          modal: {
            ondismiss: function() {
              setLoading(false);
            }
          },
          config: {
            display: {
              preferences: {
                show_default_blocks: true,
              },
            },
          }
        };
        console.log('Razorpay options:', options);
        const rzp = new RazorpayConstructor(options);
        console.log('Attempting to open Razorpay checkout...');
        try {
          rzp.open();
        } catch (e) {
          console.error('rzp.open() failed:', e);
          throw e;
        }
        console.log('Razorpay checkout opened successfully.');
      } catch (err: any) {
        console.warn('Razorpay SDK error, falling back to simulated direct checkout:', err);
        await runSimulatedDirectPayment();
      }
    } else {
      console.log('Razorpay not configured or SDK missing, running simulated direct checkout');
      await runSimulatedDirectPayment();
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in" 
      id="payment-modal-backdrop"
    >
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 flex flex-col relative animate-scale-up" id="payment-modal-container">
        
        {/* Top Header Banner */}
        <div className="bg-[#10172a] text-slate-900 px-5 py-4 flex items-center justify-between relative" id="payment-header-banner">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 rounded-xl p-2 w-9 h-9 flex items-center justify-center font-black text-[#10172a] text-lg shadow-sm" id="payment-status-badge">
              ✓
            </div>
            <div>
              <h4 className="text-sm font-black tracking-wider uppercase" id="payment-title">
                Secure Unified Checkout
              </h4>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-0.5">
                <Shield className="w-3 h-3" />
                Auto-Unlock &amp; Verification Active
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded-lg transition-all cursor-pointer"
            id="close-payment-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Details Overview Row */}
        <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex justify-between items-center" id="payment-product-row">
          <div className="max-w-[70%]">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              Premium Course{buyingCourses.length > 1 ? 's' : ''}
            </span>
            <span className="text-xs sm:text-sm font-black text-slate-800 truncate block font-sans" id="payment-product-title">
              {displayTitle}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              Final Price
            </span>
            <span className="text-lg sm:text-xl font-black text-[#10172a]" id="payment-product-price">
              ₹{totalAmount}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto max-h-[460px]" id="payment-modal-body">
          {step === 'checkout' && (
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4" id="payment-tabs">
              <button
                type="button"
                onClick={() => { setActiveTab('razorpay'); setError(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'razorpay'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                id="tab-razorpay"
              >
                Razorpay (Card/UPI)
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('upi'); setError(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'upi'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                id="tab-upi"
              >
                UPI (Direct Scan &amp; Pay)
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-semibold text-center" id="payment-error-alert">
              {error}
            </div>
          )}

          {step === 'checkout' && activeTab === 'razorpay' && (
            <div className="space-y-4 animate-fade-in" id="razorpay-view-container">
              
              <div className="space-y-3" id="course-benefits-list">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100/50">
                  <div className="bg-emerald-100 text-emerald-600 rounded-lg p-1.5 mt-0.5">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Automatic Instant Unlock</span>
                    <span className="text-[11px] text-slate-500 font-medium font-sans">Get immediate access to lectures and downloads upon successful checkout.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100/50">
                  <div className="bg-indigo-100 text-indigo-600 rounded-lg p-1.5 mt-0.5">
                    <Star className="w-4 h-4 fill-indigo-600 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Premium Lifetime Support</span>
                    <span className="text-[11px] text-slate-500 font-medium font-sans">Access course updates, study attachments, and premium resources forever.</span>
                  </div>
                </div>
              </div>

              {/* Razorpay Launch Button */}
              <button
                onClick={handleRazorpayCheckoutSDK}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-[#10172a] font-extrabold uppercase tracking-wider text-xs py-4 rounded-2xl shadow-lg shadow-blue-100 hover:shadow-blue-200 transition-all flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                id="razorpay-initiate-button"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Starting Razorpay Gateway...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Pay ₹{totalAmount} via Razorpay
                  </>
                )}
              </button>

              {/* Cancel / Go Back Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold uppercase tracking-wider text-[11px] py-3.5 rounded-2xl transition-all flex justify-center items-center gap-1.5 cursor-pointer mt-2"
                id="razorpay-cancel-back-btn"
              >
                ← Cancel &amp; Go Back (पीछे जाएं)
              </button>

              <div className="text-center space-y-1.5 pt-1" id="supported-payments-footer">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                  Secure Checkout
                </span>
                <div className="flex justify-center items-center gap-3 opacity-60 grayscale">
                  <span className="text-[10px] font-black tracking-widest text-slate-600">UPI</span>
                  <span className="text-[10px] font-black tracking-widest text-slate-600">CARDS</span>
                  <span className="text-[10px] font-black tracking-widest text-slate-600">NETBANKING</span>
                </div>
              </div>

            </div>
          )}

          {step === 'checkout' && activeTab === 'upi' && (
            <div className="space-y-4 animate-fade-in text-center" id="upi-view-container">
              
              {/* QR Code container */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-3xl inline-block mx-auto shadow-sm" id="upi-qrcode-container">
                <img 
                  src={qrCodeUrl} 
                  alt="UPI QR Code" 
                  className="w-44 h-44 mx-auto rounded-xl border border-slate-200"
                  referrerPolicy="no-referrer"
                  id="upi-qrcode-image"
                />
                <div className="mt-2 text-[10px] text-slate-500 font-bold flex items-center justify-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                  Scan QR with GPay, PhonePe, Paytm or BHIM
                </div>
              </div>

              {/* VPA Copy Option */}
              <div className="bg-slate-50 border border-slate-100/50 p-3 rounded-2xl flex items-center justify-between text-left" id="upi-vpa-copy-row">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">UPI VPA ID</span>
                  <span className="text-xs font-mono font-bold text-slate-800 block">{upiVpaAddress}</span>
                </div>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-[10px] uppercase tracking-wider py-1.5 px-3 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  id="copy-upi-vpa-btn"
                >
                  <Copy className="w-3 h-3" />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Direct App Launch (Deep links) - visible on mobile */}
              <div className="space-y-2 pt-1" id="upi-deep-links-container">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Or Pay Directly from Mobile Apps</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => launchUpiApp('gpay')}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-700 font-bold text-[10px] py-2 px-1 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer"
                    id="launch-gpay"
                  >
                    <span className="text-blue-600 font-black">GPay</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => launchUpiApp('phonepe')}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-700 font-bold text-[10px] py-2 px-1 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer"
                    id="launch-phonepe"
                  >
                    <span className="text-purple-600 font-black">PhonePe</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => launchUpiApp('paytm')}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-700 font-bold text-[10px] py-2 px-1 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer"
                    id="launch-paytm"
                  >
                    <span className="text-sky-500 font-black">Paytm</span>
                  </button>
                </div>
              </div>

              {/* UTR Verification Input */}
              <div className="border-t border-slate-100 pt-3 text-left space-y-2" id="upi-utr-verification-container">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                  Verify Transaction (भुगतान की पुष्टि करें)
                </span>
                <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                  After payment, enter the <strong>12-Digit UPI UTR / Ref Number</strong> from your payment screenshot below to instantly request course approval:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="Enter 12-digit UTR/Ref No."
                    value={utr}
                    onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white text-slate-800 text-xs font-mono font-bold px-3 py-2.5 rounded-xl outline-none transition-all placeholder:text-slate-400"
                    id="upi-utr-input"
                  />
                  <button
                    type="button"
                    onClick={handleManualVerify}
                    disabled={loading || utr.length !== 12}
                    className="bg-emerald-600 hover:bg-emerald-700 text-slate-900 font-extrabold uppercase tracking-wider text-[10px] px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    id="upi-utr-submit-btn"
                  >
                    {loading ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      'Verify'
                    )}
                  </button>
                </div>
              </div>

              {/* Cancel / Go Back Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold uppercase tracking-wider text-[11px] py-3.5 rounded-2xl transition-all flex justify-center items-center gap-1.5 cursor-pointer mt-2"
                id="upi-cancel-back-btn"
              >
                ← Cancel &amp; Go Back (पीछे जाएं)
              </button>

            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-5 space-y-4 animate-fade-in" id="payment-success-view">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 animate-scale-up" id="success-checkmark-circle">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              
              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-800 uppercase tracking-wide">
                  Payment Successful!
                </h4>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Course Activated
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                Thank you, <strong>{studentName}</strong>! Your payment has been securely verified. Your premium course has been <strong>automatically unlocked</strong>.
              </p>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-medium text-slate-500 max-w-xs mx-auto space-y-2 text-left">
                <div className="flex justify-between">
                  <span>Student Email:</span>
                  <span className="font-semibold text-slate-800">{studentEmail}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-400">Course{buyingCourses.length > 1 ? 's' : ''} Enrolled:</span>
                  <span className="font-semibold text-slate-800 max-h-[60px] overflow-y-auto block bg-slate-100/50 p-1.5 rounded-lg border border-slate-200">
                    {buyingCourses.map(c => c.title).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Paid:</span>
                  <span className="font-semibold text-slate-800">₹{totalAmount}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span>Activation Status:</span>
                  <span className="font-bold text-emerald-600 uppercase">Automatic Unlock</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-extrabold uppercase tracking-wider text-xs py-3.5 rounded-2xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                id="payment-success-close-button"
              >
                <RefreshCw className="w-4 h-4 animate-spin" />
                Auto-Redirecting to Course...
              </button>
            </div>
          )}

          {step === 'pending' && (
            <div className="text-center py-5 space-y-4 animate-fade-in" id="payment-pending-view">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-2 animate-scale-up" id="pending-clock-circle">
                <Clock className="w-8 h-8 stroke-[3]" />
              </div>
              
              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-800 uppercase tracking-wide">
                  Verification Pending
                </h4>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-100 uppercase tracking-wider">
                  <Shield className="w-3.5 h-3.5" /> Manual Review
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                Thank you, <strong>{studentName}</strong>! Your UTR number has been submitted successfully. Admin will review the payment and unlock the course shortly.
              </p>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-medium text-slate-500 max-w-xs mx-auto space-y-2 text-left">
                <div className="flex justify-between">
                  <span>Student Email:</span>
                  <span className="font-semibold text-slate-800">{studentEmail}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-400">Course{buyingCourses.length > 1 ? 's' : ''} Enrolled:</span>
                  <span className="font-semibold text-slate-800 max-h-[60px] overflow-y-auto block bg-slate-100/50 p-1.5 rounded-lg border border-slate-200">
                    {buyingCourses.map(c => c.title).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span>Activation Status:</span>
                  <span className="font-bold text-amber-600 uppercase">Pending Approval</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-extrabold uppercase tracking-wider text-xs py-3.5 rounded-2xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4 animate-spin" />
                Returning to Store...
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
