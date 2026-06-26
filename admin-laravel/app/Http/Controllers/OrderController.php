<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct()
    {
        // Orders are managed by owner/admin. Couriers receive stops via route_assignments.
    }

    public function index(Request $request)
    {
        $this->authorizeManager($request);

        $query = Order::query()->latest();
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $this->authorizeManager($request);

        $data = $request->validate([
            'recipient_name'  => 'required|string|max:160',
            'recipient_phone' => 'nullable|string|max:32',
            'menu_name'       => 'required|string|max:200',
            'food_category'   => 'nullable|in:Santan,Basah,Kering',
            'quantity'        => 'required|integer|min:1',
            'address'         => 'required|string|max:255',
            'maps_link'       => 'nullable|string|max:512',
            'latitude'        => 'required|numeric|between:-90,90',
            'longitude'       => 'required|numeric|between:-180,180',
            'deadline_at'     => 'nullable|date',
            'time_window_minutes' => 'nullable|numeric|min:1',
        ]);

        $data['code'] = Order::nextCode();
        $data['status'] = 'pending';

        return response()->json(Order::create($data), 201);
    }

    public function show(Request $request, string $id)
    {
        $this->authorizeManager($request);

        return response()->json(Order::findOrFail($id)); // tenant-scoped binding
    }

    public function update(Request $request, string $id)
    {
        $this->authorizeManager($request);

        $order = Order::findOrFail($id);
        $data = $request->validate([
            'recipient_name'  => 'sometimes|string|max:160',
            'recipient_phone' => 'nullable|string|max:32',
            'menu_name'       => 'sometimes|string|max:200',
            'food_category'   => 'nullable|in:Santan,Basah,Kering',
            'quantity'        => 'sometimes|integer|min:1',
            'address'         => 'sometimes|string|max:255',
            'maps_link'       => 'nullable|string|max:512',
            'latitude'        => 'sometimes|numeric|between:-90,90',
            'longitude'       => 'sometimes|numeric|between:-180,180',
            'deadline_at'     => 'nullable|date',
            'time_window_minutes' => 'nullable|numeric|min:1',
            'status'          => 'sometimes|in:pending,assigned,picked_up,delivered,cancelled',
        ]);

        $order->update($data);

        return response()->json($order);
    }

    public function destroy(Request $request, string $id)
    {
        $this->authorizeManager($request);

        $order = Order::findOrFail($id);
        abort_if($order->status !== 'pending', 422, 'Hanya pesanan pending yang bisa dihapus.');
        $order->delete();

        return response()->json(['message' => 'Pesanan dihapus.']);
    }

    private function authorizeManager(Request $request): void
    {
        abort_unless($request->user()->isManager(), 403, 'Hanya owner/admin.');
    }
}
