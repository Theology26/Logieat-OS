<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function share(Request $request): array
    {
        $user = $request->user();

        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $user?->only('id', 'name', 'role', 'email'),
                'company' => $user?->company?->only('id', 'name', 'catering_code', 'subscription_status'),
            ],
            'flash' => [
                'message' => $request->session()->get('flash'),
            ],
        ]);
    }
}
