export interface Event {
  _id?: string;
  id?: string;              // ✅ optional
  title: string;
  description?: string;     // ✅ optional
  date: string;
  venue: string;
  price: number;
  totalSeats: number;
  bookedSeats?: number;     // ✅ optional
  registrationTemplate?: string;
  designTemplate?: string;
  designConfig?: Record<string, any>;
  customFields?: Array<{
    label: string;
    type: string;
    required?: boolean;
    options?: string[];
  }>;
}
