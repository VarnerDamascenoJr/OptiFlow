import { round } from "./shared/numbers.js";

export default function evaluatePlan(scenario, plan) {
  const servedOrderIds = [];
  let totalDistance = 0;
  let totalDemand = 0;
  let totalLateMinutes = 0;
  const vehicleUtilization = [];

  for (const route of plan.routes) {
    totalDistance += route.totalDistance;
    totalDemand += route.usedCapacity;
    vehicleUtilization.push({
      vehicleId: route.vehicleId,
      usedCapacity: route.usedCapacity,
      capacity: route.capacity,
      utilizationRate: route.capacity === 0 ? 0 : round(route.usedCapacity / route.capacity, 4)
    });

    for (const stop of route.stops) {
      totalLateMinutes += stop.lateMinutes;

      if (stop.type === "order") {
        servedOrderIds.push(stop.orderId);
      }
    }
  }

  const distanceCost = totalDistance * scenario.costs.distanceUnitCost;
  const latenessCost = totalLateMinutes * scenario.costs.lateMinutePenalty;
  const unassignedCost = plan.unassignedOrderIds.length * scenario.costs.unassignedOrderPenalty;
  const totalCost = distanceCost + latenessCost + unassignedCost;

  return {
    servedOrders: servedOrderIds.length,
    unassignedOrders: plan.unassignedOrderIds.length,
    totalDemand: totalDemand,
    totalDistance: round(totalDistance, 2),
    totalLateMinutes: round(totalLateMinutes, 2),
    distanceCost: round(distanceCost, 2),
    latenessCost: round(latenessCost, 2),
    unassignedCost: round(unassignedCost, 2),
    totalCost: round(totalCost, 2),
    vehicleUtilization: vehicleUtilization
  };
}
