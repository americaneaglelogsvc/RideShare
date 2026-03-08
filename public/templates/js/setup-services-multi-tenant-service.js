// Setup Services Management for UWD
// Multi-tenant Architecture Implementation

class SetupServicesService {
    constructor(tenantId) {
        this.tenantId = tenantId;
        this.apiEndpoint = '/api/v1/setup-services';
    }

    // Initialize setup services for tenant
    async initializeSetupServices(config) {
        try {
            const response = await fetch(`${this.apiEndpoint}/initialize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(config)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to initialize setup services:', error);
            throw error;
        }
    }

    // Get setup services overview
    async getSetupServicesOverview() {
        try {
            const response = await fetch(`${this.apiEndpoint}/overview`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get setup services overview:', error);
            throw error;
        }
    }

    // Get onboarding tasks
    async getOnboardingTasks(status = null, category = null) {
        try {
            const params = new URLSearchParams();
            if (status) params.append('status', status);
            if (category) params.append('category', category);
            
            const response = await fetch(`${this.apiEndpoint}/tasks?${params}`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get onboarding tasks:', error);
            throw error;
        }
    }

    // Update onboarding task
    async updateOnboardingTask(taskId, taskData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(taskData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to update onboarding task:', error);
            throw error;
        }
    }

    // Get implementation timeline
    async getImplementationTimeline() {
        try {
            const response = await fetch(`${this.apiEndpoint}/timeline`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get implementation timeline:', error);
            throw error;
        }
    }

    // Update implementation timeline
    async updateImplementationTimeline(timelineData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/timeline`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(timelineData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to update implementation timeline:', error);
            throw error;
        }
    }

    // Get available specialists
    async getAvailableSpecialists() {
        try {
            const response = await fetch(`${this.apiEndpoint}/specialists/available`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get available specialists:', error);
            throw error;
        }
    }

    // Assign specialist to tenant
    async assignSpecialist(specialistId, assignmentData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/specialists/${specialistId}/assign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(assignmentData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to assign specialist:', error);
            throw error;
        }
    }

    // Get specialist assignments
    async getSpecialistAssignments() {
        try {
            const response = await fetch(`${this.apiEndpoint}/specialists/assignments`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get specialist assignments:', error);
            throw error;
        }
    }

    // Get setup packages
    async getSetupPackages() {
        try {
            const response = await fetch(`${this.apiEndpoint}/packages`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get setup packages:', error);
            throw error;
        }
    }

    // Update setup package
    async updateSetupPackage(packageData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/packages`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(packageData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to update setup package:', error);
            throw error;
        }
    }

    // Get setup resources
    async getSetupResources(category = null, audience = null) {
        try {
            const params = new URLSearchParams();
            if (category) params.append('category', category);
            if (audience) params.append('audience', audience);
            
            const response = await fetch(`${this.apiEndpoint}/resources?${params}`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get setup resources:', error);
            throw error;
        }
    }

    // Download setup resource
    async downloadSetupResource(resourceId) {
        try {
            const response = await fetch(`${this.apiEndpoint}/resources/${resourceId}/download`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to download setup resource:', error);
            throw error;
        }
    }

    // Submit feedback
    async submitFeedback(feedbackData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(feedbackData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to submit feedback:', error);
            throw error;
        }
    }

    // Get feedback
    async getFeedback(feedbackType = null) {
        try {
            const params = new URLSearchParams();
            if (feedbackType) params.append('feedback_type', feedbackType);
            
            const response = await fetch(`${this.apiEndpoint}/feedback?${params}`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get feedback:', error);
            throw error;
        }
    }

    // Get success metrics
    async getSuccessMetrics(metricType = null) {
        try {
            const params = new URLSearchParams();
            if (metricType) params.append('metric_type', metricType);
            
            const response = await fetch(`${this.apiEndpoint}/metrics?${params}`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get success metrics:', error);
            throw error;
        }
    }

    // Add success metric
    async addSuccessMetric(metricData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/metrics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify(metricData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to add success metric:', error);
            throw error;
        }
    }

    // Generate setup report
    async generateSetupReport(reportType, startDate, endDate) {
        try {
            const response = await fetch(`${this.apiEndpoint}/reports/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': this.tenantId
                },
                body: JSON.stringify({
                    report_type: reportType,
                    start_date: startDate,
                    end_date: endDate
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to generate setup report:', error);
            throw error;
        }
    }

    // Calculate setup progress
    async calculateSetupProgress() {
        try {
            const response = await fetch(`${this.apiEndpoint}/progress`, {
                headers: {
                    'X-Tenant-ID': this.tenantId
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to calculate setup progress:', error);
            throw error;
        }
    }
}

// Setup Services Dashboard Manager
class SetupServicesDashboardManager {
    constructor() {
        this.tenantId = this.getCurrentTenantId();
        this.setupService = new SetupServicesService(this.tenantId);
        this.overview = {};
        this.tasks = [];
        this.timeline = [];
        this.specialists = [];
        this.assignments = [];
        this.packages = [];
        this.resources = [];
        this.feedback = [];
        this.metrics = [];
        
        this.init();
    }

    getCurrentTenantId() {
        return window.location.pathname.includes('/tenant/') ? 
            window.location.pathname.split('/')[2] : 'default';
    }

    async init() {
        await this.loadSetupOverview();
        await this.loadOnboardingTasks();
        await this.loadImplementationTimeline();
        await this.loadAvailableSpecialists();
        await this.loadSpecialistAssignments();
        await this.loadSetupPackages();
        await this.loadSetupResources();
        await this.loadFeedback();
        await this.loadSuccessMetrics();
        this.setupEventListeners();
        this.startProgressTracking();
    }

    async loadSetupOverview() {
        try {
            this.overview = await this.setupService.getSetupServicesOverview();
            this.renderOverviewSection();
        } catch (error) {
            console.error('Failed to load setup overview:', error);
        }
    }

    async loadOnboardingTasks() {
        try {
            this.tasks = await this.setupService.getOnboardingTasks();
            this.renderTasksSection();
        } catch (error) {
            console.error('Failed to load onboarding tasks:', error);
        }
    }

    async loadImplementationTimeline() {
        try {
            this.timeline = await this.setupService.getImplementationTimeline();
            this.renderTimelineSection();
        } catch (error) {
            console.error('Failed to load implementation timeline:', error);
        }
    }

    async loadAvailableSpecialists() {
        try {
            this.specialists = await this.setupService.getAvailableSpecialists();
            this.renderSpecialistsSection();
        } catch (error) {
            console.error('Failed to load available specialists:', error);
        }
    }

    async loadSpecialistAssignments() {
        try {
            this.assignments = await this.setupService.getSpecialistAssignments();
            this.renderAssignmentsSection();
        } catch (error) {
            console.error('Failed to load specialist assignments:', error);
        }
    }

    async loadSetupPackages() {
        try {
            this.packages = await this.setupService.getSetupPackages();
            this.renderPackagesSection();
        } catch (error) {
            console.error('Failed to load setup packages:', error);
        }
    }

    async loadSetupResources() {
        try {
            this.resources = await this.setupService.getSetupResources();
            this.renderResourcesSection();
        } catch (error) {
            console.error('Failed to load setup resources:', error);
        }
    }

    async loadFeedback() {
        try {
            this.feedback = await this.setupService.getFeedback();
            this.renderFeedbackSection();
        } catch (error) {
            console.error('Failed to load feedback:', error);
        }
    }

    async loadSuccessMetrics() {
        try {
            this.metrics = await this.setupService.getSuccessMetrics();
            this.renderMetricsSection();
        } catch (error) {
            console.error('Failed to load success metrics:', error);
        }
    }

    renderOverviewSection() {
        const overviewContainer = document.getElementById('setup-overview');
        if (!overviewContainer) return;

        const progressPercentage = this.overview.setup_progress || 0;
        const setupStatus = this.overview.setup_status || 'not_started';
        const statusColor = {
            'not_started': 'gray',
            'in_progress': 'blue',
            'completed': 'green',
            'on_hold': 'yellow'
        }[setupStatus] || 'gray';

        overviewContainer.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-2">Setup Status</h3>
                    <div class="flex items-center">
                        <div class="w-16 h-16 relative">
                            <svg class="w-16 h-16 transform -rotate-90">
                                <circle cx="32" cy="32" r="28" stroke="#e5e7eb" stroke-width="8" fill="none"></circle>
                                <circle cx="32" cy="32" r="28" stroke="#3b82f6" stroke-width="8" fill="none"
                                    stroke-dasharray="${progressPercentage * 1.76} 176" stroke-linecap="round"></circle>
                            </svg>
                            <div class="absolute inset-0 flex items-center justify-center">
                                <span class="text-sm font-bold">${progressPercentage}%</span>
                            </div>
                        </div>
                        <div class="ml-4">
                            <p class="text-2xl font-bold text-${statusColor}-600">${setupStatus.replace('_', ' ').toUpperCase()}</p>
                            <p class="text-sm text-gray-600">Current phase</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-2">Tasks Completed</h3>
                    <p class="text-3xl font-bold text-green-600">${this.overview.completed_tasks || 0}</p>
                    <p class="text-sm text-gray-600">of ${this.overview.total_tasks || 0} total</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-2">Days to Launch</h3>
                    <p class="text-3xl font-bold text-blue-600">${this.overview.days_to_launch || 0}</p>
                    <p class="text-sm text-gray-600">Estimated timeline</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-2">Specialist</h3>
                    <p class="text-xl font-bold text-purple-600">${this.overview.specialist_name || 'Not Assigned'}</p>
                    <p class="text-sm text-gray-600">Dedicated support</p>
                </div>
            </div>
        `;
    }

    renderTasksSection() {
        const tasksContainer = document.getElementById('tasks-section');
        if (!tasksContainer) return;

        const tasksByStatus = this.tasks.reduce((acc, task) => {
            acc[task.task_status] = acc[task.task_status] || [];
            acc[task.task_status].push(task);
            return acc;
        }, {});

        tasksContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Onboarding Tasks</h3>
                    <button onclick="setupDashboard.addTask()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Add Task
                    </button>
                </div>
                <div class="space-y-4">
                    ${Object.entries(tasksByStatus).map(([status, statusTasks]) => `
                        <div class="border rounded-lg p-4">
                            <h4 class="font-medium text-gray-900 mb-2">${status.replace('_', ' ').toUpperCase()} (${statusTasks.length})</h4>
                            <div class="space-y-2">
                                ${statusTasks.map(task => `
                                    <div class="flex justify-between items-center p-2 border rounded">
                                        <div class="flex-1">
                                            <p class="font-medium">${task.task_name}</p>
                                            <p class="text-sm text-gray-600">${task.task_description || ''}</p>
                                            <div class="flex items-center mt-1 space-x-4">
                                                <span class="text-xs text-blue-600">${task.task_category}</span>
                                                <span class="text-xs text-purple-600">${task.task_type}</span>
                                                <span class="text-xs text-orange-600">${task.assigned_to}</span>
                                            </div>
                                        </div>
                                        <div class="flex items-center space-x-2">
                                            ${task.priority === 'critical' ? '<span class="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Critical</span>' : ''}
                                            <button onclick="setupDashboard.updateTaskStatus(${task.id})" class="btn-secondary text-xs">
                                                Update
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderTimelineSection() {
        const timelineContainer = document.getElementById('timeline-section');
        if (!timelineContainer) return;

        timelineContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Implementation Timeline</h3>
                    <button onclick="setupDashboard.updateTimeline()" class="btn-primary">
                        <i class="fas fa-edit mr-2"></i>Update Timeline
                    </button>
                </div>
                <div class="space-y-4">
                    ${this.timeline.map((phase, index) => `
                        <div class="border rounded-lg p-4">
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <h4 class="font-medium">Phase ${phase.phase_number}: ${phase.phase_name}</h4>
                                    <p class="text-sm text-gray-600">${phase.phase_description || ''}</p>
                                </div>
                                <span class="px-2 py-1 rounded text-xs ${
                                    phase.phase_status === 'completed' ? 'bg-green-100 text-green-800' :
                                    phase.phase_status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                    phase.phase_status === 'delayed' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                }">
                                    ${phase.phase_status.replace('_', ' ').toUpperCase()}
                                </span>
                            </div>
                            <div class="flex justify-between items-center text-sm text-gray-600">
                                <span>Duration: ${phase.duration_days || 0} days</span>
                                <span>Progress: ${phase.progress_percentage || 0}%</span>
                            </div>
                            ${phase.milestones && phase.milestones.length > 0 ? `
                                <div class="mt-2 text-sm">
                                    <strong>Milestones:</strong> ${phase.milestones.map(m => m.name).join(', ')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderSpecialistsSection() {
        const specialistsContainer = document.getElementById('specialists-section');
        if (!specialistsContainer) return;

        specialistsContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Available Specialists</h3>
                    <button onclick="setupDashboard.assignSpecialist()" class="btn-primary">
                        <i class="fas fa-user-plus mr-2"></i>Assign Specialist
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${this.specialists.map(specialist => `
                        <div class="border rounded-lg p-4">
                            <div class="flex items-center mb-2">
                                ${specialist.specialist_photo_url ? `
                                    <img src="${specialist.specialist_photo_url}" alt="${specialist.specialist_name}" class="w-12 h-12 rounded-full mr-3">
                                ` : ''}
                                <div>
                                    <h4 class="font-medium">${specialist.specialist_name}</h4>
                                    <p class="text-sm text-gray-600">${specialist.current_assignments}/${specialist.max_concurrent_clients} assignments</p>
                                </div>
                            </div>
                            <div class="flex items-center justify-between text-sm">
                                <span class="text-yellow-400">
                                    ${Array(5).fill(0).map((_, i) => 
                                        `<i class="fas fa-star ${i < specialist.rating ? '' : 'text-gray-300'}"></i>`
                                    ).join('')} ${specialist.rating}
                                </span>
                                <span class="px-2 py-1 rounded ${
                                    specialist.availability_status === 'available' ? 'bg-green-100 text-green-800' :
                                    specialist.availability_status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                }">
                                    ${specialist.availability_status}
                                </span>
                            </div>
                            <div class="mt-2 text-sm text-gray-600">
                                <div>Completed setups: ${specialist.completed_setups}</div>
                                <div>Avg setup time: ${specialist.average_setup_time_hours}h</div>
                                <div>Expertise: ${(specialist.expertise_areas || []).join(', ')}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderAssignmentsSection() {
        const assignmentsContainer = document.getElementById('assignments-section');
        if (!assignmentsContainer) return;

        assignmentsContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Specialist Assignments</h3>
                    <button onclick="setupDashboard.manageAssignments()" class="btn-primary">
                        <i class="fas fa-cog mr-2"></i>Manage
                    </button>
                </div>
                <div class="space-y-3">
                    ${this.assignments.map(assignment => `
                        <div class="flex justify-between items-center p-3 border rounded">
                            <div>
                                <span class="font-medium">${assignment.specialist_name}</span>
                                <span class="text-sm text-gray-500 ml-2">${assignment.assignment_status.replace('_', ' ').toUpperCase()}</span>
                            </div>
                            <div class="text-right text-sm">
                                <div>Assigned: ${new Date(assignment.assignment_date).toLocaleDateString()}</div>
                                ${assignment.estimated_completion_date ? `
                                    <div>Due: ${new Date(assignment.estimated_completion_date).toLocaleDateString()}</div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderPackagesSection() {
        const packagesContainer = document.getElementById('packages-section');
        if (!packagesContainer) return;

        packagesContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Setup Packages</h3>
                    <button onclick="setupDashboard.updatePackage()" class="btn-primary">
                        <i class="fas fa-edit mr-2"></i>Update Package
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${this.packages.map(pkg => `
                        <div class="border rounded-lg p-4">
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <h4 class="font-medium">${pkg.package_name}</h4>
                                    <p class="text-sm text-gray-600">${pkg.package_description || ''}</p>
                                </div>
                                <span class="px-2 py-1 rounded text-xs ${
                                    pkg.package_tier === 'basic' ? 'bg-gray-100 text-gray-800' :
                                    pkg.package_tier === 'professional' ? 'bg-blue-100 text-blue-800' :
                                    pkg.package_tier === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                                    'bg-orange-100 text-orange-800'
                                }">
                                    ${pkg.package_tier.toUpperCase()}
                                </span>
                            </div>
                            <div class="text-lg font-bold text-green-600">
                                $${pkg.package_price}
                                <span class="text-sm text-gray-500">/${pkg.billing_type.replace('_', ' ')}</span>
                            </div>
                            <div class="mt-2 text-sm text-gray-600">
                                <div>Setup hours: ${pkg.setup_hours_included}</div>
                                <div>Support hours: ${pkg.support_hours_included}</div>
                                <div>Training sessions: ${pkg.training_sessions_included}</div>
                                <div>Dedicated specialist: ${pkg.dedicated_specialist ? 'Yes' : 'No'}</div>
                                <div>Success guarantee: ${pkg.success_guarantee ? 'Yes' : 'No'}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderResourcesSection() {
        const resourcesContainer = document.getElementById('resources-section');
        if (!resourcesContainer) return;

        const resourcesByCategory = this.resources.reduce((acc, resource) => {
            acc[resource.category] = acc[resource.category] || [];
            acc[resource.category].push(resource);
            return acc;
        }, {});

        resourcesContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Setup Resources</h3>
                    <button onclick="setupDashboard.addResource()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Add Resource
                    </button>
                </div>
                <div class="space-y-4">
                    ${Object.entries(resourcesByCategory).map(([category, categoryResources]) => `
                        <div class="border rounded-lg p-4">
                            <h4 class="font-medium text-gray-900 mb-2">${category.replace('_', ' ').toUpperCase()}</h4>
                            <div class="space-y-2">
                                ${categoryResources.map(resource => `
                                    <div class="flex justify-between items-center p-2 border rounded">
                                        <div>
                                            <p class="font-medium">${resource.resource_name}</p>
                                            <p class="text-sm text-gray-600">${resource.resource_description || ''}</p>
                                            <div class="flex items-center mt-1 space-x-4">
                                                <span class="text-xs text-blue-600">${resource.resource_type}</span>
                                                <span class="text-xs text-purple-600">${resource.target_audience}</span>
                                                <span class="text-xs text-green-600">${resource.language}</span>
                                            </div>
                                        </div>
                                        <div class="flex items-center space-x-2">
                                            ${resource.rating ? `
                                                <span class="text-yellow-400 text-sm">
                                                    ${Array(5).fill(0).map((_, i) => 
                                                        `<i class="fas fa-star ${i < resource.rating ? '' : 'text-gray-300'}"></i>`
                                                    ).join('')}
                                                </span>
                                            ` : ''}
                                            <button onclick="setupDashboard.downloadResource(${resource.id})" class="btn-secondary text-xs">
                                                Download
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderFeedbackSection() {
        const feedbackContainer = document.getElementById('feedback-section');
        if (!feedbackContainer) return;

        const averageRating = this.feedback.length > 0 ? 
            (this.feedback.reduce((sum, f) => sum + f.overall_rating, 0) / this.feedback.length).toFixed(1) : 0;

        feedbackContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Customer Feedback</h3>
                    <button onclick="setupDashboard.submitFeedback()" class="btn-primary">
                        <i class="fas fa-comment mr-2"></i>Submit Feedback
                    </button>
                </div>
                <div class="mb-4">
                    <div class="flex items-center">
                        <span class="text-2xl font-bold text-yellow-400 mr-2">${averageRating}</span>
                        <div class="flex text-yellow-400">
                            ${Array(5).fill(0).map((_, i) => 
                                `<i class="fas fa-star ${i < Math.floor(averageRating) ? '' : 'text-gray-300'}"></i>`
                            ).join('')}
                        </div>
                        <span class="ml-2 text-sm text-gray-600">(${this.feedback.length} reviews)</span>
                    </div>
                </div>
                <div class="space-y-3">
                    ${this.feedback.slice(0, 5).map(feedback => `
                        <div class="border rounded-lg p-3">
                            <div class="flex justify-between items-start mb-2">
                                <div class="flex items-center">
                                    <div class="flex text-yellow-400 mr-2">
                                        ${Array(5).fill(0).map((_, i) => 
                                            `<i class="fas fa-star ${i < feedback.overall_rating ? '' : 'text-gray-300'}"></i>`
                                        ).join('')}
                                    </div>
                                    <span class="font-medium">${feedback.feedback_type.replace('_', ' ').toUpperCase()}</span>
                                </div>
                                <span class="text-sm text-gray-500">${new Date(feedback.feedback_date).toLocaleDateString()}</span>
                            </div>
                            ${feedback.feedback_text ? `<p class="text-gray-700 text-sm">${feedback.feedback_text}</p>` : ''}
                            ${feedback.improvement_suggestions ? `<p class="text-gray-600 text-sm mt-1"><strong>Suggestions:</strong> ${feedback.improvement_suggestions}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderMetricsSection() {
        const metricsContainer = document.getElementById('metrics-section');
        if (!metricsContainer) return;

        metricsContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Success Metrics</h3>
                    <button onclick="setupDashboard.addMetric()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Add Metric
                    </button>
                </div>
                <div class="space-y-3">
                    ${this.metrics.map(metric => `
                        <div class="flex justify-between items-center p-3 border rounded">
                            <div>
                                <span class="font-medium">${metric.metric_type.replace('_', ' ').toUpperCase()}</span>
                                <span class="text-sm text-gray-500 ml-2">${metric.measurement_period || ''}</span>
                            </div>
                            <div class="text-right">
                                <span class="text-lg font-bold text-green-600">${metric.metric_value}${metric.metric_unit || ''}</span>
                                ${metric.baseline_value ? `
                                    <span class="text-sm text-gray-500">from ${metric.baseline_value}${metric.metric_unit || ''}</span>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const refreshBtn = document.querySelector('[onclick="refreshSetupData()"]');
        if (refreshBtn) {
            refreshBtn.onclick = () => this.refreshAllData();
        }
    }

    startProgressTracking() {
        // Update progress every 30 seconds
        setInterval(async () => {
            await this.loadSetupOverview();
            await this.loadOnboardingTasks();
        }, 30000);
    }

    async refreshAllData() {
        await Promise.all([
            this.loadSetupOverview(),
            this.loadOnboardingTasks(),
            this.loadImplementationTimeline(),
            this.loadAvailableSpecialists(),
            this.loadSpecialistAssignments(),
            this.loadSetupPackages(),
            this.loadSetupResources(),
            this.loadFeedback(),
            this.loadSuccessMetrics()
        ]);
    }

    addTask() {
        console.log('Add task functionality');
    }

    updateTaskStatus(taskId) {
        console.log('Update task status for:', taskId);
    }

    updateTimeline() {
        console.log('Update timeline functionality');
    }

    assignSpecialist() {
        console.log('Assign specialist functionality');
    }

    manageAssignments() {
        console.log('Manage assignments functionality');
    }

    updatePackage() {
        console.log('Update package functionality');
    }

    addResource() {
        console.log('Add resource functionality');
    }

    downloadResource(resourceId) {
        console.log('Download resource:', resourceId);
    }

    submitFeedback() {
        console.log('Submit feedback functionality');
    }

    addMetric() {
        console.log('Add metric functionality');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize Setup Services dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('setup-services-dashboard')) {
        window.setupDashboard = new SetupServicesDashboardManager();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SetupServicesService, SetupServicesDashboardManager };
}
