<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class WebAuthController extends Controller
{
    public function show()
    {
        return Inertia::render('Login');
    }

    public function login(Request $request)
    {
        $cred = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::withoutGlobalScopes()->where('email', $cred['email'])->first();

        if (! $user || ! Hash::check($cred['password'], $user->password) || ! $user->isManager() || $user->status !== 'active') {
            throw ValidationException::withMessages([
                'email' => 'Kredensial salah, atau ini bukan akun owner/admin yang aktif.',
            ]);
        }

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return redirect()->intended('/dashboard');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }
}
