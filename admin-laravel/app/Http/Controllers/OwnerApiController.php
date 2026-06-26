<?php

namespace App\Http\Controllers;

use App\Models\DeliveryRoute;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/** JSON endpoints for the catering (owner) mobile app. Tenant-scoped via JWT. */
class OwnerApiController extends Controller
{
    private function manager(): void
    {
        abort_unless(Auth::user()->isManager(), 403, 'Hanya owner/admin.');
    }

    public function analytics()
    {
        $this->manager();
        $today = Order::whereDate('created_at', today());

        return response()->json([
            'kpis' => [
                'sales_today'  => (float) (clone $today)->sum('price'),
                'orders_today' => (clone $today)->count(),
                'deliveries'   => Order::where('status', 'delivered')->count(),
                'fleet_km'     => round((float) DeliveryRoute::sum('total_distance_km'), 1),
                'on_time_pct'  => $this->onTimePct(),
            ],
            'trend' => [
                'day'   => $this->trend('day', 30),
                'month' => $this->trend('month', 12),
                'sixmo' => $this->trend('month', 6),
                'year'  => $this->trend('year', 5),
            ],
            'couriers' => $this->courierRecap(),
        ]);
    }

    public function fleetLocations()
    {
        $this->manager();
        $user = Auth::user();

        return response()->json([
            'couriers'  => User::where('role', 'courier')->where('status', 'active')->get(['id', 'name']),
            'locations' => DB::table('current_locations')->where('company_id', $user->company_id)
                ->get(['courier_id', 'latitude', 'longitude', 'heading', 'recorded_at']),
            'depot'     => ['lat' => $user->company->depot_lat, 'lng' => $user->company->depot_lng],
        ]);
    }

    private function onTimePct(): int
    {
        $base = DB::table('route_assignments as ra')
            ->join('orders as o', 'o.id', '=', 'ra.order_id')
            ->where('ra.company_id', app('currentCompanyId'))
            ->where('ra.status', 'delivered')->whereNotNull('o.deadline_at')->whereNotNull('ra.delivered_at');
        $total = (clone $base)->count();
        if ($total === 0) return 100;
        return (int) round((clone $base)->whereColumn('ra.delivered_at', '<=', 'o.deadline_at')->count() / $total * 100);
    }

    private function trend(string $unit, int $n): array
    {
        $fmt = match ($unit) { 'day' => '%Y-%m-%d', 'month' => '%Y-%m', 'year' => '%Y' };
        $start = match ($unit) {
            'day'   => today()->subDays($n - 1),
            'month' => today()->startOfMonth()->subMonths($n - 1),
            'year'  => today()->startOfYear()->subYears($n - 1),
        };
        $rows = Order::selectRaw("DATE_FORMAT(created_at, '{$fmt}') k, SUM(price) sales, COUNT(*) cnt")
            ->where('created_at', '>=', $start)->groupBy('k')->get()->keyBy('k');

        $out = [];
        $cursor = $start->copy();
        for ($i = 0; $i < $n; $i++) {
            $key = $cursor->format(match ($unit) { 'day' => 'Y-m-d', 'month' => 'Y-m', 'year' => 'Y' });
            $row = $rows->get($key);
            $out[] = [
                'label'  => $cursor->translatedFormat(match ($unit) { 'day' => 'd M', 'month' => 'M y', 'year' => 'Y' }),
                'sales'  => (float) ($row->sales ?? 0),
                'orders' => (int) ($row->cnt ?? 0),
            ];
            $cursor = match ($unit) { 'day' => $cursor->addDay(), 'month' => $cursor->addMonth(), 'year' => $cursor->addYear() };
        }
        return $out;
    }

    private function courierRecap(): array
    {
        return User::where('role', 'courier')->where('status', 'active')->get()
            ->map(fn (User $c) => [
                'name' => $c->name,
                'deliveries' => DB::table('route_assignments')->where('company_id', $c->company_id)->where('status', 'delivered')
                    ->whereIn('route_id', fn ($q) => $q->select('id')->from('routes')->where('courier_id', $c->id))->count(),
                'km' => round((float) DB::table('routes')->where('courier_id', $c->id)->sum('total_distance_km'), 1),
            ])->sortByDesc('km')->values()->all();
    }
}
