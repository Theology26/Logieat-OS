<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

/**
 * Sends push via the Expo Push API (works with EAS-built APKs; no Firebase service
 * account needed). For a bare FCM setup, swap this for the FCM HTTP v1 call.
 */
class PushService
{
    public function send(?string $token, string $title, string $body, array $data = []): void
    {
        if (! $token) {
            return;
        }
        try {
            Http::acceptJson()->timeout(8)->post('https://exp.host/--/api/v2/push/send', [
                'to' => $token,
                'title' => $title,
                'body' => $body,
                'data' => $data,
                'sound' => 'default',
                'channelId' => 'default',
                'priority' => 'high',
            ]);
        } catch (\Throwable $e) {
            // best-effort; never block the request on push delivery
        }
    }
}
