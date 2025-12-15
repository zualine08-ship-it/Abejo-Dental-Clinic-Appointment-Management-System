<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class PatientMiddleware
{
    /**
     * Handle an incoming request.
     * Only allow users with 'patient' role to access.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!Auth::check()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Please log in.'
            ], 401);
        }

        /** @var \App\Models\User $user */
        $user = Auth::user();
        if ($user->role !== 'patient') {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Patient account required.'
            ], 403);
        }

        return $next($request);
    }
}
