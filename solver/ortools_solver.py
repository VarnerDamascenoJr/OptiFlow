"""JSON bridge for the deterministic delivery model, solved with OR-Tools CP-SAT."""

import json
import sys
from decimal import Decimal


def decimal_scale(values):
    places = max((max(0, -Decimal(str(value)).normalize().as_tuple().exponent)
                  for value in values), default=0)
    if places > 6:
        raise ValueError("or-tools supports at most six decimal places in scenario numbers")
    return 10 ** places


def scaled(value, scale):
    result = int(Decimal(str(value)) * scale)
    if abs(result) > 10 ** 12:
        raise ValueError("or-tools scaled input exceeds the supported numeric range (10^12)")
    return result


def solve(scenario, options):
    try:
        import ortools
        from ortools.sat.python import cp_model
    except ImportError as error:
        raise ValueError("OR-Tools is not installed; install requirements-solver.txt in .venv") from error

    orders = scenario["orders"]
    vehicles = scenario["vehicles"]
    matrix = scenario["distanceMatrix"]
    location_ids = [location["id"] for location in scenario["locations"]]
    constraints = scenario.get("constraints", {})
    temporal_values = [scenario["operation"]["startTimeMinutes"]]
    temporal_values += [matrix[a][b] for a in location_ids for b in location_ids]
    temporal_values += [order["serviceTimeMinutes"] for order in orders]
    temporal_values += [order["timeWindow"][key] for order in orders
                       for key in ("startMinutes", "endMinutes")]
    temporal_values += [vehicle["maxDistance"] for vehicle in vehicles if "maxDistance" in vehicle]
    time_scale = decimal_scale(temporal_values)
    quantity_scale = decimal_scale([order["demand"] for order in orders] +
                                   [vehicle["capacity"] for vehicle in vehicles])
    cost_scale = decimal_scale([scenario["costs"][key] for key in
                               ("distanceUnitCost", "lateMinutePenalty", "unassignedOrderPenalty")])
    distance = {a: {b: scaled(matrix[a][b], time_scale) for b in location_ids}
                for a in location_ids}
    start = scaled(scenario["operation"]["startTimeMinutes"], time_scale)
    durations = [scaled(order["serviceTimeMinutes"], time_scale) for order in orders]
    window_starts = [scaled(order["timeWindow"]["startMinutes"], time_scale) - start
                     for order in orders]
    window_ends = [scaled(order["timeWindow"]["endMinutes"], time_scale) - start
                   for order in orders]
    max_distance = max(value for row in distance.values() for value in row.values())
    horizon = max([0] + window_starts) + sum(durations) + (len(orders) + 1) * max_distance
    if horizon > 10 ** 12:
        raise ValueError("or-tools time horizon exceeds the supported numeric range (10^12)")
    late_bound = max(0, horizon - min([0] + window_ends))
    model = cp_model.CpModel()
    assignments = [[] for _ in orders]
    route_arcs = []
    distance_terms = []
    late_terms = []

    for v, vehicle in enumerate(vehicles):
        locations = [vehicle["startLocationId"]] + [order["locationId"] for order in orders]
        empty = model.new_bool_var(f"empty_{v}")
        assigned = [model.new_bool_var(f"assigned_{v}_{o}") for o in range(len(orders))]
        starts = [model.new_int_var(0, horizon, f"start_{v}_{o}") for o in range(len(orders))]
        arcs = [(0, 0, empty)]
        for o, selected in enumerate(assigned):
            assignments[o].append(selected)
            arcs.append((o + 1, o + 1, selected.Not()))
            model.add(selected <= empty.Not())
            model.add(starts[o] == 0).only_enforce_if(selected.Not())
            model.add(starts[o] >= window_starts[o]).only_enforce_if(selected)
            late = model.new_int_var(0, late_bound, f"late_{v}_{o}")
            model.add(late == 0).only_enforce_if(selected.Not())
            model.add(late >= starts[o] - window_ends[o]).only_enforce_if(selected)
            if constraints.get("hardTimeWindows"):
                model.add(starts[o] <= window_ends[o]).only_enforce_if(selected)
            late_terms.append(late)
        model.add(sum(assigned) >= empty.Not())
        model.add(sum(scaled(order["demand"], quantity_scale) * selected
                      for order, selected in zip(orders, assigned)) <=
                  scaled(vehicle["capacity"], quantity_scale))
        route_distance = [distance[locations[0]][locations[0]] * empty]
        for i in range(len(locations)):
            for j in range(len(locations)):
                if i == j:
                    continue
                arc = model.new_bool_var(f"arc_{v}_{i}_{j}")
                arcs.append((i, j, arc))
                travel = distance[locations[i]][locations[j]]
                route_distance.append(travel * arc)
                if j != 0:
                    departure = 0 if i == 0 else starts[i - 1] + durations[i - 1]
                    model.add(starts[j - 1] >= departure + travel).only_enforce_if(arc)
        model.add_circuit(arcs)
        if constraints.get("maxRouteDistance"):
            model.add(sum(route_distance) <= scaled(vehicle["maxDistance"], time_scale))
        distance_terms.extend(route_distance)
        route_arcs.append(arcs)

    unassigned = []
    for o, selected in enumerate(assignments):
        missing = model.new_bool_var(f"unassigned_{o}")
        model.add(sum(selected) + missing == 1)
        unassigned.append(missing)
    costs = scenario["costs"]
    model.minimize(scaled(costs["distanceUnitCost"], cost_scale) * sum(distance_terms) +
                   scaled(costs["lateMinutePenalty"], cost_scale) * sum(late_terms) +
                   scaled(costs["unassignedOrderPenalty"], cost_scale) * time_scale * sum(unassigned))
    invalid = model.validate()
    if invalid:
        raise ValueError("or-tools invalid model: " + invalid)
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = options["timeoutMs"] / 1000
    solver.parameters.num_search_workers = 1
    solver.parameters.random_seed = 0
    status = solver.solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise ValueError("or-tools returned " + solver.status_name(status) +
                         " without a feasible plan (check constraints or increase timeoutMs)")

    routes = []
    for arcs in route_arcs:
        successors = {i: j for i, j, literal in arcs if solver.boolean_value(literal)}
        route = []
        current = successors[0]
        while current != 0:
            route.append(orders[current - 1]["id"])
            current = successors[current]
        routes.append(route)
    objective_scale = time_scale * cost_scale
    return {
        "routes": routes,
        "scales": {"time": time_scale, "quantity": quantity_scale},
        "solverInfo": {
            "engine": "or-tools-cp-sat",
            "version": ortools.__version__,
            "status": solver.status_name(status),
            "objectiveValue": solver.objective_value / objective_scale,
            "bestObjectiveBound": solver.best_objective_bound / objective_scale,
            "wallTimeMs": solver.wall_time * 1000,
        },
    }


if __name__ == "__main__":
    try:
        payload = json.load(sys.stdin, parse_float=Decimal)
        print(json.dumps(solve(payload["scenario"], payload["options"])))
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
