<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/** Web counterpart of the JWT tenant context: binds company_id from the session user. */
class BindTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            app()->instance('currentCompanyId', Auth::user()->company_id);
        }

        return $next($request);
    }
}
