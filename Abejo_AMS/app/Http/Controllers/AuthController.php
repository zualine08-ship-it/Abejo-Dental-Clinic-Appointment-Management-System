<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Login user with email and password
     */
    public function login(Request $request)
    {
        try {
            $validated = $request->validate([
                'email' => 'required|email',
                'password' => 'required|string|min:1',
            ]);

            Log::info('Login attempt', ['email' => $validated['email']]);

            $user = User::where('email', $validated['email'])->first();

            if (!$user) {
                Log::warning('Login failed: User not found', ['email' => $validated['email']]);
                return response()->json([
                    'message' => 'User not found.'
                ], 404);
            }

            if (!Hash::check($validated['password'], $user->password)) {
                Log::warning('Login failed: Invalid password', ['email' => $validated['email']]);
                return response()->json([
                    'message' => 'Invalid password.'
                ], 401);
            }

            // Authenticate the user with remember me option
            $rememberMe = $request->input('rememberMe', false);
            Auth::login($user, $rememberMe);

            Log::info('Login successful', ['user_id' => $user->id, 'email' => $user->email]);

            return response()->json([
                'message' => 'Login successful',
                'user' => $user,
            ], 200);
        } catch (ValidationException $e) {
            Log::warning('Login validation failed', ['errors' => $e->errors()]);
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Login error', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Login failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Logout user
     */
    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logout successful'
        ], 200);
    }

    /**
     * Get current authenticated user
     */
    public function me(Request $request)
    {
        return response()->json([
            'user' => Auth::user()
        ], 200);
    }

    /**
     * Register a new user (patient)
     */
    public function register(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'phone' => 'required|string|max:20',
                'age' => 'required|integer|min:1|max:120',
                'gender' => 'required|string|in:Male,Female,Other',
                'address' => 'required|string',
                'password' => 'required|string|min:8|confirmed',
                'role' => 'sometimes|in:admin,staff,patient',
            ]);

            // Create new user
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'age' => $validated['age'],
                'gender' => $validated['gender'],
                'address' => $validated['address'],
                'password' => Hash::make($validated['password']),
                'role' => $validated['role'] ?? 'patient', // Default to patient
            ]);

            Log::info('User registered successfully', ['user_id' => $user->id, 'email' => $user->email]);

            return response()->json([
                'message' => 'Registration successful',
                'user' => $user,
            ], 201);
        } catch (ValidationException $e) {
            Log::warning('Registration validation failed', ['errors' => $e->errors()]);
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Registration error', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Registration failed: ' . $e->getMessage()
            ], 500);
        }
    }
}