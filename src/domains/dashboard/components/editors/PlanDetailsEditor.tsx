import React, { useEffect, useState } from "react";
import type { AdminInitialData } from "@/domains/auth/types";
import { Calendar, ArrowRight, CheckCircle2, Zap, Crown, Loader2 } from "lucide-react";
import Script from "next/script";
import type { Plan } from "@/app/dashboard/page";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PlanDetailsEditorProps {
    adminData: AdminInitialData | null;
    availablePlans?: Plan[];
}

const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
    });
};

export default function PlanDetailsEditor({ adminData, availablePlans = [] }: PlanDetailsEditorProps) {
    const subscription = adminData?.subscriptions;
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);
    
    // Derived state
    const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
    const [nextBillDateDisplay, setNextBillDateDisplay] = useState<Date | null>(null);

    const isYearly = subscription?.plankey?.includes('yearly') || false; 
    const currentPlan = availablePlans.find(p => p.key === subscription?.plankey);
    const yearlyPlan = availablePlans.find(p => p.code === 'yearly');

    useEffect(() => {
        if (subscription?.enddate) {
            const end = new Date(subscription.enddate);
            const now = new Date();
            
            // If billgenerationdate is set, calculate based on that
            if (currentPlan?.billgenerationdate && currentPlan.billgenerationdate > 0) {
                const billDay = currentPlan.billgenerationdate;
                const targetEnd = new Date(now.getFullYear(), now.getMonth(), billDay);
                
                // If current day is >= billDay, target is next month
                if (now.getDate() >= billDay) {
                    targetEnd.setMonth(targetEnd.getMonth() + 1);
                }
                
                // "Calculate till date X-1"
                const displayEndDate = new Date(targetEnd);
                displayEndDate.setDate(displayEndDate.getDate() - 1);
                
                setNextBillDateDisplay(displayEndDate);
                
                const diffInMs = displayEndDate.getTime() - now.getTime();
                const days = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
                setDaysRemaining(days > 0 ? days : 0);
            } else {
                // Fallback to enddate from subscription record
                setNextBillDateDisplay(end);
                const diffInMs = end.getTime() - now.getTime();
                const days = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
                setDaysRemaining(days > 0 ? days : 0);
            }
        }
    }, [subscription, currentPlan]);

    const handleUpgrade = async () => {
        if (!yearlyPlan || !isRazorpayLoaded || isProcessing) return;
        
        setIsProcessing(true);

        try {
            const orderResponse = await fetch("/api/subscription/order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: (yearlyPlan.price || 0) * 100,
                    planName: yearlyPlan.name || "Yearly Plan",
                    planKey: yearlyPlan.code,
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
                description: `Upgrade to ${yearlyPlan.name}`,
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
                                planKey: yearlyPlan.code,
                            }),
                        });

                        const verifyData = await verifyResponse.json();

                        if (verifyResponse.ok && verifyData.success) {
                            window.location.reload();
                        } else {
                            alert("Payment verification failed. Please contact support.");
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
                  email: "admin@eddesk.in",
                },
                theme: { color: "#F54927" },
                modal: {
                    ondismiss: () => setIsProcessing(false)
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err: any) {
            console.error("Order Error:", err);
            alert(err.message || "Could not initiate payment");
            setIsProcessing(false);
        }
    };

    if (!subscription) {
        return (
            <div className="bg-white rounded-2xl border border-[#f1f1f1] overflow-hidden shadow-sm p-8 text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">No Active Subscription Found</h3>
                <p className="text-sm">Please subscribe to a plan to fully utilize EdDesk Admin.</p>
            </div>
        );
    }

    const nextYearDate = subscription.enddate ? new Date(new Date(subscription.enddate).setFullYear(new Date(subscription.enddate).getFullYear() + 1)) : null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Script
                src="https://checkout.razorpay.com/v1/checkout.js"
                onLoad={() => setIsRazorpayLoaded(true)}
            />

            {/* Current Plan Card */}
            <div className="bg-white rounded-2xl border border-[#f1f1f1] overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="border-b border-[#f1f1f1] px-6 lg:px-8 py-5 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#F54927]/10 text-[#F54927] rounded-xl flex items-center justify-center">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-[16px] font-bold text-gray-900 leading-tight">Subscription Overview</h2>
                            <p className="text-[13px] text-gray-500 font-medium">Billing & Next Payment Details</p>
                        </div>
                    </div>
                    {subscription.status === 'active' && (
                        <div className="flex items-center gap-2">
                            {isYearly && (
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-[11px] font-black uppercase tracking-wider rounded-full border border-purple-200 shadow-sm flex items-center gap-1.2">
                                    <Crown className="w-3 h-3" /> Best Value
                                </span>
                            )}
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-[11px] font-bold rounded-full border border-green-200 uppercase tracking-wider">
                                Active
                            </span>
                        </div>
                    )}
                </div>

                <div className="p-6 lg:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-center group hover:bg-white hover:border-[#F54927]/30 transition-all duration-300">
                            <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest mb-1">Plan Identifier</p>
                            <h3 className="text-2xl font-black text-gray-900 uppercase group-hover:text-[#F54927] transition-colors">
                                {currentPlan?.name ?? (subscription.plankey ?? "Unknown Plan")}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[13px] text-gray-500">Started on:</span>
                                <span className="text-[13px] font-bold text-gray-700">{subscription.startdate ? formatDate(new Date(subscription.startdate)) : 'N/A'}</span>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-center relative overflow-hidden group hover:bg-white hover:border-[#F54927]/30 transition-all duration-300">
                            <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest mb-1">Next Payment Due</p>
                            <h3 className="text-2xl font-black text-[#F54927]">
                                {nextBillDateDisplay ? formatDate(nextBillDateDisplay) : 'N/A'}
                            </h3>
                            <p className="text-[13px] text-gray-500 mt-2 flex items-center gap-2">
                                <span>Days Remaining:</span>
                                <span className="font-bold px-2.5 py-1 bg-[#F54927] text-white rounded-lg text-[11px] uppercase shadow-sm group-hover:scale-105 transition-transform">
                                    {daysRemaining !== null ? `${daysRemaining} days` : '--'}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upgrade Card (Only if not yearly) */}
            {!isYearly && yearlyPlan && (
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#F54927] to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                    <div className="relative bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm p-6 lg:p-8">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                                        <Zap className="w-5 h-5 fill-current" />
                                    </div>
                                    <h4 className="font-black text-gray-900 text-lg tracking-tight">Upgrade to Yearly Growth</h4>
                                </div>
                                <p className="text-[14px] text-gray-500 leading-relaxed mb-6">
                                    Switch to the yearly plan now and secure your platform for the next 12 months. 
                                    Your new subscription will be extended from your current end date.
                                </p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {[
                                        "Save up to 30% annually",
                                        "Priority support & updates",
                                        "Seamless extension of service",
                                        "Single annual invoice"
                                    ].map((feature, i) => (
                                        <div key={i} className="flex items-center gap-2 text-[13px] text-gray-600 font-medium">
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            {feature}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="lg:w-80 p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Yearly Premium</p>
                                <div className="flex items-baseline gap-1 mb-1">
                                    <span className="text-[14px] font-bold text-gray-900">₹</span>
                                    <span className="text-4xl font-black text-gray-900">{(yearlyPlan.price || 0).toLocaleString()}</span>
                                </div>
                                <p className="text-[12px] text-gray-500 font-medium mb-6">/ year (Inc. taxes)</p>
                                
                                <button 
                                    onClick={handleUpgrade}
                                    disabled={isProcessing || !isRazorpayLoaded}
                                    className="w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-gray-200"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            Secure Yearly Plan
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                                
                                {nextYearDate && (
                                    <p className="mt-4 text-[11px] text-gray-400 font-medium italic leading-tight">
                                        Pay now to extend your subscription <br/> through <span className="text-gray-900 font-bold">{formatDate(nextYearDate)}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
