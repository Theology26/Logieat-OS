<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\User;
use App\Services\JwtService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function __construct(private JwtService $jwt) {}

    /** Owner registration → creates company + owner. Subscription activated separately. */
    public function registerOwner(Request $request)
    {
        $data = $request->validate([
            'company_name' => 'required|string|max:160',
            'owner_name'   => 'required|string|max:120',
            'phone'        => 'required|string|max:32',
            'email'        => 'required|email|max:160|unique:companies,email|unique:users,email',
            'password'     => ['required', 'confirmed', Password::min(8)],
            'depot_address' => 'nullable|string|max:255',
            'depot_lat'    => 'nullable|numeric',
            'depot_lng'    => 'nullable|numeric',
        ]);

        $company = Company::create([
            'name'          => $data['company_name'],
            'owner_name'    => $data['owner_name'],
            'phone'         => $data['phone'],
            'email'         => $data['email'],
            'catering_code' => Company::generateCateringCode($data['company_name']),
            'depot_address' => $data['depot_address'] ?? null,
            'depot_lat'     => $data['depot_lat'] ?? null,
            'depot_lng'     => $data['depot_lng'] ?? null,
            'subscription_status' => 'inactive',
        ]);

        $owner = User::create([
            'company_id' => $company->id,
            'role'       => 'owner',
            'status'     => 'active',
            'name'       => $data['owner_name'],
            'email'      => $data['email'],
            'phone'      => $data['phone'],
            'password'   => $data['password'],
        ]);

        return response()->json([
            'token'   => $this->jwt->issue($owner),
            'user'    => $owner,
            'company' => $company,
            'next'    => 'subscription', // owner must activate a subscription
        ], 201);
    }

    /** Courier registration via Catering ID → created as 'pending' (awaits admin approval). */
    public function registerCourier(Request $request)
    {
        $data = $request->validate([
            'catering_code' => 'required|string',
            'name'          => 'required|string|max:120',
            'phone'         => 'required|string|max:32',
            'vehicle_plate' => 'nullable|string|max:20',
            'email'         => 'nullable|email|max:160',
            'password'      => ['required', Password::min(6)],
        ]);

        $company = Company::where('catering_code', $data['catering_code'])->first();
        if (! $company) {
            return response()->json(['message' => 'Catering ID tidak ditemukan.'], 422);
        }

        $courier = User::create([
            'company_id'    => $company->id,
            'role'          => 'courier',
            'status'        => 'pending',
            'name'          => $data['name'],
            'email'         => $data['email'] ?? null,
            'phone'         => $data['phone'],
            'vehicle_plate' => $data['vehicle_plate'] ?? null,
            'password'      => $data['password'],
        ]);

        return response()->json([
            'message' => "Permintaan terkirim. Menunggu persetujuan admin {$company->name}.",
            'company' => ['name' => $company->name],
            'status'  => 'pending',
        ], 201);
    }

    /** Email + password login → JWT. Pending couriers are blocked. */
    public function login(Request $request)
    {
        $data = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::withoutGlobalScopes()->where('email', $data['email'])->first();
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Email atau kata sandi salah.'], 401);
        }
        if ($user->status === 'pending') {
            return response()->json(['message' => 'Akun kurir menunggu persetujuan admin.'], 403);
        }
        if ($user->status !== 'active') {
            return response()->json(['message' => 'Akun tidak aktif.'], 403);
        }

        return response()->json([
            'token' => $this->jwt->issue($user),
            'user'  => $user,
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'user'    => $user,
            'company' => $user->company,
        ]);
    }
}
