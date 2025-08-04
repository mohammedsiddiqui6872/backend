import { io, Socket } from 'socket.io-client';
import { StaffAssignment, WaiterLoad } from '../types/staffAssignment';
import toast from 'react-hot-toast';

interface AssignmentSocketEvents {
  'assignment:created': (data: { assignment: StaffAssignment }) => void;
  'assignment:ended': (data: { assignmentId: string; tableNumber: string; waiterId: string }) => void;
  'assignment:bulk-created': (data: { assignments: StaffAssignment[]; waiterId: string; waiterName: string }) => void;
  'assignment:rotation': (data: { rotations: StaffAssignment[]; sectionId?: string }) => void;
  'assignment:emergency-reassign': (data: { 
    fromWaiterId: string; 
    fromWaiterName: string; 
    toWaiterId: string; 
    toWaiterName: string; 
    reassignedCount: number 
  }) => void;
  'assignment:current-list': (data: { assignments: StaffAssignment[]; timestamp: Date }) => void;
  'assignment:waiter-loads': (data: { loads: WaiterLoad[]; timestamp: Date }) => void;
}

class EnhancedSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private eventQueue: Array<{ event: string; data: any }> = [];
  private isProcessingQueue = false;

  connect(tenantId: string, token: string) {
    // Clean up existing connection
    this.cleanup();

    const socketUrl = process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_URL || '';
    
    this.socket = io(socketUrl, {
      auth: {
        token,
        tenantId
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts
    });

    this.setupEventHandlers();
  }

  disconnect() {
    this.cleanup();
  }

  private cleanup() {
    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Remove all socket event listeners
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    // Clear local listeners
    this.listeners.clear();
    
    // Clear event queue
    this.eventQueue = [];
    this.isProcessingQueue = false;
    
    // Reset reconnect attempts
    this.reconnectAttempts = 0;
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
      
      // Process queued events
      this.processEventQueue();
      
      // Request current assignments on connect
      this.requestAssignmentUpdate();
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        toast.error('Unable to connect to real-time updates');
        // Implement exponential backoff
        this.reconnectTimer = setTimeout(() => {
          this.reconnectAttempts = 0;
          this.socket?.connect();
        }, 30000); // Retry after 30 seconds
      }
    });

    // Assignment events - bind with arrow functions to preserve context
    const eventHandlers: Array<[string, (data: any) => void]> = [
      ['assignment:created', (data) => {
        console.log('Assignment created:', data);
        this.emit('assignment:created', data);
        toast.success(`Table ${data.assignment.tableNumber} assigned to ${data.assignment.waiterName}`);
      }],
      ['assignment:ended', (data) => {
        console.log('Assignment ended:', data);
        this.emit('assignment:ended', data);
        toast(`Assignment ended for table ${data.tableNumber}`, { icon: 'ℹ️' });
      }],
      ['assignment:bulk-created', (data) => {
        console.log('Bulk assignments created:', data);
        this.emit('assignment:bulk-created', data);
        toast.success(`${data.assignments.length} tables assigned to ${data.waiterName}`);
      }],
      ['assignment:rotation', (data) => {
        console.log('Assignments rotated:', data);
        this.emit('assignment:rotation', data);
        toast(`${data.rotations.length} assignments rotated`, { icon: 'ℹ️' });
      }],
      ['assignment:emergency-reassign', (data) => {
        console.log('Emergency reassignment:', data);
        this.emit('assignment:emergency-reassign', data);
        toast(`${data.reassignedCount} tables reassigned from ${data.fromWaiterName} to ${data.toWaiterName}`, { icon: '⚠️' });
      }],
      ['assignment:current-list', (data) => {
        console.log('Current assignments received:', data);
        this.emit('assignment:current-list', data);
      }],
      ['assignment:waiter-loads', (data) => {
        console.log('Waiter loads received:', data);
        this.emit('assignment:waiter-loads', data);
      }],
      ['error', (error) => {
        console.error('Socket error:', error);
        toast.error(error.message || 'Socket error occurred');
      }]
    ];

    // Register all event handlers
    eventHandlers.forEach(([event, handler]) => {
      this.socket!.on(event, handler);
    });
  }

  // Event queue for offline support
  private queueEvent(event: string, data: any) {
    this.eventQueue.push({ event, data });
    // Limit queue size to prevent memory issues
    if (this.eventQueue.length > 100) {
      this.eventQueue.shift();
    }
  }

  private async processEventQueue() {
    if (this.isProcessingQueue || this.eventQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    while (this.eventQueue.length > 0 && this.socket?.connected) {
      const { event, data } = this.eventQueue.shift()!;
      this.socket.emit(event, data);
      // Add small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.isProcessingQueue = false;
  }

  // Emit methods with queueing support
  requestAssignmentUpdate() {
    if (!this.socket?.connected) {
      this.queueEvent('assignment:request-update', {});
      return;
    }
    this.socket.emit('assignment:request-update');
  }

  requestWaiterLoads() {
    if (!this.socket?.connected) {
      this.queueEvent('assignment:request-loads', {});
      return;
    }
    this.socket.emit('assignment:request-loads');
  }

  createAssignment(tableId: string, waiterId: string, role: 'primary' | 'assistant' = 'primary') {
    const data = { tableId, waiterId, role };
    
    if (!this.socket?.connected) {
      toast.error('Not connected to server - assignment will be sent when connection is restored');
      this.queueEvent('assignment:create', data);
      return;
    }
    
    this.socket.emit('assignment:create', data);
  }

  endAssignment(assignmentId: string) {
    const data = { assignmentId };
    
    if (!this.socket?.connected) {
      toast.error('Not connected to server - action will be sent when connection is restored');
      this.queueEvent('assignment:end', data);
      return;
    }
    
    this.socket.emit('assignment:end', data);
  }

  // Enhanced event subscription with automatic cleanup
  on<K extends keyof AssignmentSocketEvents>(
    event: K, 
    callback: AssignmentSocketEvents[K]
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      // Use forEach to prevent issues if a listener modifies the set
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in socket event listener for ${event}:`, error);
        }
      });
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // Get connection stats
  getConnectionStats() {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      queuedEvents: this.eventQueue.length,
      activeListeners: Array.from(this.listeners.entries()).map(([event, listeners]) => ({
        event,
        count: listeners.size
      }))
    };
  }
}

// Create singleton instance
const enhancedSocketService = new EnhancedSocketService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    enhancedSocketService.disconnect();
  });
}

export default enhancedSocketService;