import React, { useState } from 'react';
import { Car, FileText, Camera, CheckCircle, Upload, User, Phone, Mail } from 'lucide-react';
import { apiService } from '../services/api.service';

export function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    ssn: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    
    // Vehicle Information
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleColor: '',
    licensePlate: '',
    vehicleCategory: 'black_sedan',
    
    // Documents
    driversLicense: null,
    insurance: null,
    registration: null,
    vehiclePhotos: [],
  });

  const steps = [
    { id: 1, title: 'Personal Information', icon: User },
    { id: 2, title: 'Vehicle Details', icon: Car },
    { id: 3, title: 'Document Upload', icon: FileText },
    { id: 4, title: 'Vehicle Photos', icon: Camera },
    { id: 5, title: 'Review & Submit', icon: CheckCircle },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileUpload = (field: string, file: File) => {
    setFormData({
      ...formData,
      [field]: file,
    });
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Personal Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  id="dateOfBirth"
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  id="address"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <select
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  aria-label="State"
                >
                  <option value="">Select State</option>
                  <option value="IL">Illinois</option>
                  <option value="IN">Indiana</option>
                  <option value="WI">Wisconsin</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Vehicle Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="vehicleMake" className="block text-sm font-medium text-gray-700 mb-2">
                  Make
                </label>
                <input
                  id="vehicleMake"
                  type="text"
                  name="vehicleMake"
                  value={formData.vehicleMake}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., BMW, Mercedes, Cadillac"
                  required
                />
              </div>
              <div>
                <label htmlFor="vehicleModel" className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <input
                  id="vehicleModel"
                  type="text"
                  name="vehicleModel"
                  value={formData.vehicleModel}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 5 Series, E-Class, Escalade"
                  required
                />
              </div>
              <div>
                <label htmlFor="vehicleYear" className="block text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <input
                  id="vehicleYear"
                  type="number"
                  name="vehicleYear"
                  value={formData.vehicleYear}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="2018"
                  max="2025"
                  required
                />
              </div>
              <div>
                <label htmlFor="vehicleColor" className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <input
                  id="vehicleColor"
                  type="text"
                  name="vehicleColor"
                  value={formData.vehicleColor}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Black, Dark Blue"
                  required
                />
              </div>
              <div>
                <label htmlFor="licensePlate" className="block text-sm font-medium text-gray-700 mb-2">
                  License Plate
                </label>
                <input
                  id="licensePlate"
                  type="text"
                  name="licensePlate"
                  value={formData.licensePlate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="vehicleCategory" className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Category
                </label>
                <select
                  id="vehicleCategory"
                  aria-label="Vehicle Category"
                  name="vehicleCategory"
                  value={formData.vehicleCategory}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="black_sedan">Black Sedan</option>
                  <option value="black_suv">Black SUV</option>
                  <option value="black_ev">Black EV</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Document Upload</h3>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Driver's License</h4>
                  <p className="text-sm text-gray-600 mb-4">Upload a clear photo of your driver's license</p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => e.target.files && handleFileUpload('driversLicense', e.target.files[0])}
                    className="hidden"
                    id="driversLicense"
                  />
                  <label
                    htmlFor="driversLicense"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    Choose File
                  </label>
                  {formData.driversLicense && (
                    <p className="mt-2 text-sm text-green-600">✓ File uploaded</p>
                  )}
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Insurance Certificate</h4>
                  <p className="text-sm text-gray-600 mb-4">Upload your commercial insurance certificate</p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => e.target.files && handleFileUpload('insurance', e.target.files[0])}
                    className="hidden"
                    id="insurance"
                  />
                  <label
                    htmlFor="insurance"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    Choose File
                  </label>
                  {formData.insurance && (
                    <p className="mt-2 text-sm text-green-600">✓ File uploaded</p>
                  )}
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Vehicle Registration</h4>
                  <p className="text-sm text-gray-600 mb-4">Upload your vehicle registration document</p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => e.target.files && handleFileUpload('registration', e.target.files[0])}
                    className="hidden"
                    id="registration"
                  />
                  <label
                    htmlFor="registration"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    Choose File
                  </label>
                  {formData.registration && (
                    <p className="mt-2 text-sm text-green-600">✓ File uploaded</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Vehicle Photos</h3>
            <p className="text-gray-600">Please upload clear photos of your vehicle from different angles</p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Exterior Photos</h4>
                  <p className="text-sm text-gray-600 mb-4">Front, back, and side views</p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        setFormData({
                          ...formData,
                          vehiclePhotos: [...formData.vehiclePhotos, ...Array.from(e.target.files)]
                        });
                      }
                    }}
                    className="hidden"
                    id="exteriorPhotos"
                  />
                  <label
                    htmlFor="exteriorPhotos"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    Upload Photos
                  </label>
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Interior Photos</h4>
                  <p className="text-sm text-gray-600 mb-4">Dashboard, seats, and overall interior</p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        setFormData({
                          ...formData,
                          vehiclePhotos: [...formData.vehiclePhotos, ...Array.from(e.target.files)]
                        });
                      }
                    }}
                    className="hidden"
                    id="interiorPhotos"
                  />
                  <label
                    htmlFor="interiorPhotos"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    Upload Photos
                  </label>
                </div>
              </div>
            </div>

            {formData.vehiclePhotos.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-green-600">
                  ✓ {formData.vehiclePhotos.length} photos uploaded
                </p>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Review & Submit</h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-4">Application Summary</h4>
              <div className="space-y-2 text-sm">
                <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
                <p><strong>Email:</strong> {formData.email}</p>
                <p><strong>Phone:</strong> {formData.phone}</p>
                <p><strong>Vehicle:</strong> {formData.vehicleYear} {formData.vehicleMake} {formData.vehicleModel}</p>
                <p><strong>Category:</strong> {formData.vehicleCategory.replace('_', ' ').toUpperCase()}</p>
                <p><strong>License Plate:</strong> {formData.licensePlate}</p>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-6">
              <h4 className="font-medium text-blue-900 mb-2">Next Steps</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Your application will be reviewed within 2-3 business days</li>
                <li>• Background check and document verification will be conducted</li>
                <li>• You'll receive an email notification once approved</li>
                <li>• Complete vehicle inspection before you can start driving</li>
              </ul>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="terms"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                required
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                I agree to the <a href="#" className="text-blue-600 hover:text-blue-700">Terms of Service</a> and <a href="#" className="text-blue-600 hover:text-blue-700">Privacy Policy</a>
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <Car className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">Driver Onboarding</h1>
          <p className="text-gray-600">Complete your application to start driving with UrWay Dispatch</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    isCompleted 
                      ? 'bg-green-600 text-white' 
                      : isActive 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-300 text-gray-600'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {currentStep < steps.length ? (
              <button
                onClick={nextStep}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              <button
                onClick={async () => {
                  try {
                    const result = await apiService.register({
                      email: formData.email,
                      password: '', // Will be set via auth flow
                      firstName: formData.firstName,
                      lastName: formData.lastName,
                      phone: formData.phone,
                      address: formData.address,
                    });
                    if (result.success) {
                      alert('Application submitted successfully! You will be notified once approved.');
                    } else {
                      alert(result.message || 'Submission failed. Please try again.');
                    }
                  } catch (err: any) {
                    console.error('Onboarding submission error:', err);
                    alert('Submission failed. Please check your connection and try again.');
                  }
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Submit Application
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}