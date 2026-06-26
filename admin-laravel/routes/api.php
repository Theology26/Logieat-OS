<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CourierController;
use App\Http\Controllers\CourierTaskController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\OwnerApiController;
use App\Http\Controllers\SubscriptionController;
use Illuminate\Support\Facades\Route;

// ── Public auth ──────────────────────────────────────────────
Route::post('/auth/register-owner', [AuthController::class, 'registerOwner']);
Route::post('/auth/register-courier', [AuthController::class, 'registerCourier']);
Route::post('/auth/login', [AuthController::class, 'login']);

// ── Authenticated (JWT) ──────────────────────────────────────
Route::middleware('jwt.auth')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Owner subscription (mock gateway)
    Route::post('/subscriptions/activate', [SubscriptionController::class, 'activate']);

    // Courier approval flow (owner/admin)
    Route::get('/couriers', [CourierController::class, 'index']);
    Route::get('/couriers/pending', [CourierController::class, 'pending']);
    Route::post('/couriers/{id}/approve', [CourierController::class, 'approve']);
    Route::post('/couriers/{id}/reject', [CourierController::class, 'reject']);

    // Orders (owner/admin)
    Route::apiResource('orders', OrderController::class);

    // Catering (owner) app
    Route::get('/analytics', [OwnerApiController::class, 'analytics']);
    Route::get('/fleet/locations', [OwnerApiController::class, 'fleetLocations']);

    // Courier app
    Route::get('/courier/tasks', [CourierTaskController::class, 'active']);
    Route::post('/courier/routes/{route}/start', [CourierTaskController::class, 'start']);
    Route::post('/courier/routes/{route}/complete', [CourierTaskController::class, 'complete']);
    Route::post('/courier/assignments/{assignment}/deliver', [CourierTaskController::class, 'deliver']);
    Route::post('/courier/push-token', [CourierTaskController::class, 'pushToken']);

    // Phase 2+: dispatch trigger (Go core), analytics…
});
