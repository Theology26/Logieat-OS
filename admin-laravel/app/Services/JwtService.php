<?php

namespace App\Services;

use App\Models\User;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * HS256 JWT shared with the Go core service. Claims: sub (user id),
 * company_id, role. Go validates with the same JWT_SECRET.
 */
class JwtService
{
    private string $secret;
    private string $alg = 'HS256';

    public function __construct()
    {
        $this->secret = (string) config('logieat.jwt_secret');
    }

    public function issue(User $user): string
    {
        $now = time();
        $ttl = (int) config('logieat.jwt_ttl_days', 7) * 86400;

        return JWT::encode([
            'sub' => $user->id,
            'company_id' => $user->company_id,
            'role' => $user->role,
            'iat' => $now,
            'exp' => $now + $ttl,
        ], $this->secret, $this->alg);
    }

    public function decode(string $token): object
    {
        return JWT::decode($token, new Key($this->secret, $this->alg));
    }
}
