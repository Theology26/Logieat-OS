<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\PushService;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CourierWebController extends Controller
{
    public function index()
    {
        return Inertia::render('Couriers', [
            'couriers' => User::where('role', 'courier')->latest()
                ->get(['id', 'name', 'phone', 'email', 'vehicle_plate', 'status', 'created_at']),
            'cateringCode' => Auth::user()->company->catering_code,
        ]);
    }

    public function approve(string $id)
    {
        $courier = User::where('role', 'courier')->findOrFail($id);
        $courier->update(['status' => 'active', 'approved_by' => Auth::id(), 'approved_at' => now()]);

        app(PushService::class)->send(
            $courier->fcm_token,
            'Akun disetujui ✅',
            'Kamu sekarang bisa menerima tugas. Selamat bekerja!',
            ['kind' => 'approval'],
        );

        return back()->with('flash', "Kurir {$courier->name} disetujui.");
    }

    public function reject(string $id)
    {
        $courier = User::where('role', 'courier')->findOrFail($id);
        $courier->update(['status' => 'rejected']);

        return back()->with('flash', "Kurir {$courier->name} ditolak.");
    }
}
