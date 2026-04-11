"use client";

import { useState } from "react";
import Script from "next/script";
import { CheckCircle2, Zap, Crown } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import type { Plan } from "./page";

interface PlansClientProps {
  initialPlans: Plan[];
  status?: string;
}

export default function PlansClient({ initialPlans, status }: PlansClientProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);
  const router = useRouter();

  // Merge database plans with frontend styling
  const plans = initialPlans.map((dbPlan) => {
    const isYearly = dbPlan.code === 'yearly';
    return {
      id: dbPlan.key,
      code: dbPlan.code,
      name: dbPlan.name || (isYearly ? "Yearly Plan" : "Monthly Plan"),
      price: (dbPlan.price || 0).toLocaleString(),
      amount: (dbPlan.price || 0) * 100, // Razorpay takes amounts in paise
      duration: isYearly ? "per year" : "per month",
      description: dbPlan.description || (isYearly ? "Best value for long-term growth." : "Perfect for getting started."),
      icon: isYearly ? <Crown className="w-10 h-10 text-purple-500 mb-4" /> : <Zap className="w-10 h-10 text-blue-500 mb-4" />,
      features: isYearly ? [
        "Everything in Monthly",
        "Priority 24/7 Support",
        "Advanced SEO Tools",
        "Custom Domain Setup",
      ] : [
        "Full Admin Panel Access",
        "Website Template Management",
        "Basic Analytics",
        "Email Support",
      ],
      color: isYearly ? "from-purple-500 to-pink-500" : "from-blue-500 to-cyan-400",
      isPopular: isYearly,
    };
  });

  const handlePayment = async (plan: typeof plans[0]) => {
    if (!isRazorpayLoaded) {
      alert("Payment gateway is loading, please try again in a moment.");
      return;
    }
    
    setIsProcessing(true);

    try {
      // Step 1: Create an Order on our backend
      const orderResponse = await fetch("/plans/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: plan.amount,
          planName: plan.name,
          planKey: plan.code, // Send the code to identify the plan
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(orderData.error || "Failed to create order");
      }

      // Step 2: Open Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "EdDesk Platform",
        description: `${plan.name} Subscription`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            // Step 3: Verify the payment on our backend
            const verifyResponse = await fetch("/plans/api/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planKey: plan.code, // Pass the plan code for DB update
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyResponse.ok && verifyData.success) {
              window.location.href = "/dashboard";
            } else {
              alert("Payment verification failed. Please contact support.");
              setIsProcessing(false);
            }
          } catch (err) {
            console.error("Verification Error:", err);
            alert("An error occurred during verification.");
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: "Super Admin",
          email: "superadmin@eddesk.in",
          contact: "9999999999"
        },
        theme: {
          color: plan.isPopular ? "#A855F7" : "#3B82F6"
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        alert("Payment Failed: " + response.error.description);
        setIsProcessing(false);
      });
      rzp.open();
    } catch (error: any) {
      console.error("Payment Error:", error);
      alert(error.message || "Failed to initialize payment");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Razorpay Script */}
      <Script 
        src="https://checkout.razorpay.com/v1/checkout.js" 
        onLoad={() => setIsRazorpayLoaded(true)}
      />

      <div className="w-full max-w-6xl mx-auto py-12">
        {/* Status Notice */}
        {status === "required" && (
          <div className="mb-12 max-w-2xl mx-auto animate-in zoom-in-95 fade-in duration-500">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-6 rounded-2xl flex items-start gap-4">
              <div className="bg-amber-100 dark:bg-amber-800/40 p-2 rounded-lg">
                <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-amber-900 dark:text-amber-100 font-bold text-lg">Subscription Required</h3>
                <p className="text-amber-800/80 dark:text-amber-200/60 text-sm mt-1 leading-relaxed">
                  Your current subscription has expired or is not active. Please select a plan below to restore full access to your admin dashboard.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="text-center mb-16 space-y-4 animate-in slide-in-from-bottom-5 fade-in duration-700">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Perfect Plan</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Unlock the full potential of your school website with our flexible pricing options.
            No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <div 
              key={plan.id}
              className={`relative group bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border 
                ${plan.isPopular ? 'border-purple-500/50 dark:border-purple-500/50' : 'border-slate-200 dark:border-slate-800'}
                animate-in slide-in-from-bottom-${8 + index * 4} fade-in duration-700 fill-mode-both
              `}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg animate-pulse">
                    Best Value
                  </span>
                </div>
              )}
              
              <div className="mb-8">
                {plan.icon}
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm h-10">{plan.description}</p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold text-slate-900 dark:text-white">₹{plan.price}</span>
                  <span className="text-slate-500 dark:text-slate-400">{plan.duration}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex} className="flex items-center gap-3 text-slate-600 dark:text-slate-300 group-hover:translate-x-1 transition-transform duration-300" style={{ transitionDelay: `${fIndex * 50}ms` }}>
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePayment(plan)}
                disabled={isProcessing}
                className={`w-full py-4 rounded-xl font-bold text-white transition-all duration-300 
                  bg-gradient-to-r ${plan.color} hover:opacity-90 active:scale-95 shadow-lg relative overflow-hidden
                  ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className="absolute inset-0 -translate-x-[150%] animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                <span className="relative">{isProcessing ? 'Processing...' : 'Choose Plan'}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
