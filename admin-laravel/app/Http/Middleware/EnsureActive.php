<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Blocks non-active accounts (e.g. couriers still pending approval). */
class EnsureActive
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->status !== 'active') {
            return response()->json(['message' => 'Account not active.'], 403);
        }

        return $next($request);
    }
}
