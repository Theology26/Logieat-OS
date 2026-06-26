<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    use HasUuids;

    protected $fillable = [
        'name', 'owner_name', 'phone', 'email', 'catering_code',
        'depot_address', 'depot_lat', 'depot_lng',
        'vehicle_capacity_default', 'subscription_status',
    ];

    protected function casts(): array
    {
        return [
            'depot_lat' => 'float',
            'depot_lng' => 'float',
            'vehicle_capacity_default' => 'integer',
        ];
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    /** Secure, non-sequential courier-join code, e.g. "DBC-7F3A9K". */
    public static function generateCateringCode(string $name): string
    {
        $letters = strtoupper(preg_replace('/[^A-Za-z]/', '', $name) . 'XXX');
        $prefix = substr($letters, 0, 3);

        do {
            $code = $prefix . '-' . strtoupper(bin2hex(random_bytes(3)));
        } while (static::where('catering_code', $code)->exists());

        return $code;
    }
}
