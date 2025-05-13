"use client";
import { useState, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import Confetti from "react-confetti";


type FormData = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  inquiryType: "Support" | "Feedback" | "Other";
  message: string;
};

export default function ContactForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    inquiryType: "Support",
    message: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const validateForm = () => {
    const errors: Partial<FormData> = {};
    if (!formData.name) errors.name = "Name is required.";
    if (!formData.email.includes("@")) errors.email = "Invalid email.";
    if (!formData.subject) errors.subject = "Subject is required.";
    if (!formData.message) errors.message = "Message is required.";
    return errors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormErrors({});
    setSubmitStatus(null);

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setIsSubmitting(false);
      return;
    }

    const token = await recaptchaRef.current?.executeAsync();
    recaptchaRef.current?.reset();

    const data = new FormData();
    Object.entries(formData).forEach(([key, val]) => data.append(key, val));
    if (file) data.append("file", file);
    if (token) data.append("g-recaptcha-response", token);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        body: data,
      });

      if (res.ok) {
        setSubmitStatus({ success: true, message: "Thank you for your message! 🎉" });
        setFormData({ name: "", email: "", phone: "", subject: "", inquiryType: "Support", message: "" });
        setFile(null);
      } else {
        throw new Error("Failed");
      }
    } catch {
      setSubmitStatus({ success: false, message: "Something went wrong. Try again later." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Contact Us</h2>

      {submitStatus?.success && <Confetti />}
      {submitStatus && (
        <div role="alert" className={`mb-4 p-4 rounded ${submitStatus.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {submitStatus.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {["name", "email", "phone", "subject"].map((field) => (
          <div key={field}>
            <label htmlFor={field} className="block text-sm font-medium text-gray-700 capitalize">{field}</label>
            <input
              id={field}
              name={field}
              type={field === "email" ? "email" : "text"}
              value={formData[field as keyof FormData]}
              onChange={handleChange}
              aria-invalid={!!formErrors[field as keyof FormData]}
              required
              className={`text-black mt-1 block w-full px-3 py-2 border ${formErrors[field as keyof FormData] ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm`}
            />
            {formErrors[field as keyof FormData] && <p className="text-red-500 text-sm">{formErrors[field as keyof FormData]}</p>}
          </div>
        ))}

        <div>
          <label htmlFor="inquiryType" className="block text-sm font-medium text-gray-700">Inquiry Type</label>
          <select
            name="inquiryType"
            id="inquiryType"
            value={formData.inquiryType}
            onChange={handleChange}
            className="text-black mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          >
            <option value="Support">Support</option>
            <option value="Feedback">Feedback</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message</label>
          <textarea
            id="message"
            name="message"
            rows={4}
            value={formData.message}
            onChange={handleChange}
            required
            className={`text-black mt-1 block w-full px-3 py-2 border ${formErrors.message ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm`}
          />
          {formErrors.message && <p className="text-red-500 text-sm">{formErrors.message}</p>}
        </div>

        <div>
          <label htmlFor="file" className="text-black block text-sm font-medium">Attachment</label>
          <input type="file" name="file" id="file" className="text-black" onChange={handleFileChange} />
        </div>

       <ReCAPTCHA sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!} size="invisible" ref={recaptchaRef} />

        <button
          type="submit"
          disabled={isSubmitting}
          className={` w-full py-2 px-4 rounded text-white ${isSubmitting ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"} cursor-pointer`}
        >
          {isSubmitting ? "Sending..." : "Send Message"}
        </button>
      </form>

      <div className="mt-6 text-center space-x-4">
        <a href="https://twitter.com/yourprofile" target="_blank" rel="noopener noreferrer">Twitter</a>
        <a href="mailto:contact@example.com">Email</a>
      </div>
    </div>
  );
}
