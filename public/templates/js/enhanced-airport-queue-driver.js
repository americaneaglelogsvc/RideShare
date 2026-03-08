// Enhanced Driver App JavaScript for Airport Queue System
// Multi-tenant queue management with geofence detection and enroute functionality

class EnhancedAirportQueueDriver {
  constructor() {
    this.currentTenantId = null;
    this.driverId = null;
    this.currentLocation = null;
    this.locationTrackingInterval = null;
    this.queuePositions = new Map(); // airportCode -> queue info
    this.enrouteStatus = new Map(); // airportCode -> enroute info
    this.websocket = null;
    
    this.init();
  }

  async init() {
    // Get tenant context from URL or storage
    this.currentTenantId = this.getCurrentTenantId();
    this.driverId = this.getDriverId();
    
    if (!this.currentTenantId || !this.driverId) {
      console.error('Missing tenant ID or driver ID');
      return;
    }

    // Initialize WebSocket connection
    this.initWebSocket();
    
    // Start location tracking
    this.startLocationTracking();
    
    // Load current queue positions
    await this.loadMultiTenantQueuePositions();
    
    // Setup UI event listeners
    this.setupEventListeners();
    
    console.log('Enhanced Airport Queue Driver initialized');
  }

  getCurrentTenantId() {
    // Extract from URL path or use stored value
    const pathParts = window.location.pathname.split('/');
    const tenantIndex = pathParts.indexOf('tenant');
    if (tenantIndex !== -1 && pathParts[tenantIndex + 1]) {
      return pathParts[tenantIndex + 1];
    }
    return localStorage.getItem('currentTenantId');
  }

  getDriverId() {
    return localStorage.getItem('driverId') || sessionStorage.getItem('driverId');
  }

  initWebSocket() {
    const wsUrl = `ws://localhost:3000/ws/driver/${this.currentTenantId}/${this.driverId}`;
    
    this.websocket = new WebSocket(wsUrl);
    
    this.websocket.onopen = () => {
      console.log('WebSocket connected');
      this.showNotification('Connected to queue system', 'success');
    };
    
    this.websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    };
    
    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.websocket.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 5 seconds
      setTimeout(() => this.initWebSocket(), 5000);
    };
  }

  handleWebSocketMessage(data) {
    switch (data.type) {
      case 'queue_update':
        this.updateQueuePosition(data.airportCode, data.position);
        break;
      case 'zone_transition':
        this.handleZoneTransition(data);
        break;
      case 'ride_offer':
        this.handleRideOffer(data);
        break;
      case 'queue_call':
        this.handleQueueCall(data);
        break;
      default:
        console.log('Unknown WebSocket message:', data);
    }
  }

  startLocationTracking() {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    // Request high-accuracy location updates every 30 seconds
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    };

    this.locationTrackingInterval = navigator.geolocation.watchPosition(
      (position) => this.handleLocationUpdate(position),
      (error) => this.handleLocationError(error),
      options
    );
  }

  async handleLocationUpdate(position) {
    const { latitude, longitude, heading, speed } = position.coords;
    this.currentLocation = { lat: latitude, lng: longitude, heading, speed };

    // Update location with zone detection
    try {
      const response = await fetch('/api/airport-queue/update-zone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': this.currentTenantId
        },
        body: JSON.stringify({
          tenantId: this.currentTenantId,
          driverId: this.driverId,
          airportCode: 'ORD', // Could be made dynamic
          lat: latitude,
          lng: longitude
        })
      });

      const result = await response.json();
      
      if (result.zoneChanged) {
        this.handleZoneTransition({
          airportCode: 'ORD',
          fromZone: result.previousZone,
          toZone: result.currentZone
        });
      }
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  }

  handleLocationError(error) {
    console.error('Location error:', error);
    this.showNotification('Location tracking error', 'error');
  }

  async loadMultiTenantQueuePositions() {
    try {
      const response = await fetch(`/api/airport-queue/multi-tenant-positions/${this.driverId}`, {
        headers: {
          'X-Tenant-ID': this.currentTenantId
        }
      });

      const positions = await response.json();
      
      positions.forEach(pos => {
        this.queuePositions.set(pos.airportCode, pos);
        this.updateQueueUI(pos.airportCode, pos);
      });

    } catch (error) {
      console.error('Failed to load queue positions:', error);
    }
  }

  async markEnrouteToAirport(airportCode, etaMinutes) {
    try {
      const response = await fetch('/api/airport-queue/enroute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': this.currentTenantId
        },
        body: JSON.stringify({
          tenantId: this.currentTenantId,
          driverId: this.driverId,
          airportCode,
          etaMinutes
        })
      });

      const result = await response.json();
      
      this.enrouteStatus.set(airportCode, {
        etaMinutes,
        markedAt: new Date()
      });

      this.showNotification(`Marked enroute to ${airportCode}, ETA: ${etaMinutes} minutes`, 'success');
      this.updateEnrouteUI(airportCode, etaMinutes);

    } catch (error) {
      console.error('Failed to mark enroute:', error);
      this.showNotification('Failed to mark enroute', 'error');
    }
  }

  handleZoneTransition(data) {
    const { airportCode, fromZone, toZone } = data;
    
    this.showNotification(`Zone update: ${fromZone} → ${toZone} at ${airportCode}`, 'info');
    
    // Update UI based on new zone
    this.updateZoneUI(airportCode, toZone);
    
    // If entering active zone, show queue position
    if (toZone === 'active') {
      this.showNotification(`Entered active queue at ${airportCode}`, 'success');
    }
  }

  updateQueuePosition(airportCode, position) {
    const queueInfo = this.queuePositions.get(airportCode);
    if (queueInfo) {
      queueInfo.position = position;
      queueInfo.lastUpdate = new Date();
      this.updateQueueUI(airportCode, queueInfo);
    }
  }

  updateQueueUI(airportCode, queueInfo) {
    const queueElement = document.getElementById(`queue-${airportCode}`);
    if (!queueElement) return;

    const positionElement = queueElement.querySelector('.position');
    const statusElement = queueElement.querySelector('.status');
    const waitTimeElement = queueElement.querySelector('.wait-time');

    if (positionElement) {
      positionElement.textContent = queueInfo.position || 'Not in queue';
    }
    
    if (statusElement) {
      statusElement.textContent = queueInfo.zoneStatus || 'Unknown';
      statusElement.className = `status ${queueInfo.zoneStatus}`;
    }
    
    if (waitTimeElement && queueInfo.estimatedWaitMinutes) {
      waitTimeElement.textContent = `~${queueInfo.estimatedWaitMinutes} min`;
    }
  }

  updateEnrouteUI(airportCode, etaMinutes) {
    const enrouteElement = document.getElementById(`enroute-${airportCode}`);
    if (!enrouteElement) return;

    const etaElement = enrouteElement.querySelector('.eta');
    if (etaElement) {
      etaElement.textContent = `${etaMinutes} minutes`;
    }

    enrouteElement.classList.add('active');
  }

  updateZoneUI(airportCode, zone) {
    const zoneElement = document.getElementById(`zone-${airportCode}`);
    if (!zoneElement) return;

    zoneElement.textContent = zone;
    zoneElement.className = `zone ${zone}`;
  }

  handleRideOffer(data) {
    // Show ride offer modal or notification
    this.showRideOfferModal(data);
  }

  handleQueueCall(data) {
    const { airportCode, position } = data;
    this.showNotification(`You're being called at ${airportCode}! Position: ${position}`, 'warning');
    
    // Play sound or vibrate
    this.playNotificationSound();
    
    // Show call action buttons
    this.showCallActions(airportCode);
  }

  showRideOfferModal(offerData) {
    // Create and show modal for ride offer
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Ride Offer</h3>
        <p>Pickup: ${offerData.pickupAddress}</p>
        <p>Dropoff: ${offerData.dropoffAddress}</p>
        <p>Fare: $${offerData.estimatedFare}</p>
        <div class="modal-actions">
          <button onclick="this.acceptRide('${offerData.tripId}')" class="btn-accept">Accept</button>
          <button onclick="this.declineRide('${offerData.tripId}')" class="btn-decline">Decline</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (modal.parentNode) {
        modal.remove();
      }
    }, 30000);
  }

  showCallActions(airportCode) {
    const callElement = document.getElementById(`call-${airportCode}`);
    if (callElement) {
      callElement.classList.add('active');
      callElement.innerHTML = `
        <div class="call-actions">
          <button onclick="this.acceptCall('${airportCode}')" class="btn-accept">Accept</button>
          <button onclick="this.declineCall('${airportCode}')" class="btn-decline">No Show</button>
        </div>
      `;
    }
  }

  async acceptRide(tripId) {
    // Remove modal
    const modal = document.querySelector('.modal.active');
    if (modal) modal.remove();

    try {
      const response = await fetch(`/api/trips/${tripId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': this.currentTenantId
        }
      });

      if (response.ok) {
        this.showNotification('Ride accepted!', 'success');
      } else {
        this.showNotification('Failed to accept ride', 'error');
      }
    } catch (error) {
      console.error('Failed to accept ride:', error);
    }
  }

  async declineRide(tripId) {
    const modal = document.querySelector('.modal.active');
    if (modal) modal.remove();

    try {
      await fetch(`/api/trips/${tripId}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': this.currentTenantId
        }
      });
    } catch (error) {
      console.error('Failed to decline ride:', error);
    }
  }

  async acceptCall(airportCode) {
    // Accept queue call
    this.showNotification('Call accepted!', 'success');
    
    // Remove call actions
    const callElement = document.getElementById(`call-${airportCode}`);
    if (callElement) {
      callElement.classList.remove('active');
      callElement.innerHTML = '';
    }
  }

  async declineCall(airportCode) {
    // Mark as no-show
    try {
      await fetch(`/api/airport-queue/no-show/${airportCode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': this.currentTenantId
        }
      });
    } catch (error) {
      console.error('Failed to mark no-show:', error);
    }
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to notifications container
    const container = document.getElementById('notifications') || document.body;
    container.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  playNotificationSound() {
    // Play notification sound if available
    const audio = new Audio('/sounds/notification.mp3');
    audio.play().catch(e => console.log('Could not play sound:', e));
  }

  setupEventListeners() {
    // Enroute buttons
    document.querySelectorAll('.btn-enroute').forEach(button => {
      button.addEventListener('click', (e) => {
        const airportCode = e.target.dataset.airport;
        const etaInput = document.getElementById(`eta-${airportCode}`);
        const etaMinutes = parseInt(etaInput.value);
        
        if (etaMinutes > 0) {
          this.markEnrouteToAirport(airportCode, etaMinutes);
        } else {
          this.showNotification('Please enter a valid ETA', 'error');
        }
      });
    });

    // Refresh button
    const refreshButton = document.getElementById('refresh-queues');
    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        this.loadMultiTenantQueuePositions();
      });
    }

    // Location permission button
    const locationButton = document.getElementById('enable-location');
    if (locationButton) {
      locationButton.addEventListener('click', () => {
        this.requestLocationPermission();
      });
    }
  }

  async requestLocationPermission() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.showNotification('Location access granted', 'success');
          this.handleLocationUpdate(position);
        },
        (error) => {
          this.showNotification('Location access denied', 'error');
        }
      );
    }
  }

  // Cleanup method
  destroy() {
    if (this.locationTrackingInterval) {
      navigator.geolocation.clearWatch(this.locationTrackingInterval);
    }
    
    if (this.websocket) {
      this.websocket.close();
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.enhancedQueueDriver = new EnhancedAirportQueueDriver();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.enhancedQueueDriver) {
    window.enhancedQueueDriver.destroy();
  }
});
