<?php

namespace App\Models\Concerns;

use App\Models\Company;
use Illuminate\Database\Eloquent\Builder;

/**
 * Multi-tenancy: auto-scopes every query to the current company and auto-fills
 * company_id on create. "Current company" = app('currentCompanyId'), bound by the
 * JwtAuthenticate middleware from the token's company_id claim. When not bound
 * (console, public auth routes) the scope is a no-op.
 */
trait BelongsToCompany
{
    protected static function bootBelongsToCompany(): void
    {
        static::addGlobalScope('company', function (Builder $builder) {
            if (app()->bound('currentCompanyId')) {
                $builder->where($builder->getModel()->getTable() . '.company_id', app('currentCompanyId'));
            }
        });

        static::creating(function ($model) {
            if (empty($model->company_id) && app()->bound('currentCompanyId')) {
                $model->company_id = app('currentCompanyId');
            }
        });
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
