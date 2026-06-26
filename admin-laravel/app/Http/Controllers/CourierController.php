<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class CourierController extends Controller
{
    /** Couriers awaiting approval (auto tenant-scoped). */
    public function pending(Request $request)
    {
        $this->authorizeManager($request);

        return response()->json(
            User::where('role', 'courier')->where('status', 'pending')->latest()->get()
        );
    }

    /** All couriers in this company. */
    public function index(Request $request)
    {
        $this->authorizeManager($request);

        return response()->json(
            User::where('role', 'courier')->latest()->get()
        );
    }

    public function approve(Request $request, string $id)
    {
        $this->authorizeManager($request);

        $courier = User::where('role', 'courier')->findOrFail($id);
        $courier->update([
            'status'      => 'active',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        // TODO Phase 3: notify courier (WS + FCM) that they were approved.
        return response()->json(['message' => 'Kurir disetujui.', 'courier' => $courier]);
    }

    public function reject(Request $request, string $id)
    {
        $this->authorizeManager($request);

        $courier = User::where('role', 'courier')->findOrFail($id);
        $courier->update(['status' => 'rejected']);

        return response()->json(['message' => 'Kurir ditolak.', 'courier' => $courier]);
    }

    private function authorizeManager(Request $request): void
    {
        abort_unless($request->user()->isManager(), 403, 'Hanya owner/admin.');
    }
}
