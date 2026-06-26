<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        return Inertia::render('Dashboard', [
            'stats' => [
                'orders_pending'   => Order::where('status', 'pending')->count(),
                'orders_assigned'  => Order::where('status', 'assigned')->count(),
                'couriers'         => User::where('role', 'courier')->where('status', 'active')->count(),
                'couriers_pending' => User::where('role', 'courier')->where('status', 'pending')->count(),
            ],
        ]);
    }
}
