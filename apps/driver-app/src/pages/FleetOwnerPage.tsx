import React, { useState, useEffect } from 'react';
import { Truck, Users, Plus, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, Car } from 'lucide-react';

interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: number;
    plate: string;
    category: string;
    status: 'active' | 'maintenance' | 'inactive';
}

interface DriverAssignment {
    id: string;
    driverName: string;
    driverEmail: string;
    vehicleId: string;
    status: 'active' | 'pending' | 'inactive';
    onboardedAt: string;
}

export function FleetOwnerPage() {
    const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers' | 'assignments'>('vehicles');
    const [showAddVehicle, setShowAddVehicle] = useState(false);
    const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);

    // Mock fleet data
    const [vehicles] = useState<Vehicle[]>([
        { id: 'v1', make: 'Lincoln', model: 'Continental', year: 2023, plate: 'IL-12345', category: 'black_sedan', status: 'active' },
        { id: 'v2', make: 'Cadillac', model: 'Escalade', year: 2024, plate: 'IL-67890', category: 'black_suv', status: 'active' },
        { id: 'v3', make: 'Tesla', model: 'Model S', year: 2024, plate: 'IL-24680', category: 'black_ev', status: 'maintenance' },
        { id: 'v4', make: 'Mercedes', model: 'S-Class', year: 2022, plate: 'IL-13579', category: 'black_sedan', status: 'inactive' },
    ]);

    const [drivers] = useState<DriverAssignment[]>([
        { id: 'd1', driverName: 'Marcus Johnson', driverEmail: 'mjohnson@email.com', vehicleId: 'v1', status: 'active', onboardedAt: '2024-09-15' },
        { id: 'd2', driverName: 'Sarah Chen', driverEmail: 'schen@email.com', vehicleId: 'v2', status: 'active', onboardedAt: '2024-10-01' },
        { id: 'd3', driverName: 'David Williams', driverEmail: 'dwilliams@email.com', vehicleId: '', status: 'pending', onboardedAt: '2025-01-20' },
    ]);

    const getStatusBadge = (status: string) => {
        const classes: Record<string, string> = {
            active: 'bg-green-100 text-green-800',
            maintenance: 'bg-yellow-100 text-yellow-800',
            inactive: 'bg-gray-100 text-gray-600',
            pending: 'bg-blue-100 text-blue-800',
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${classes[status] || 'bg-gray-100'}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const getCategoryLabel = (cat: string) => {
        const labels: Record<string, string> = {
            black_sedan: 'Black Sedan',
            black_suv: 'Black SUV',
            black_ev: 'Black EV',
        };
        return labels[cat] || cat;
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm px-6 py-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1>
                    <button
                        onClick={() => setShowAddVehicle(!showAddVehicle)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Vehicle
                    </button>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Stats */}
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-md p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Total Vehicles</p>
                                <p className="text-2xl font-bold text-gray-900">{vehicles.length}</p>
                            </div>
                            <Car className="w-8 h-8 text-blue-500" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Active Vehicles</p>
                                <p className="text-2xl font-bold text-green-600">{vehicles.filter(v => v.status === 'active').length}</p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Active Drivers</p>
                                <p className="text-2xl font-bold text-blue-600">{drivers.filter(d => d.status === 'active').length}</p>
                            </div>
                            <Users className="w-8 h-8 text-blue-500" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">In Maintenance</p>
                                <p className="text-2xl font-bold text-yellow-600">{vehicles.filter(v => v.status === 'maintenance').length}</p>
                            </div>
                            <AlertTriangle className="w-8 h-8 text-yellow-500" />
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-gray-200 mb-6">
                    {(['vehicles', 'drivers', 'assignments'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 font-medium capitalize ${activeTab === tab
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Vehicles Tab */}
                {activeTab === 'vehicles' && (
                    <div className="space-y-4">
                        {vehicles.map(vehicle => (
                            <div key={vehicle.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                                <div
                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                                    onClick={() => setExpandedVehicle(expandedVehicle === vehicle.id ? null : vehicle.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <Truck className="w-6 h-6 text-gray-500" />
                                        <div>
                                            <p className="font-semibold text-gray-900">
                                                {vehicle.year} {vehicle.make} {vehicle.model}
                                            </p>
                                            <p className="text-sm text-gray-500">{vehicle.plate} · {getCategoryLabel(vehicle.category)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {getStatusBadge(vehicle.status)}
                                        {expandedVehicle === vehicle.id ? (
                                            <ChevronUp className="w-5 h-5 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                </div>

                                {expandedVehicle === vehicle.id && (
                                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                                        <div className="grid md:grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-500">Category</p>
                                                <p className="font-medium">{getCategoryLabel(vehicle.category)}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">License Plate</p>
                                                <p className="font-medium">{vehicle.plate}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">Assigned Driver</p>
                                                <p className="font-medium">
                                                    {drivers.find(d => d.vehicleId === vehicle.id)?.driverName || 'Unassigned'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 mt-4">
                                            <button className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                                                Edit
                                            </button>
                                            <button className="px-3 py-1.5 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600">
                                                Set Maintenance
                                            </button>
                                            <button className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600">
                                                Deactivate
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Drivers Tab */}
                {activeTab === 'drivers' && (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Onboarded</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {drivers.map(driver => (
                                    <tr key={driver.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">{driver.driverName}</td>
                                        <td className="px-4 py-3 text-gray-500 text-sm">{driver.driverEmail}</td>
                                        <td className="px-4 py-3 text-gray-500 text-sm">{driver.onboardedAt}</td>
                                        <td className="px-4 py-3">{getStatusBadge(driver.status)}</td>
                                        <td className="px-4 py-3">
                                            <button className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm">
                                                Manage
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Assignments Tab */}
                {activeTab === 'assignments' && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle-Driver Assignments</h3>
                            <div className="space-y-3">
                                {vehicles.map(vehicle => {
                                    const assignedDriver = drivers.find(d => d.vehicleId === vehicle.id);
                                    return (
                                        <div key={vehicle.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <Car className="w-5 h-5 text-gray-500" />
                                                <span className="font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {assignedDriver ? (
                                                    <>
                                                        <span className="text-sm text-gray-600"><Users className="w-4 h-4 inline mr-1" />{assignedDriver.driverName}</span>
                                                        <button className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm">Unassign</button>
                                                    </>
                                                ) : (
                                                    <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                                                        Assign Driver
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
