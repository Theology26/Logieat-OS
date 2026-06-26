<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\JwtService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class JwtAuthenticate
{
    public function __construct(private JwtService $jwt) {}

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        if (! $token) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        try {
            $payload = $this->jwt->decode($token);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Invalid or expired token.'], 401);
        }

        // Look up across tenants (scope not yet bound), then bind the tenant context.
        $user = User::withoutGlobalScopes()->find($payload->sub);
        if (! $user) {
            return response()->json(['message' => 'User not found.'], 401);
        }

        app()->instance('currentCompanyId', $payload->company_id);
        Auth::setUser($user);
        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
