<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use App\Services\JwtService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class DispatchController extends Controller
{
    public function __construct(private JwtService $jwt) {}

    public function index()
    {
        return Inertia::render('Dispatch', $this->pageData());
    }

    /** Preview: proxy to Go /dispatch/optimize, re-render with the result. */
    public function optimize(Request $request)
    {
        $data = $request->validate([
            'order_ids'   => 'required|array|min:1',
            'order_ids.*' => 'string',
            'courier_id'  => 'nullable|string',
        ]);

        $result = $this->callGo('/dispatch/optimize', $data);

        return Inertia::render('Dispatch', $this->pageData($result));
    }

    /** Persist: proxy to Go /dispatch/assign, redirect back with flash. */
    public function assign(Request $request)
    {
        $data = $request->validate([
            'order_ids'   => 'required|array|min:1',
            'order_ids.*' => 'string',
            'courier_id'  => 'required|string',
        ]);

        $result = $this->callGo('/dispatch/assign', $data);

        if (isset($result['error']) || isset($result['message'])) {
            return redirect('/dispatch')->with('flash', $result['error'] ?? $result['message']);
        }

        return redirect('/dispatch')->with('flash', 'Tugas terkirim ke kurir (' . count($result['route'] ?? []) . ' titik).');
    }

    private function pageData(?array $result = null): array
    {
        return [
            'couriers' => User::where('role', 'courier')->where('status', 'active')->get(['id', 'name']),
            'orders'   => Order::where('status', 'pending')->latest()->get(),
            'result'   => $result,
        ];
    }

    private function callGo(string $path, array $data): array
    {
        $token = $this->jwt->issue(Auth::user());
        $url = rtrim(config('logieat.core_url'), '/') . $path;

        try {
            $resp = Http::withToken($token)->acceptJson()->timeout(35)->post($url, $data);

            return $resp->json() ?? ['error' => 'Respon kosong dari Go core.'];
        } catch (\Throwable $e) {
            return ['error' => 'Go core tidak terjangkau: ' . $e->getMessage()];
        }
    }
}
