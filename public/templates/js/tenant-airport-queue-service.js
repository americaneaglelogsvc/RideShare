// Tenant-Specific Airport Queue Service
// Multi-tenant airport queue management system

class TenantAirportQueueService {
    constructor(tenantId) {
        this.tenantId = tenantId;
        this.apiEndpoint = '/api/v1/airport-queues';
    }

    // Queue Management
    async getQueues(airportCode = null) {
        const params = airportCode ? `?airport_code=${airportCode}` : '';
        const response = await fetch(`${this.apiEndpoint}/queues${params}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch queues');
        }
        
        return response.json();
    }

    async createQueue(queueData) {
        const response = await fetch(`${this.apiEndpoint}/queues`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId
            },
            body: JSON.stringify({
                tenant_id: this.tenantId,
                ...queueData
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create queue');
        }
        
        return response.json();
    }

    async updateQueue(queueId, queueData) {
        const response = await fetch(`${this.apiEndpoint}/queues/${queueId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId
            },
            body: JSON.stringify(queueData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update queue');
        }
        
        return response.json();
    }

    async deleteQueue(queueId) {
        const response = await fetch(`${this.apiEndpoint}/queues/${queueId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete queue');
        }
        
        return response.json();
    }

    // Driver Queue Operations
    async getDriverQueuePositions(driverId) {
        const response = await fetch(`${this.apiEndpoint}/drivers/${driverId}/positions`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch driver positions');
        }
        
        return response.json();
    }

    async joinQueue(driverId, queueId) {
        const response = await fetch(`${this.apiEndpoint}/queues/${queueId}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId
            },
            body: JSON.stringify({
                driver_id: driverId
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to join queue');
        }
        
        return response.json();
    }

    async leaveQueue(driverId, queueId) {
        const response = await fetch(`${this.apiEndpoint}/queues/${queueId}/leave`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId
            },
            body: JSON.stringify({
                driver_id: driverId
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to leave queue');
        }
        
        return response.json();
    }

    async getQueuePositions(queueId) {
        const response = await fetch(`${this.apiEndpoint}/queues/${queueId}/positions`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch queue positions');
        }
        
        return response.json();
    }

    // Airport Configuration
    async getAirportConfigs(airportCode = null) {
        const params = airportCode ? `?airport_code=${airportCode}` : '';
        const response = await fetch(`${this.apiEndpoint}/configs${params}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch airport configs');
        }
        
        return response.json();
    }

    async updateAirportConfig(configId, configData) {
        const response = await fetch(`${this.apiEndpoint}/configs/${configId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId
            },
            body: JSON.stringify(configData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update airport config');
        }
        
        return response.json();
    }

    // Queue Analytics
    async getQueueAnalytics(queueId, startDate, endDate) {
        const params = `?start_date=${startDate}&end_date=${endDate}`;
        const response = await fetch(`${this.apiEndpoint}/queues/${queueId}/analytics${params}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch queue analytics');
        }
        
        return response.json();
    }

    // Driver Preferences
    async getDriverPreferences(driverId) {
        const response = await fetch(`${this.apiEndpoint}/drivers/${driverId}/preferences`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch driver preferences');
        }
        
        return response.json();
    }

    async updateDriverPreferences(driverId, preferences) {
        const response = await fetch(`${this.apiEndpoint}/drivers/${driverId}/preferences`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId
            },
            body: JSON.stringify(preferences)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update driver preferences');
        }
        
        return response.json();
    }

    // Real-time Updates (WebSocket)
    subscribeToQueueUpdates(queueId, callback) {
        const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/airport-queues/${this.tenantId}/${queueId}`);
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            callback(data);
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        ws.onclose = () => {
            console.log('WebSocket connection closed');
        };
        
        return ws;
    }

    // Queue Operations for Dispatch
    async callNextDriver(queueId) {
        const response = await fetch(`${this.apiEndpoint}/queues/${queueId}/call-next`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to call next driver');
        }
        
        return response.json();
    }

    async markDriverServed(queueId, driverId) {
        const response = await fetch(`${this.apiEndpoint}/queues/${queueId}/serve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId
            },
            body: JSON.stringify({
                driver_id: driverId
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to mark driver as served');
        }
        
        return response.json();
    }

    async markDriverNoShow(queueId, driverId) {
        const response = await fetch(`${this.apiEndpoint}/queues/${queueId}/no-show`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId
            },
            body: JSON.stringify({
                driver_id: driverId
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to mark driver as no-show');
        }
        
        return response.json();
    }

    // Queue Status Monitoring
    async getQueueStatus(queueId) {
        const response = await fetch(`${this.apiEndpoint}/queues/${queueId}/status`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch queue status');
        }
        
        return response.json();
    }

    // Bulk Operations
    async bulkUpdateQueuePositions(queueId, updates) {
        const response = await fetch(`${this.apiEndpoint}/queues/${queueId}/bulk-update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId
            },
            body: JSON.stringify({
                updates: updates
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to bulk update queue positions');
        }
        
        return response.json();
    }

    // Export/Import
    async exportQueueData(queueId, format = 'csv') {
        const response = await fetch(`${this.apiEndpoint}/queues/${queueId}/export?format=${format}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to export queue data');
        }
        
        return response.blob();
    }

    // Compliance and Reporting
    async getComplianceReport(airportCode, startDate, endDate) {
        const params = `?airport_code=${airportCode}&start_date=${startDate}&end_date=${endDate}`;
        const response = await fetch(`${this.apiEndpoint}/compliance/report${params}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate compliance report');
        }
        
        return response.json();
    }
}

// Dashboard Manager for Airport Queue
class AirportQueueDashboardManager {
    constructor(tenantId) {
        this.tenantId = tenantId;
        this.queueService = new TenantAirportQueueService(tenantId);
        this.currentQueue = null;
        this.websocketConnections = new Map();
        this.refreshInterval = null;
    }

    async initialize() {
        await this.loadQueues();
        this.setupEventListeners();
        this.startAutoRefresh();
    }

    async loadQueues() {
        try {
            const queues = await this.queueService.getQueues();
            this.renderQueueList(queues);
        } catch (error) {
            console.error('Failed to load queues:', error);
            this.showError('Failed to load airport queues');
        }
    }

    async loadQueueDetails(queueId) {
        try {
            const [queue, positions, analytics] = await Promise.all([
                this.queueService.getQueues().then(queues => queues.find(q => q.id === queueId)),
                this.queueService.getQueuePositions(queueId),
                this.queueService.getQueueAnalytics(queueId, 
                    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), 
                    new Date().toISOString()
                )
            ]);

            this.currentQueue = queue;
            this.renderQueueDetails(queue, positions, analytics);
            this.subscribeToQueueUpdates(queueId);
        } catch (error) {
            console.error('Failed to load queue details:', error);
            this.showError('Failed to load queue details');
        }
    }

    renderQueueList(queues) {
        const container = document.getElementById('queue-list');
        if (!container) return;

        container.innerHTML = queues.map(queue => `
            <div class="queue-item bg-white rounded-lg shadow-md p-4 mb-4 cursor-pointer hover:bg-gray-50" 
                 onclick="dashboardManager.loadQueueDetails('${queue.id}')">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-lg font-semibold">${queue.queue_name}</h3>
                        <p class="text-gray-600">${queue.airport_name} - ${queue.terminal}</p>
                        <p class="text-sm text-gray-500">${queue.service_type}</p>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold ${queue.current_queue_size > queue.max_queue_size * 0.8 ? 'text-red-600' : 'text-green-600'}">
                            ${queue.current_queue_size || 0}
                        </div>
                        <div class="text-sm text-gray-500">in queue</div>
                    </div>
                </div>
                <div class="mt-2 flex items-center justify-between">
                    <span class="px-2 py-1 text-xs rounded-full ${queue.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                        ${queue.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span class="text-sm text-gray-500">
                        Avg wait: ${queue.average_wait_time || 0} min
                    </span>
                </div>
            </div>
        `).join('');
    }

    renderQueueDetails(queue, positions, analytics) {
        const container = document.getElementById('queue-details');
        if (!container) return;

        container.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">${queue.queue_name}</h2>
                    <div class="flex space-x-2">
                        <button onclick="dashboardManager.callNextDriver()" 
                                class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                            Call Next Driver
                        </button>
                        <button onclick="dashboardManager.editQueue()" 
                                class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
                            Edit Queue
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-blue-50 rounded-lg p-4">
                        <div class="text-3xl font-bold text-blue-600">${positions.length}</div>
                        <div class="text-gray-600">Drivers in Queue</div>
                    </div>
                    <div class="bg-green-50 rounded-lg p-4">
                        <div class="text-3xl font-bold text-green-600">${analytics.average_wait_time || 0}</div>
                        <div class="text-gray-600">Avg Wait Time (min)</div>
                    </div>
                    <div class="bg-purple-50 rounded-lg p-4">
                        <div class="text-3xl font-bold text-purple-600">${analytics.served_today || 0}</div>
                        <div class="text-gray-600">Served Today</div>
                    </div>
                </div>

                <div class="border-t pt-4">
                    <h3 class="text-lg font-semibold mb-4">Queue Positions</h3>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr class="border-b">
                                    <th class="text-left py-2">Position</th>
                                    <th class="text-left py-2">Driver</th>
                                    <th class="text-left py-2">Joined</th>
                                    <th class="text-left py-2">Wait Time</th>
                                    <th class="text-left py-2">Status</th>
                                    <th class="text-left py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${positions.map(position => `
                                    <tr class="border-b">
                                        <td class="py-2 font-semibold">${position.position}</td>
                                        <td class="py-2">${position.driver_name}</td>
                                        <td class="py-2">${new Date(position.joined_at).toLocaleTimeString()}</td>
                                        <td class="py-2">${position.estimated_wait_time || 0} min</td>
                                        <td class="py-2">
                                            <span class="px-2 py-1 text-xs rounded-full ${this.getStatusClass(position.status)}">
                                                ${position.status}
                                            </span>
                                        </td>
                                        <td class="py-2">
                                            <div class="flex space-x-2">
                                                ${position.status === 'waiting' ? `
                                                    <button onclick="dashboardManager.callDriver('${position.driver_id}')" 
                                                            class="text-blue-600 hover:text-blue-800">Call</button>
                                                    <button onclick="dashboardManager.markServed('${position.driver_id}')" 
                                                            class="text-green-600 hover:text-green-800">Serve</button>
                                                ` : ''}
                                                <button onclick="dashboardManager.markNoShow('${position.driver_id}')" 
                                                        class="text-red-600 hover:text-red-800">No Show</button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    getStatusClass(status) {
        const statusClasses = {
            'waiting': 'bg-yellow-100 text-yellow-800',
            'called': 'bg-blue-100 text-blue-800',
            'serving': 'bg-green-100 text-green-800',
            'completed': 'bg-gray-100 text-gray-800',
            'no_show': 'bg-red-100 text-red-800'
        };
        return statusClasses[status] || 'bg-gray-100 text-gray-800';
    }

    async callNextDriver() {
        if (!this.currentQueue) return;
        
        try {
            const result = await this.queueService.callNextDriver(this.currentQueue.id);
            this.showSuccess('Next driver called successfully');
            await this.loadQueueDetails(this.currentQueue.id);
        } catch (error) {
            console.error('Failed to call next driver:', error);
            this.showError('Failed to call next driver');
        }
    }

    async callDriver(driverId) {
        if (!this.currentQueue) return;
        
        try {
            await this.queueService.markDriverServed(this.currentQueue.id, driverId);
            this.showSuccess('Driver called successfully');
            await this.loadQueueDetails(this.currentQueue.id);
        } catch (error) {
            console.error('Failed to call driver:', error);
            this.showError('Failed to call driver');
        }
    }

    async markServed(driverId) {
        if (!this.currentQueue) return;
        
        try {
            await this.queueService.markDriverServed(this.currentQueue.id, driverId);
            this.showSuccess('Driver marked as served');
            await this.loadQueueDetails(this.currentQueue.id);
        } catch (error) {
            console.error('Failed to mark driver as served:', error);
            this.showError('Failed to mark driver as served');
        }
    }

    async markNoShow(driverId) {
        if (!this.currentQueue) return;
        
        if (!confirm('Mark this driver as no-show?')) return;
        
        try {
            await this.queueService.markDriverNoShow(this.currentQueue.id, driverId);
            this.showSuccess('Driver marked as no-show');
            await this.loadQueueDetails(this.currentQueue.id);
        } catch (error) {
            console.error('Failed to mark driver as no-show:', error);
            this.showError('Failed to mark driver as no-show');
        }
    }

    subscribeToQueueUpdates(queueId) {
        // Close existing connection
        if (this.websocketConnections.has(queueId)) {
            this.websocketConnections.get(queueId).close();
        }

        const ws = this.queueService.subscribeToQueueUpdates(queueId, (data) => {
            if (data.type === 'queue_update') {
                this.loadQueueDetails(queueId);
            } else if (data.type === 'position_update') {
                this.updateDriverPosition(data.data);
            }
        });

        this.websocketConnections.set(queueId, ws);
    }

    updateDriverPosition(data) {
        // Update specific driver position in the table
        const row = document.querySelector(`[data-driver-id="${data.driver_id}"]`);
        if (row) {
            row.querySelector('.position').textContent = data.position;
            row.querySelector('.status').textContent = data.status;
            row.querySelector('.status').className = `px-2 py-1 text-xs rounded-full ${this.getStatusClass(data.status)}`;
        }
    }

    startAutoRefresh() {
        this.refreshInterval = setInterval(async () => {
            if (this.currentQueue) {
                await this.loadQueueDetails(this.currentQueue.id);
            }
        }, 30000); // Refresh every 30 seconds
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    setupEventListeners() {
        // Add event listeners for form submissions, etc.
        document.addEventListener('DOMContentLoaded', () => {
            this.initialize();
        });
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Implementation for showing notifications
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    destroy() {
        this.stopAutoRefresh();
        this.websocketConnections.forEach(ws => ws.close());
        this.websocketConnections.clear();
    }
}

// Global instance for dashboard
let dashboardManager;
