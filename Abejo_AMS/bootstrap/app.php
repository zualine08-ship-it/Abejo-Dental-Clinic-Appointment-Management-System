<?php

use App\Http\Middleware\CorsMiddleware;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\PatientMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {

        // Add CORS middleware FIRST, before any other middleware
        $middleware->append(CorsMiddleware::class);

        $middleware->encryptCookies(except: [
            'appearance',
            'sidebar_state'
        ]);

        $middleware->statefulApi();

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        // Register custom middleware aliases
        $middleware->alias([
            'admin' => AdminMiddleware::class,
            'patient' => PatientMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {})
    ->create();
