<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OrderWebController extends Controller
{
    public function index()
    {
        return Inertia::render('Orders', [
            'orders' => Order::latest()->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'recipient_name' => 'required|string|max:160',
            'menu_name'      => 'required|string|max:200',
            'food_category'  => 'nullable|in:Santan,Basah,Kering',
            'quantity'       => 'required|integer|min:1',
            'price'          => 'nullable|numeric|min:0',
            'address'        => 'required|string|max:255',
            'latitude'       => 'required|numeric|between:-90,90',
            'longitude'      => 'required|numeric|between:-180,180',
            'deadline_at'    => 'nullable|date',
        ]);

        $data['code'] = Order::nextCode();
        $data['status'] = 'pending';
        Order::create($data);

        return redirect('/orders')->with('flash', 'Pesanan ditambahkan.');
    }
}
