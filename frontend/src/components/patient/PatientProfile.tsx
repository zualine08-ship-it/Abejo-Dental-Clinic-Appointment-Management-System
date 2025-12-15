interface PatientProfileProps {
  patient: {
    id: number;
    name: string;
    email: string;
    phone: string;
    age?: number;
    gender?: string;
    date_of_birth: string | null;
    address: string;
    blood_type: string;
    emergency_contact: string;
    created_at: string;
  };
}

export default function PatientProfile({ patient }: PatientProfileProps) {
  const formatDate = (date: string | null) => {
    if (!date) return "Not provided";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const profileItems = [
    {
      label: "Full Name",
      value: patient.name,
      icon: "👤",
    },
    {
      label: "Email Address",
      value: patient.email,
      icon: "📧",
    },
    {
      label: "Phone Number",
      value: patient.phone,
      icon: "📱",
    },
    {
      label: "Age",
      value: patient.age ? `${patient.age} years old` : "Not provided",
      icon: "🎂",
    },
    {
      label: "Gender",
      value: patient.gender || "Not provided",
      icon: "👫",
    },
    {
      label: "Date of Birth",
      value: formatDate(patient.date_of_birth),
      icon: "📅",
    },
    {
      label: "Address",
      value: patient.address,
      icon: "🏠",
    },
    {
      label: "Blood Type",
      value: patient.blood_type,
      icon: "🩸",
    },
    {
      label: "Emergency Contact",
      value: patient.emergency_contact,
      icon: "🚨",
    },
  ];

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
      <div className="flex items-center mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-2xl font-bold text-white">
          {patient.name.charAt(0).toUpperCase()}
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {patient.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Patient ID: #{patient.id}</p>
        </div>
      </div>

      <div className="space-y-4">
        {profileItems.map((item, index) => (
          <div key={index} className="pb-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:pb-0">
            <div className="flex items-start gap-3">
              <span className="text-xl mt-1">{item.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {item.label}
                </p>
                <p className="text-gray-900 dark:text-white font-medium mt-0.5">
                  {item.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-2">
        <button className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
          Edit Profile
        </button>
        <button className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium transition">
          Download Records
        </button>
      </div>
    </div>
  );
}
