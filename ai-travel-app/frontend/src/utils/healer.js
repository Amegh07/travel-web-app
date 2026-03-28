export const healItinerary = (itinerary, userBudget) => {
    // Deep-clone to avoid mutating the original object (Bug #9 fix)
    const cloned = JSON.parse(JSON.stringify(itinerary));
    let totalCost = 0;

    if (cloned?.daily_plan) {
        cloned.daily_plan.forEach((day) => {
            if (day.activities) {
                day.activities.forEach((act, index) => {
                    // 1. Ensure cost is always a number
                    const cost = Number(act.cost_estimate) || 0;
                    act.cost_estimate = cost;
                    totalCost += cost;

                    // 2. Sequential ID for React keys
                    act.id = `day-${day.day}-act-${index}`;
                    // Note: transit buffer is handled by transitToNext.estimatedMinutes
                    // DO NOT inject visible text labels into description (Bug #17 fix)
                });
            }
        });
    }

    return {
        ...cloned,
        total_calculated_cost: totalCost,
        is_over_budget: totalCost > userBudget,
        budget_gap: totalCost - userBudget
    };
};
