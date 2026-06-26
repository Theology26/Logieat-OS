<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\JwtService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class FleetController extends Controller
{
    public function __construct(private JwtService $jwt) {}

    public function index()
    {
        $user = Auth::user();
        $core = rtrim(config('logieat.core_url'), '/');

        return Inertia::render('Fleet', [
            'couriers'  => User::where('role', 'courier')->where('status', 'active')->get(['id', 'name']),
            'locations' => DB::table('current_locations')
                ->where('company_id', $user->company_id)
                ->get(['courier_id', 'latitude', 'longitude', 'heading', 'recorded_at']),
            'depot'   => ['lat' => $user->company->depot_lat, 'lng' => $user->company->depot_lng],
            'wsUrl'   => preg_replace('/^http/', 'ws', $core) . '/ws',
            'wsToken' => $this->jwt->issue($user), // browser opens the Go WS with this
        ]);
    }
}
