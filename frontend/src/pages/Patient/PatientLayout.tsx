import { Outlet } from "react-router";

export default function PatientLayout() {
  return (
    <div className="min-h-[70vh] bg-gray-50 dark:bg-gray-900">
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}
