<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class NotificationController extends Controller
{
    /**
     * Get all notifications for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $notifications = Notification::where('user_id', $user->id)
            ->recent()
            ->get();

        return response()->json($notifications);
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(Request $request, Notification $notification): JsonResponse
    {
        // Check authorization
        if ($notification->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $notification->markAsRead();

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read',
            'data' => $notification,
        ]);
    }

    /**
     * Mark all notifications as read for the authenticated user.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        Notification::where('user_id', $user->id)
            ->where('read', false)
            ->update(['read' => true]);

        return response()->json([
            'success' => true,
            'message' => 'All notifications marked as read',
        ]);
    }

    /**
     * Delete a specific notification.
     */
    public function destroy(Request $request, Notification $notification): JsonResponse
    {
        // Check authorization
        if ($notification->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $notification->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notification deleted',
        ]);
    }

    /**
     * Get unread notification count.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $count = Notification::where('user_id', $user->id)
            ->unread()
            ->count();

        return response()->json(['unread_count' => $count]);
    }

    /**
     * Get patient notifications (for patient dashboard).
     * Shows appointment-related notifications and reminders.
     */
    public function patientNotifications(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user || $user->role !== 'patient') {
            return response()->json(['message' => 'Unauthorized - Patient access only'], 403);
        }

        $notifications = Notification::where('user_id', $user->id)
            ->whereIn('type', ['appointment', 'cancellation', 'system'])
            ->recent()
            ->get();

        return response()->json($notifications);
    }

    /**
     * Get unread patient notifications count.
     */
    public function patientUnreadCount(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user || $user->role !== 'patient') {
            return response()->json(['message' => 'Unauthorized - Patient access only'], 403);
        }

        $count = Notification::where('user_id', $user->id)
            ->whereIn('type', ['appointment', 'cancellation', 'system'])
            ->unread()
            ->count();

        return response()->json(['unread_count' => $count]);
    }
}
