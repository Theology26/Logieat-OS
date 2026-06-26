<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class DeliveryRoute extends Model
{
    use HasUuids, BelongsToCompany;

    protected $table = 'routes'; // 'Route' clashes with the Route facade

    protected $fillable = [
        'company_id', 'courier_id', 'status', 'depot_lat', 'depot_lng', 'temperature',
        'total_distance_km', 'total_time_minutes', 'model_type', 'risk_summary',
        'started_at', 'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'risk_summary' => 'array',
            'depot_lat' => 'float',
            'depot_lng' => 'float',
            'total_distance_km' => 'float',
            'total_time_minutes' => 'float',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function assignments()
    {
        return $this->hasMany(RouteAssignment::class, 'route_id')->orderBy('sequence');
    }

    public function courier()
    {
        return $this->belongsTo(User::class, 'courier_id');
    }
}
