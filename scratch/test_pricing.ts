import { calculatePlanPrice } from './src/lib/utils/pricing';

const monthlyPlan = { code: 'monthly', price: 1000 };
const yearlyPlan = { code: 'yearly', price: 10000 };

console.log("--- FLAT DISCOUNT ---");
console.log(calculatePlanPrice({ ...monthlyPlan, discount_active: true, discount_type: 'flat', discount_flat: 200 }));
// Expected: finalPrice 800, originalPrice 1000, savingsLabel "You save ₹200", showStrikethrough true

console.log("\n--- PERCENTAGE DISCOUNT (Monthly) ---");
console.log(calculatePlanPrice({ ...monthlyPlan, discount_active: true, discount_type: 'percentage', discount_percentage: 10 }));
// Expected: finalPrice 900, originalPrice 1000, savingsLabel "You save 10%", showStrikethrough true

console.log("\n--- PERCENTAGE DISCOUNT (Yearly) ---");
console.log(calculatePlanPrice({ ...yearlyPlan, discount_active: true, discount_type: 'percentage', discount_percentage: 10 }, 1000));
// Expected: finalPrice 9000, originalPrice 12000, savingsLabel "You save 10%", showStrikethrough true (savingsLabel follows user req)

console.log("\n--- FREE DAYS (Monthly) ---");
console.log(calculatePlanPrice({ ...monthlyPlan, discount_active: true, discount_type: 'free_days', discount_free_days: 7 }));
// Expected: finalPrice ~767, originalPrice 1000, badge "7 Days Free", showStrikethrough false, savingsLabel ""

console.log("\n--- FREE MONTHS (Yearly) ---");
console.log(calculatePlanPrice({ ...yearlyPlan, discount_active: true, discount_type: 'free_months', discount_free_months: 1 }, 1000));
// Expected: finalPrice ~9167, originalPrice 12000, badge "1 Month Free", showStrikethrough false, savingsLabel ""
