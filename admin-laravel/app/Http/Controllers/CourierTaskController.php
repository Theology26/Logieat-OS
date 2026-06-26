<?php

namespace App\Http\Controllers;

use App\Models\DeliveryRoute;
use App\Models\Order;
use App\Models\RouteAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CourierTaskController extends Controller
{
    /** GET /api/courier/tasks — the logged-in courier's active route + ordered stops. */
    public function active(Request $request)
    {
        $user = $request->user();
        abort_unless($user->isCourier(), 403, 'Hanya kurir.');

        $route = DeliveryRoute::with(['assignments.order'])
            ->where('courier_id', $user->id)
            ->whereIn('status', ['assigned', 'in_progress'])
            ->latest()
            ->first();

        if (! $route) {
            return response()->json(['route' => null, 'stops' => []]);
        }

        return response()->json([
            'route' => [
                'id' => $route->id,
                'status' => $route->status,
                'total_distance_km' => $route->total_distance_km,
                'total_time_minutes' => $route->total_time_minutes,
                'depot_lat' => $route->depot_lat,
                'depot_lng' => $route->depot_lng,
            ],
            'stops' => $route->assignments->map(fn ($a) => [
                'id' => $a->id,
                'sequence' => $a->sequence,
                'status' => $a->status,
                'spoilage_risk' => $a->spoilage_risk,
                'distance_km' => $a->distance_km,
                'estimated_minutes' => $a->estimated_minutes,
                'minutes_until_spoilage' => $a->minutes_until_spoilage,
                'order' => [
                    'code' => $a->order->code,
                    'recipient_name' => $a->order->recipient_name,
                    'menu_name' => $a->order->menu_name,
                    'quantity' => $a->order->quantity,
                    'address' => $a->order->address,
                    'latitude' => $a->order->latitude,
                    'longitude' => $a->order->longitude,
                ],
            ]),
        ]);
    }

    /** POST /api/courier/routes/{route}/start — begin the run. */
    public function start(Request $request, string $route)
    {
        $r = $this->courierRoute($request, $route);
        if ($r->status === 'assigned') {
            $r->update(['status' => 'in_progress', 'started_at' => now()]);
        }

        return response()->json(['status' => $r->status]);
    }

    /** POST /api/courier/assignments/{assignment}/deliver — PoD photo + confirm. */
    public function deliver(Request $request, string $assignment)
    {
        $user = $request->user();
        abort_unless($user->isCourier(), 403, 'Hanya kurir.');

        $a = RouteAssignment::with('route')->findOrFail($assignment);
        abort_unless($a->route && $a->route->courier_id === $user->id, 403, 'Bukan tugasmu.');

        $data = $request->validate([
            'photo'     => 'required|image|max:8192',
            'latitude'  => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
        ]);

        $path = $request->file('photo')->store('pod', 'public');

        $a->update([
            'status'        => 'delivered',
            'pod_photo_url' => Storage::url($path),
            'pod_lat'       => $data['latitude'] ?? null,
            'pod_lng'       => $data['longitude'] ?? null,
            'delivered_at'  => now(),
        ]);
        Order::where('id', $a->order_id)->update(['status' => 'delivered']);

        // TODO Phase 3: notify owner (WS + FCM) of delivery.
        return response()->json(['message' => 'Pengantaran terkonfirmasi.', 'assignment_id' => $a->id]);
    }

    /** POST /api/courier/routes/{route}/complete — back at depot, finish. */
    public function complete(Request $request, string $route)
    {
        $r = $this->courierRoute($request, $route);
        $r->update(['status' => 'completed', 'completed_at' => now()]);

        return response()->json(['status' => 'completed']);
    }

    /** POST /api/courier/push-token — save the device's Expo/FCM push token. */
    public function pushToken(Request $request)
    {
        $data = $request->validate(['token' => 'required|string|max:255']);
        $request->user()->update(['fcm_token' => $data['token']]);

        return response()->json(['ok' => true]);
    }

    private function courierRoute(Request $request, string $routeId): DeliveryRoute
    {
        abort_unless($request->user()->isCourier(), 403, 'Hanya kurir.');

        return DeliveryRoute::where('courier_id', $request->user()->id)->findOrFail($routeId);
    }
}
