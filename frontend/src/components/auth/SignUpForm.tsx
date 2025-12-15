import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import axiosInstance from "../../config/axios";
import { showToast } from "../../hooks/useToast";

export default function SignUpForm() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    fname: "",
    lname: "",
    email: "",
    phone: "",
    age: "",
    gender: "",
    address: "",
    password: "",
    password_confirmation: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.fname || !formData.fname.trim()) {
      setError("First name is required");
      return;
    }
    if (!formData.lname || !formData.lname.trim()) {
      setError("Last name is required");
      return;
    }
    if (!formData.email || !formData.email.trim()) {
      setError("Email is required");
      return;
    }
    if (!formData.phone || !formData.phone.trim()) {
      setError("Phone number is required");
      return;
    }
    if (!formData.age || formData.age === "") {
      setError("Age is required");
      return;
    }
    if (parseInt(formData.age) < 1 || parseInt(formData.age) > 120) {
      setError("Age must be between 1 and 120");
      return;
    }
    if (!formData.gender) {
      setError("Gender is required");
      return;
    }
    if (!formData.address || !formData.address.trim()) {
      setError("Address is required");
      return;
    }
    if (!formData.password) {
      setError("Password is required");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      setError("Passwords do not match");
      return;
    }

    if (!isChecked) {
      setError("You must agree to the Terms and Conditions");
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post("/api/register", {
        name: `${formData.fname} ${formData.lname}`,
        email: formData.email,
        phone: formData.phone,
        age: parseInt(formData.age),
        gender: formData.gender,
        address: formData.address,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
        role: "patient",
      });

      if (response.status === 200 || response.status === 201) {
        showToast("Account created successfully. Redirecting to sign in...", "success", 2000);
        // Redirect to sign in
        setTimeout(() => navigate("/signin"), 2000);
      }
    } catch (err: any) {
      let errorMessage = "Sign up failed";
      
      if (err.response?.data?.errors) {
        // If there are field-specific errors, show the first one
        const errors = err.response.data.errors;
        const firstErrorField = Object.keys(errors)[0];
        if (firstErrorField) {
          errorMessage = errors[firstErrorField][0];
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <div className="w-full max-w-md mx-auto mb-5 sm:pt-10">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Back to dashboard
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign Up
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your information to create a patient account!
            </p>
          </div>
          <div>
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* <!-- First Name --> */}
                  <div className="sm:col-span-1">
                    <Label>
                      First Name<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="fname"
                      name="fname"
                      value={formData.fname}
                      onChange={handleInputChange}
                      placeholder="Enter your first name"
                    />
                  </div>
                  {/* <!-- Last Name --> */}
                  <div className="sm:col-span-1">
                    <Label>
                      Last Name<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="lname"
                      name="lname"
                      value={formData.lname}
                      onChange={handleInputChange}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>
                {/* <!-- Email --> */}
                <div>
                  <Label>
                    Email<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                  />
                </div>
                {/* <!-- Phone --> */}
                <div>
                  <Label>
                    Phone Number<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                  />
                </div>
                {/* <!-- Age & Gender Row --> */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* <!-- Age --> */}
                  <div className="sm:col-span-1">
                    <Label>
                      Age<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      id="age"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      placeholder="Enter your age"
                      min="1"
                      max="120"
                    />
                  </div>
                  {/* <!-- Gender --> */}
                  <div className="sm:col-span-1">
                    <Label>
                      Gender<span className="text-error-500">*</span>
                    </Label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                {/* <!-- Address --> */}
                <div>
                  <Label>
                    Address<span className="text-error-500">*</span>
                  </Label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter your address"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                </div>
                {/* <!-- Password --> */}
                <div>
                  <Label>
                    Password<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Enter your password (min 8 characters)"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>

                {/* <!-- Confirm Password --> */}
                <div>
                  <Label>
                    Confirm Password<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Confirm your password"
                      type={showPassword ? "text" : "password"}
                      name="password_confirmation"
                      value={formData.password_confirmation}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* <!-- Checkbox --> */}
                <div className="flex items-start gap-3">
                  <Checkbox
                    className="w-5 h-5 mt-1"
                    checked={isChecked}
                    onChange={setIsChecked}
                  />
                  <p className="inline-block font-normal text-gray-500 dark:text-gray-400 text-sm">
                    By creating an account means you agree to the{" "}
                    <span className="text-gray-800 dark:text-white/90">
                      Terms and Conditions,
                    </span>{" "}
                    and our{" "}
                    <span className="text-gray-800 dark:text-white">
                      Privacy Policy
                    </span>
                  </p>
                </div>
                {/* <!-- Button --> */}
                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:opacity-50"
                  >
                    {loading ? "Creating account..." : "Sign Up"}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Already have an account? {""}
                <Link
                  to="/signin"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

