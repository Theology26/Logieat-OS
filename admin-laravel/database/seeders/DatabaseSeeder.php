<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class DatabaseSeeder extends Seeder
{
    // Demo tenant for local runs: one catering company with an owner, an approved
    // courier, and a batch of pending orders ready to dispatch.
    public function run(): void
    {
        $company = Company::updateOrCreate(
            ['email' => 'owner@bahagia.id'],
            [
                'name' => 'Dapur Bahagia',
                'owner_name' => 'Bu Ratna',
                'phone' => '08123456789',
                'catering_code' => 'DAP-DEMO01',
                'depot_address' => 'Jl. Sudirman No. 1, Jakarta Pusat',
                'depot_lat' => -6.2146,
                'depot_lng' => 106.8451,
                'vehicle_capacity_default' => 100,
                'subscription_status' => 'active',
            ],
        );

        User::updateOrCreate(
            ['company_id' => $company->id, 'email' => 'owner@bahagia.id'],
            [
                'role' => 'owner',
                'status' => 'active',
                'name' => 'Bu Ratna',
                'phone' => '08123456789',
                'password' => 'password',
            ],
        );

        User::updateOrCreate(
            ['company_id' => $company->id, 'email' => 'budi@bahagia.id'],
            [
                'role' => 'courier',
                'status' => 'active',
                'name' => 'Budi Santoso',
                'phone' => '08220001111',
                'password' => 'password',
                'vehicle_plate' => 'B1234XX',
                'vehicle_capacity' => 80,
                'approved_at' => now(),
            ],
        );

        $orders = [
            ['SMP Negeri 12', 'Nasi + Opor Ayam', 'Santan', 40, -6.2010, 106.8290],
            ['SD Negeri 03', 'Nasi + Sop Sayur', 'Basah', 30, -6.2280, 106.8520],
            ['SMA Negeri 7', 'Nasi + Tempe Bacem', 'Kering', 50, -6.1950, 106.8600],
            ['SD Negeri 15', 'Nasi + Gulai Telur', 'Santan', 25, -6.2350, 106.8330],
            ['SMP Negeri 5', 'Nasi + Tumis Buncis', 'Basah', 35, -6.2090, 106.8700],
            ['SD Negeri 21', 'Nasi + Ayam Goreng', 'Kering', 45, -6.2410, 106.8480],
        ];

        foreach ($orders as $i => [$recipient, $menu, $category, $qty, $lat, $lng]) {
            Order::updateOrCreate(
                ['company_id' => $company->id, 'code' => '#' . (1021 + $i)],
                [
                    'recipient_name' => $recipient,
                    'recipient_phone' => '0812000' . str_pad((string) $i, 4, '0', STR_PAD_LEFT),
                    'menu_name' => $menu,
                    'food_category' => $category,
                    'quantity' => $qty,
                    'price' => $qty * 15000,
                    'address' => $recipient . ', Jakarta',
                    'latitude' => $lat,
                    'longitude' => $lng,
                    'deadline_at' => Carbon::now()->addHours(3),
                    'status' => 'pending',
                ],
            );
        }
    }
}
