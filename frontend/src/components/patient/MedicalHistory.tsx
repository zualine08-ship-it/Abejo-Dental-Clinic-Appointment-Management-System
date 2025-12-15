interface MedicalRecord {
  id: number;
  date: string;
  diagnosis: string;
  treatment: string;
  doctor: string;
  notes: string;
}

interface MedicalHistoryProps {
  records: MedicalRecord[];
}

export default function MedicalHistory({ records }: MedicalHistoryProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
        Medical History
      </h3>

      {records.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">No medical records found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record, index) => (
            <div
              key={record.id}
              className="relative border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition"
            >
              {/* Timeline dot */}
              <div className="absolute left-0 top-0 bottom-0 flex items-center">
                <div className="absolute left-4 w-3 h-3 rounded-full bg-blue-600 -translate-x-1.5"></div>
                {index !== records.length - 1 && (
                  <div className="absolute left-[1.125rem] top-8 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                )}
              </div>

              <div className="ml-8">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {record.diagnosis}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Dr. {record.doctor}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {formatDate(record.date)}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      Treatment
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-300">
                      {record.treatment}
                    </p>
                  </div>

                  {record.notes && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                        Notes
                      </p>
                      <p className="text-sm text-gray-900 dark:text-gray-300">
                        {record.notes}
                      </p>
                    </div>
                  )}
                </div>

                <button className="mt-3 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition">
                  View Full Record
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
