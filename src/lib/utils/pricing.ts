export interface PricingResult {
  finalPrice: number;
  originalPrice: number;
  savingsLabel: string;
  planOffer: string;
  badge: string;
  showStrikethrough: boolean;
  savingsAmount: number;
  totalSavings: number;
}

/**
 * Calculates the discounted price and labels for a subscription plan based on its discount configuration.
 */
export const calculatePlanPrice = (plan: any, monthlyPrice?: number): PricingResult => {
  const basePrice = Number(plan.price) || 0;
  let originalPrice = basePrice;
  let finalPrice = basePrice;
  let badge = "";
  let planOffer = "";
  let showStrikethrough = false;
  let discountSavings = 0;

  const isYearly = plan.code === 'yearly';
  const now = new Date();
  const expiresAt = plan.discount_expires_at ? new Date(plan.discount_expires_at) : null;
  const isDiscountValid = plan.discount_active && (!expiresAt || expiresAt > now);

  if (isDiscountValid) {
    const type = plan.discount_type;
    
    switch (type) {
      case 'flat': {
        const flatAmount = Number(plan.discount_flat) || 0;
        discountSavings = flatAmount;
        finalPrice = Math.max(0, basePrice - flatAmount);
        planOffer = `₹${flatAmount.toLocaleString()} Off`;
        showStrikethrough = true;
        break;
      }
      case 'percentage': {
        const percent = Number(plan.discount_percentage) || 0;
        discountSavings = (basePrice * percent) / 100;
        finalPrice = Math.max(0, basePrice - discountSavings);
        planOffer = `${percent}% Off`;
        showStrikethrough = true;
        break;
      }
      case 'free_months': {
        if (isYearly) {
          const freeMonths = Number(plan.discount_free_months) || 0;
          // Calculate savings based on the yearly price divided by 12, floored as per user example
          discountSavings = Math.floor(basePrice / 12) * freeMonths;
          finalPrice = Math.max(0, basePrice - discountSavings);
          badge = `${freeMonths} ${freeMonths > 1 ? 'Months' : 'Month'} Free`;
          planOffer = `${freeMonths} ${freeMonths > 1 ? 'Months' : 'Month'} Free`;
          showStrikethrough = discountSavings > 0;
        }
        break;
      }
    }
  }

  // Handle Plan Savings (Yearly vs Monthly comparison)
  let planSavings = 0;
  if (isYearly && monthlyPrice) {
    const comparablePrice = monthlyPrice * 12;
    planSavings = Math.max(0, comparablePrice - basePrice);
    
    // We used to show comparablePrice as originalPrice here, but it confused the user.
    // Now we only use basePrice as originalPrice when a discount is active.
    // The "yearly savings" will still be shown in the savingsLabel.
  }

  const totalSavings = Math.round(isDiscountValid ? discountSavings : planSavings);
  let savingsLabel = "";

  if (totalSavings > 0) {
    if (isDiscountValid) {
      const type = plan.discount_type;
      if (type === 'percentage') {
        savingsLabel = `You save ${plan.discount_percentage}%`;
      } else {
        savingsLabel = `You save ₹${totalSavings.toLocaleString()}`;
      }
    } else if (planSavings > 0) {
      savingsLabel = `You save ₹${planSavings.toLocaleString()} annually`;
    }
  }

  return {
    finalPrice: Math.round(finalPrice),
    originalPrice,
    savingsLabel,
    planOffer,
    badge,
    showStrikethrough,
    savingsAmount: Math.round(discountSavings),
    totalSavings
  };
};

export interface ProratedPricingResult extends PricingResult {
  isProrated: boolean;
  daysRemaining: number;
  nextBillDate: Date;
}

/**
 * Calculates the prorated price for a plan based on its billing cycle and grace period.
 */
export const getProratedPricing = (plan: any, monthlyPrice?: number): ProratedPricingResult => {
  const basePricing = calculatePlanPrice(plan, monthlyPrice);
  const isYearly = plan.code === 'yearly';
  
  const now = new Date();
  
  if (isYearly) {
    const nextYear = new Date(now);
    nextYear.setFullYear(now.getFullYear() + 1);
    return { ...basePricing, isProrated: false, daysRemaining: 365, nextBillDate: nextYear };
  }

  const currentDay = now.getDate();
  const billDay = Number(plan.billgenerationdate) || 1;
  const gracePeriod = Number(plan.graceperiod) || 0;

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
    
    const pricePerDay = basePricing.finalPrice / daysInCycle;
    const proratedPrice = Math.ceil(pricePerDay * daysRemaining);
    
    return {
      ...basePricing,
      finalPrice: proratedPrice,
      isProrated: true,
      daysRemaining,
      nextBillDate
    };
  }

  // Full month case
  return {
    ...basePricing,
    isProrated: false,
    daysRemaining: 30,
    nextBillDate
  };
};


