import { calculatePlanPrice } from '../src/lib/utils/pricing';

const mockMonthly = {
    price: 1100,
    code: 'monthly',
    discount_active: false
};

const mockYearly = {
    price: 12100,
    code: 'yearly',
    discount_active: true,
    discount_type: 'free_months',
    discount_free_months: 1
};

const mockFlat = {
    price: 1000,
    code: 'monthly',
    discount_active: true,
    discount_type: 'flat',
    discount_flat: 100
};

const mockExpired = {
    price: 1000,
    code: 'monthly',
    discount_active: true,
    discount_type: 'flat',
    discount_flat: 100,
    discount_expires_at: new Date(Date.now() - 10000).toISOString()
};

console.log("--- Testing Pricing Utility ---");

const res1 = calculatePlanPrice(mockMonthly);
console.log("Monthly (No Discount):", res1.finalPrice, res1.savingsLabel);

const res2 = calculatePlanPrice(mockYearly, 1100);
console.log("Yearly (1 Month Free + Yearly Saving):", res2.finalPrice, res2.savingsLabel, "Badge:", res2.badge);
// Monthly: 1100 * 12 = 13200
// Yearly Original: 12100 (Plan Saving = 1100)
// Free Month: 12100 / 12 = 1008.33
// Total Savings: 1100 + 1008 = 2108.
// Expected Label: "You save ₹2,108 annually"

const res3 = calculatePlanPrice(mockFlat);
console.log("Monthly (Flat Discount):", res3.finalPrice, res3.savingsLabel);

const res4 = calculatePlanPrice(mockExpired);
console.log("Monthly (Expired Discount):", res4.finalPrice, res4.savingsLabel || "None");

if (res2.totalSavings === 2108) console.log("✅ Yearly savings calculation correct");
else console.log("❌ Yearly savings calculation mismatch:", res2.totalSavings);

if (res4.finalPrice === 1000) console.log("✅ Expired discount handling correct");
else console.log("❌ Expired discount handling failed");
