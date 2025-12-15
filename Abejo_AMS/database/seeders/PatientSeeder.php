<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class PatientSeeder extends Seeder
{
    public function run()
    {
        // Minimal, idempotent seeder for test patients. Avoids non-existent columns.
        $patients = [
            ['name' => 'Maria Santos', 'email' => 'maria@gmail.com'],
            ['name' => 'Juan Dela Cruz', 'email' => 'juan@gmail.com'],
            ['name' => 'Anna Reyes', 'email' => 'anna@gmail.com'],
            ['name' => 'Pedro Gomez', 'email' => 'pedro@gmail.com'],
            ['name' => 'Liza Flores', 'email' => 'liza@gmail.com'],
        ];

        foreach ($patients as $patient) {
            User::firstOrCreate(
                ['email' => $patient['email']],
                [
                    'name' => $patient['name'],
                    'email' => $patient['email'],
                    'password' => Hash::make('patient123'),
                    'role' => 'patient'
                ]
            );
        }
    }
}
