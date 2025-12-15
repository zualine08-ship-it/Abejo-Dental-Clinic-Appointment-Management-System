<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CorsMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:5175',
            'http://localhost:5176',
            'http://localhost:3000',
            'http://localhost',
            'http://127.0.0.1',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
            'http://127.0.0.1:5175',
            'http://127.0.0.1:5176',
            'http://127.0.0.1:3000',
        ];

        $origin = $request->header('Origin');

        // Handle preflight requests
        if ($request->isMethod('OPTIONS')) {
            $response = response()->noContent();
            return $this->addCorsHeaders($response, $origin, $allowedOrigins);
        }

        // Handle actual requests
        $response = $next($request);
        return $this->addCorsHeaders($response, $origin, $allowedOrigins);
    }

    private function addCorsHeaders($response, $origin, $allowedOrigins)
    {
        // Check if origin is allowed
        $allowOrigin = in_array($origin, $allowedOrigins) ? $origin : null;

        if ($allowOrigin) {
            $response->header('Access-Control-Allow-Origin', $allowOrigin);
            $response->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
            $response->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
            $response->header('Access-Control-Allow-Credentials', 'true');
            $response->header('Access-Control-Max-Age', '3600');
        }

        return $response;
    }
}
