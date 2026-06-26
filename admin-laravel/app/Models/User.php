<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasUuids, Notifiable, BelongsToCompany;

    protected $fillable = [
        'company_id', 'role', 'status', 'name', 'email', 'phone', 'password',
        'vehicle_plate', 'vehicle_capacity', 'fcm_token', 'approved_by', 'approved_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'approved_at' => 'datetime',
            'vehicle_capacity' => 'integer',
        ];
    }

    public function isCourier(): bool
    {
        return $this->role === 'courier';
    }

    public function isManager(): bool
    {
        return in_array($this->role, ['owner', 'admin'], true);
    }
}
