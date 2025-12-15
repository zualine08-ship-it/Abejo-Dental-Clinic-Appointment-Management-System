export const PROCEDURES = [
  { id: 1, name: "Oral Prophylaxis", price: 500 },
  { id: 2, name: "Restoration", price: 1500 },
  { id: 3, name: "Dentures", price: 7000 },
  { id: 4, name: "Root Canal Treatment", price: 5000 },
  { id: 5, name: "Extraction", price: 800 },
  { id: 6, name: "Jacket Crown/Fixed Bridge", price: 12000 },
  { id: 7, name: "Braces", price: 30000 },
  { id: 8, name: "Veneers", price: 10000 },
  { id: 9, name: "Whitening", price: 4000 },
  { id: 10, name: "Retainers", price: 3000 },
];

export const TIME_SLOTS = [
  { value: "10:00", display: "10:00 AM", range: "10 - 11 AM" },
  { value: "11:00", display: "11:00 AM", range: "11 - 12 AM" },
  { value: "12:00", display: "12:00 PM", range: "12 - 01 PM" },
  { value: "13:00", display: "1:00 PM", range: "1 - 2 PM" },
  { value: "14:00", display: "2:00 PM", range: "2 - 3 PM" },
  { value: "15:00", display: "3:00 PM", range: "3 - 4 PM" },
];

export const getProcedurePrice = (procedureId: number): number => {
  const procedure = PROCEDURES.find((p) => p.id === procedureId);
  return procedure?.price || 0;
};

export const getTimeDisplay = (timeValue: string): string => {
  const slot = TIME_SLOTS.find((t) => t.value === timeValue);
  return slot?.display || timeValue;
};
