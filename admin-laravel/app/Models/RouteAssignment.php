<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class RouteAssignment extends Model
{
    use HasUuids, BelongsToCompany;

    public $timestamps = false; // table has no created_at/updated_at

    protected $fillable = [
        'company_id', 'route_id', 'order_id', 'sequence', 'estimated_minutes', 'distance_km',
        'spoilage_risk', 'minutes_until_spoilage', 'status', 'pod_photo_url', 'pod_lat', 'pod_lng', 'delivered_at',
    ];

    protected function casts(): array
    {
        return [
            'estimated_minutes' => 'float',
            'distance_km' => 'float',
            'minutes_until_spoilage' => 'float',
            'delivered_at' => 'datetime',
        ];
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function route()
    {
        return $this->belongsTo(DeliveryRoute::class, 'route_id');
    }
}
