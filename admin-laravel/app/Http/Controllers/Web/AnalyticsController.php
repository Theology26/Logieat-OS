<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\DeliveryRoute;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AnalyticsController extends Controller
{
    public function index()
    {
        return Inertia::render('Statistik', [
            'kpis'     => $this->kpis(),
            'trend'    => [
                'day'   => $this->trend('day', 30),
                'month' => $this->trend('month', 12),
                'sixmo' => $this->trend('month', 6),
                'year'  => $this->trend('year', 5),
            ],
            'couriers' => $this->courierRecap(),
        ]);
    }

    private function kpis(): array
    {
        $today = Order::whereDate('created_at', today());

        return [
            'sales_today'  => (float) (clone $today)->sum('price'),
            'orders_today' => (clone $today)->count(),
            'deliveries'   => Order::where('status', 'delivered')->count(),
            'fleet_km'     => round((float) DeliveryRoute::sum('total_distance_km'), 1),
            'on_time_pct'  => $this->onTimePct(),
        ];
    }

    private function onTimePct(): int
    {
        $base = DB::table('route_assignments as ra')
            ->join('orders as o', 'o.id', '=', 'ra.order_id')
            ->where('ra.company_id', app('currentCompanyId'))
            ->where('ra.status', 'delivered')
            ->whereNotNull('o.deadline_at')
            ->whereNotNull('ra.delivered_at');

        $total = (clone $base)->count();
        if ($total === 0) {
            return 100;
        }
        $onTime = (clone $base)->whereColumn('ra.delivered_at', '<=', 'o.deadline_at')->count();

        return (int) round($onTime / $total * 100);
    }

    /** Continuous time-bucketed series of sales + order count. */
    private function trend(string $unit, int $n): array
    {
        $fmt = match ($unit) {
            'day'   => '%Y-%m-%d',
            'month' => '%Y-%m',
            'year'  => '%Y',
        };
        $start = match ($unit) {
            'day'   => today()->subDays($n - 1),
            'month' => today()->startOfMonth()->subMonths($n - 1),
            'year'  => today()->startOfYear()->subYears($n - 1),
        };

        $rows = Order::selectRaw("DATE_FORMAT(created_at, '{$fmt}') k, SUM(price) sales, COUNT(*) cnt")
            ->where('created_at', '>=', $start)
            ->groupBy('k')
            ->get()
            ->keyBy('k');

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
            $cursor = match ($unit) {
                'day'   => $cursor->addDay(),
                'month' => $cursor->addMonth(),
                'year'  => $cursor->addYear(),
            };
        }

        return $out;
    }

    private function courierRecap(): array
    {
        return User::where('role', 'courier')->where('status', 'active')->get()
            ->map(function (User $c) {
                $delivered = DB::table('route_assignments')
                    ->where('company_id', $c->company_id)
                    ->where('status', 'delivered')
                    ->whereIn('route_id', fn ($q) => $q->select('id')->from('routes')->where('courier_id', $c->id))
                    ->count();
                $km = (float) DB::table('routes')->where('courier_id', $c->id)->sum('total_distance_km');

                return ['name' => $c->name, 'deliveries' => $delivered, 'km' => round($km, 1)];
            })
            ->sortByDesc('km')
            ->values()
            ->all();
    }
}
