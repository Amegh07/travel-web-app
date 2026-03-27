export const healItinerary = (itinerary, userBudget) => {
    let totalCost = 0;
    
    if (itinerary?.daily_plan) {
        itinerary.daily_plan.forEach((day) => {
            if (day.activities) {
                day.activities.forEach((act, index) => {
                    // 1. FIX: Ensure cost is a number
                    const cost = Number(act.cost_estimate) || 0;
                    act.cost_estimate = cost;
                    totalCost += cost;

                    // 2. FIX: Automatic Transit Buffer
                    // If the AI didn't include transit, we "heal" the description
                    if (act.description && !act.description.toLowerCase().includes('transit')) {
                        act.description = `[30m Transit Included] ${act.description}`;
                    }

                    // 3. FIX: Sequential ID for React Keys
                    act.id = `day-${day.day}-act-${index}`;
                });
            }
        });
    }

    return {
        ...itinerary,
        total_calculated_cost: totalCost,
        is_over_budget: totalCost > userBudget,
        budget_gap: totalCost - userBudget
    };
};
