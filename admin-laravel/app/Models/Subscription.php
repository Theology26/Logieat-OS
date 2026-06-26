<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    use HasUuids, BelongsToCompany;

    protected $fillable = [
        'company_id', 'plan', 'amount', 'method', 'status',
        'period_start', 'period_end', 'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'period_start' => 'datetime',
            'period_end' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }
}
