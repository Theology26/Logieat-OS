<?php

use App\Http\Controllers\Web\AnalyticsController;
use App\Http\Controllers\Web\CourierWebController;
use App\Http\Controllers\Web\DashboardController;
use App\Http\Controllers\Web\DispatchController;
use App\Http\Controllers\Web\FleetController;
use App\Http\Controllers\Web\OrderWebController;
use App\Http\Controllers\Web\WebAuthController;
use Illuminate\Support\Facades\Route;

// Guest
Route::get('/login', [WebAuthController::class, 'show'])->name('login')->middleware('guest');
Route::post('/login', [WebAuthController::class, 'login'])->middleware('guest');
Route::post('/logout', [WebAuthController::class, 'logout'])->name('logout');

// Authenticated admin web (session + tenant binding)
Route::middleware(['auth', 'tenant.bind'])->group(function () {
    Route::get('/', fn () => redirect('/dashboard'));
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('/orders', [OrderWebController::class, 'index'])->name('orders');
    Route::post('/orders', [OrderWebController::class, 'store']);

    Route::get('/couriers', [CourierWebController::class, 'index'])->name('couriers');
    Route::post('/couriers/{id}/approve', [CourierWebController::class, 'approve']);
    Route::post('/couriers/{id}/reject', [CourierWebController::class, 'reject']);

    Route::get('/statistik', [AnalyticsController::class, 'index'])->name('statistik');

    Route::get('/fleet', [FleetController::class, 'index'])->name('fleet');

    Route::get('/dispatch', [DispatchController::class, 'index'])->name('dispatch');
    Route::post('/dispatch/optimize', [DispatchController::class, 'optimize']);
    Route::post('/dispatch/assign', [DispatchController::class, 'assign']);
});
