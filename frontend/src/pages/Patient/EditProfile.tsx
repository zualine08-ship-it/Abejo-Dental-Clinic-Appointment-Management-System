import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import axios from "../../config/axios";
import { useAuth } from "../../config/AuthContext";
import Swal from "sweetalert2";

interface ProfileData {
  id: number;
  name: string;
  email: string;
  phone: string;
  age?: number;
  gender?: string;
  address?: string;
}

export default function EditProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState<ProfileData>({
    id: 0,
    name: "",
    email: "",
    phone: "",
    age: undefined,
    gender: "",
    address: "",
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/patient/profile");
      if (response.data && response.data.patient) {
        setFormData(response.data.patient);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to load profile data",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }
    if (!formData.age || formData.age < 1 || formData.age > 120) {
      newErrors.age = "Age is required and must be between 1 and 120";
    }
    if (!formData.gender || formData.gender.trim() === "") {
      newErrors.gender = "Gender is required";
    }
    if (!formData.address || formData.address.trim() === "") {
      newErrors.address = "Address is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "age" ? (value ? parseInt(value) : undefined) : value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      const response = await axios.put("/api/patient/profile", formData);

      if (response.data) {
        Swal.fire({
          title: "Success!",
          text: "Profile updated successfully",
          icon: "success",
          confirmButtonColor: "#2563eb",
        }).then(() => {
          navigate("/patient-dashboard");
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to update profile. Please try again.",
        icon: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Edit Profile" description="Edit your profile information" />

      <div className="p-4 lg:p-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl lg:rounded-3xl border border-gray-200 dark:border-gray-700 p-6 lg:p-8">
          <div className="mb-6 lg:mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white">Edit Profile</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">Update your personal information</p>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white text-sm ${
                  errors.name ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                }`}
                placeholder="Enter your full name"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div className="md:col-span-1">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white text-sm ${
                  errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                }`}
                placeholder="Enter your email"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div className="md:col-span-1">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white text-sm ${
                  errors.phone ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                }`}
                placeholder="Enter your phone number"
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            {/* Age */}
            <div className="md:col-span-1">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Age *
              </label>
              <input
                type="number"
                name="age"
                value={formData.age || ""}
                onChange={handleChange}
                min="1"
                max="120"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white text-sm ${
                  errors.age ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                }`}
                placeholder="Enter your age"
              />
              {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age}</p>}
            </div>

            {/* Gender */}
            <div className="md:col-span-1">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Gender *
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white text-sm ${
                  errors.gender ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                }`}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Address *
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white text-sm resize-none ${
                  errors.address ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                }`}
                placeholder="Enter your complete address"
              />
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
            </div>

            {/* Buttons */}
            <div className="md:col-span-2 flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/patient-dashboard")}
                className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-3 rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
            </div>

            <p className="md:col-span-2 text-xs text-gray-500 dark:text-gray-400 text-center">* All fields are required</p>
          </form>
        </div>
      </div>
    </>
  );
}
