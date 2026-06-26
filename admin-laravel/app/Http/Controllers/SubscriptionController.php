<?php

namespace App\Http\Controllers;

use App\Models\Subscription;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    /** Mock-gateway activation — flips the company to 'active'. */
    public function activate(Request $request)
    {
        $data = $request->validate([
            'plan'   => 'required|in:pro_monthly,pro_yearly',
            'method' => 'required|in:qris,va,ewallet',
        ]);

        $user = $request->user();
        abort_unless($user->role === 'owner', 403, 'Hanya owner yang bisa berlangganan.');

        $company = $user->company;
        $months = $data['plan'] === 'pro_yearly' ? 12 : 1;
        $amount = $data['plan'] === 'pro_yearly' ? 2900000 : 299000;

        $subscription = Subscription::create([
            'company_id'   => $company->id,
            'plan'         => $data['plan'],
            'amount'       => $amount,
            'method'       => $data['method'],
            'status'       => 'active',
            'period_start' => now(),
            'period_end'   => now()->addMonths($months),
            'paid_at'      => now(),
        ]);

        $company->update(['subscription_status' => 'active']);

        return response()->json([
            'message'      => 'Langganan aktif.',
            'subscription' => $subscription,
            'company'      => $company->fresh(),
        ]);
    }
}
