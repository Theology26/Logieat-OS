<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasUuids, BelongsToCompany;

    protected $fillable = [
        'company_id', 'code', 'recipient_name', 'recipient_phone', 'menu_name',
        'food_category', 'quantity', 'price', 'address', 'maps_link', 'latitude', 'longitude',
        'deadline_at', 'time_window_minutes', 'status', 'spoilage_risk',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'quantity' => 'integer',
            'price' => 'decimal:2',
            'time_window_minutes' => 'float',
            'deadline_at' => 'datetime',
        ];
    }

    /** Next per-company order code, e.g. "#1021". */
    public static function nextCode(): string
    {
        return '#' . (1021 + static::count()); // count() is tenant-scoped
    }
}
