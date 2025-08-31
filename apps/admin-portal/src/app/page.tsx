export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Admin Portal
          </h1>
          <p className="text-gray-600 mb-6">
            Welcome to the Luxury Ride Platform administration dashboard.
          </p>
          <div className="space-y-3">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-600 font-medium">Active Drivers:</span>
                  <div className="text-2xl font-bold text-blue-900">247</div>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Daily Rides:</span>
                  <div className="text-2xl font-bold text-blue-900">1,432</div>
                </div>
              </div>
            </div>
            <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Access Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}