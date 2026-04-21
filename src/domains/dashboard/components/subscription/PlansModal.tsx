"use client";

import { useState } from "react";
import Script from "next/script";
import { CheckCircle2, Zap, Crown, AlertCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Database } from "@/lib/supabase/database.types";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export type Plan = Database['public']['Tables']['plans']['Row'];

interface PlansModalProps {
  initialPlans: Plan[];
  status?: string;
  onClose?: () => void;
  currentSubscription?: any;
}

export default function PlansModal({ initialPlans, status, onClose, currentSubscription }: PlansModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);
  const router = useRouter();

  const currentPlanKey = currentSubscription?.plankey;
  const isCurrentlyActive = currentSubscription?.status === 'active';
  const now = new Date();
  const isExpired = currentSubscription?.enddate ? new Date(currentSubscription.enddate) < now : true;

  // Helper to compute prorated price for monthly plans
  const computePlanPrice = (dbPlan: Plan) => {
    const isYearly = dbPlan.code === 'yearly';
    
    // Logic: If user already HAS this plan and it's ACTIVE and NOT expired, we don't prorate (and we'll disable the button)
    const isUserPlan = dbPlan.key === currentPlanKey;
    const isPlanActive = isUserPlan && isCurrentlyActive && !isExpired;

    if (isYearly) {
        return {
            amountStr: (dbPlan.price || 0).toLocaleString(),
            amount: (dbPlan.price || 0) * 100,
            isProrated: false,
            daysRemaining: 365,
            isCurrent: isPlanActive
        };
    }

    if (isPlanActive) {
        return {
            amountStr: (dbPlan.price || 0).toLocaleString(),
            amount: (dbPlan.price || 0) * 100,
            isProrated: false,
            daysRemaining: 30,
            isCurrent: true
        };
    }

    const currentDay = now.getDate();
    const billDay = dbPlan.billgenerationdate || 1;
    const gracePeriod = dbPlan.graceperiod || 0;

    let prevBillDate = new Date(now.getFullYear(), now.getMonth(), billDay);
    if (currentDay < billDay) {
        prevBillDate.setMonth(prevBillDate.getMonth() - 1);
    }
    
    let nextBillDate = new Date(prevBillDate);
    nextBillDate.setMonth(nextBillDate.getMonth() + 1);

    const endOfGracePeriod = new Date(prevBillDate);
    endOfGracePeriod.setDate(endOfGracePeriod.getDate() + gracePeriod);
    endOfGracePeriod.setHours(23, 59, 59, 999);

    if (now > endOfGracePeriod) {
        const daysInCycle = Math.round((nextBillDate.getTime() - prevBillDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(1, Math.ceil((nextBillDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        
        const pricePerDay = (dbPlan.price || 0) / daysInCycle;
        const proratedPrice = Math.ceil(pricePerDay * daysRemaining);
        
        return {
            amountStr: proratedPrice.toLocaleString(),
            amount: proratedPrice * 100,
            isProrated: true,
            daysRemaining,
            isCurrent: false
        };
    }

    return {
        amountStr: (dbPlan.price || 0).toLocaleString(),
        amount: (dbPlan.price || 0) * 100,
        isProrated: false,
        daysRemaining: 30,
        isCurrent: false
    };
  };

  // Merge database plans with frontend styling
  const plans = initialPlans.map((dbPlan) => {
    const isYearly = dbPlan.code === 'yearly';
    const computed = computePlanPrice(dbPlan);
    
    return {
      id: dbPlan.key,
      code: dbPlan.code,
      name: dbPlan.name || (isYearly ? "Yearly Plan" : "Monthly Plan"),
      price: computed.amountStr,
      amount: computed.amount,
      duration: isYearly ? "per year" : (computed.isProrated ? `for ${computed.daysRemaining} days` : "per month"),
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
      isProrated: computed.isProrated,
      isCurrent: computed.isCurrent,
      originalPrice: (dbPlan.price || 0).toLocaleString()
    };
  });

  const handlePayment = async (plan: typeof plans[0]) => {
    if (plan.isCurrent) return;
    if (!isRazorpayLoaded) {
      alert("Payment gateway is loading, please try again in a moment.");
      return;
    }
    
    setIsProcessing(true);

    try {
      const orderResponse = await fetch("/api/subscription/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: plan.amount,
          planName: plan.name,
          planKey: plan.code,
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(orderData.error || "Failed to create order");
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "EdDesk Platform",
        description: `${plan.name} Subscription`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            const verifyResponse = await fetch("/api/subscription/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planKey: plan.code,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyResponse.ok && verifyData.success) {
              window.location.reload(); // Refresh to update subscription state
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
    <div className="w-full relative bg-slate-50/95 backdrop-blur-md flex flex-col items-center justify-start p-4">
      {/* Razorpay Script */}
      <Script 
        src="https://checkout.razorpay.com/v1/checkout.js" 
        onLoad={() => setIsRazorpayLoaded(true)}
      />

      <div className="w-full max-w-6xl mx-auto py-8 md:py-12 relative">
        {onClose && status !== "required" && (
          <button 
            onClick={onClose}
            className="absolute -top-6 -right-6 md:-top-2 md:-right-2 p-3 text-gray-400 hover:text-gray-900 transition-colors bg-white rounded-full shadow-xl border border-gray-100 z-50 hover:scale-110 active:scale-95"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        {/* Status Notice */}
        {status === "required" && (
          <div className="mb-12 max-w-2xl mx-auto animate-in zoom-in-95 fade-in duration-500">
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex items-start gap-4 shadow-sm">
              <div className="bg-amber-100 p-2 rounded-lg">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-amber-900 font-bold text-lg">Subscription Required</h3>
                <p className="text-amber-800/80 text-sm mt-1 leading-relaxed">
                  Your current subscription has expired or is not active. Please select a plan below to restore full access to your admin dashboard.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="text-center mb-16 space-y-4 animate-in slide-in-from-bottom-5 fade-in duration-700">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
            Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Perfect Plan</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Unlock the full potential of your school website with our flexible pricing options.
            No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <div 
              key={plan.id}
              className={`relative group bg-white rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border 
                ${plan.isPopular ? 'border-purple-500/50' : 'border-slate-200'}
                animate-in slide-in-from-bottom-${8 + index * 4} fade-in duration-700 fill-mode-both
                ${plan.isCurrent ? 'opacity-80' : ''}
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
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
                  {plan.isCurrent && (
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">Active</span>
                  )}
                </div>
                <p className="text-slate-500 text-sm h-10">{plan.description}</p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold text-slate-900">₹{plan.price}</span>
                  <span className="text-slate-500 text-sm whitespace-nowrap">{plan.duration}</span>
                </div>
                {plan.isProrated && !plan.isCurrent && (
                  <div className="mt-2 inline-flex border border-amber-200 bg-amber-50 rounded-lg px-3 py-1.5 align-middle items-center">
                    <AlertCircle className="w-4 h-4 text-amber-500 mr-2" />
                    <p className="text-amber-700 text-xs font-semibold">
                      Prorated pricing applied. Normal price is ₹{plan.originalPrice}/month.
                    </p>
                  </div>
                )}
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex} className="flex items-center gap-3 text-slate-600 group-hover:translate-x-1 transition-transform duration-300" style={{ transitionDelay: `${fIndex * 50}ms` }}>
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePayment(plan)}
                disabled={isProcessing || plan.isCurrent}
                className={`w-full py-4 rounded-xl font-bold text-white transition-all duration-300 relative overflow-hidden
                  ${plan.isCurrent 
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300' 
                    : `bg-gradient-to-r ${plan.color} hover:opacity-90 active:scale-95 shadow-lg shadow-blue-500/20`}
                  ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {!plan.isCurrent && (
                  <div className="absolute inset-0 -translate-x-[150%] animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                )}
                <span className="relative">
                  {isProcessing ? 'Processing...' : (plan.isCurrent ? 'Current Plan' : 'Choose Plan')}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
