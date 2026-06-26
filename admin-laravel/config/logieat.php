<?php

return [
    // Shared HS256 secret — the Go core service validates the SAME token.
    'jwt_secret' => env('JWT_SECRET', 'change-me-shared-with-go'),
    'jwt_ttl_days' => env('JWT_TTL_DAYS', 7),

    // Go core service (dispatch bridge, realtime). The admin web proxies dispatch calls here.
    'core_url' => env('CORE_URL', 'http://127.0.0.1:8080'),
];
