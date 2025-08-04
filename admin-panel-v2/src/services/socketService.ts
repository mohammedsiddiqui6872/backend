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

class SocketService {
  private socket: Socket | null = null;
  private listeners: { [key: string]: Function[] } = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(tenantId: string, token: string) {
    if (this.socket?.connected) {
      return;
    }

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
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners = {};
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
      
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
      }
    });

    // Assignment events
    this.socket.on('assignment:created', (data) => {
      console.log('Assignment created:', data);
      this.emit('assignment:created', data);
      toast.success(`Table ${data.assignment.tableNumber} assigned to ${data.assignment.waiterName}`);
    });

    this.socket.on('assignment:ended', (data) => {
      console.log('Assignment ended:', data);
      this.emit('assignment:ended', data);
      toast.info(`Assignment ended for table ${data.tableNumber}`);
    });

    this.socket.on('assignment:bulk-created', (data) => {
      console.log('Bulk assignments created:', data);
      this.emit('assignment:bulk-created', data);
      toast.success(`${data.assignments.length} tables assigned to ${data.waiterName}`);
    });

    this.socket.on('assignment:rotation', (data) => {
      console.log('Assignments rotated:', data);
      this.emit('assignment:rotation', data);
      toast.info(`${data.rotations.length} assignments rotated`);
    });

    this.socket.on('assignment:emergency-reassign', (data) => {
      console.log('Emergency reassignment:', data);
      this.emit('assignment:emergency-reassign', data);
      toast.warning(`${data.reassignedCount} tables reassigned from ${data.fromWaiterName} to ${data.toWaiterName}`);
    });

    this.socket.on('assignment:current-list', (data) => {
      console.log('Current assignments received:', data);
      this.emit('assignment:current-list', data);
    });

    this.socket.on('assignment:waiter-loads', (data) => {
      console.log('Waiter loads received:', data);
      this.emit('assignment:waiter-loads', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'Socket error occurred');
    });
  }

  // Emit methods
  requestAssignmentUpdate() {
    if (!this.socket?.connected) return;
    this.socket.emit('assignment:request-update');
  }

  requestWaiterLoads() {
    if (!this.socket?.connected) return;
    this.socket.emit('assignment:request-loads');
  }

  createAssignment(tableId: string, waiterId: string, role: 'primary' | 'assistant' = 'primary') {
    if (!this.socket?.connected) {
      toast.error('Not connected to server');
      return;
    }
    this.socket.emit('assignment:create', { tableId, waiterId, role });
  }

  endAssignment(assignmentId: string) {
    if (!this.socket?.connected) {
      toast.error('Not connected to server');
      return;
    }
    this.socket.emit('assignment:end', { assignmentId });
  }

  // Event subscription
  on<K extends keyof AssignmentSocketEvents>(
    event: K, 
    callback: AssignmentSocketEvents[K]
  ) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.listeners[event].indexOf(callback);
      if (index > -1) {
        this.listeners[event].splice(index, 1);
      }
    };
  }

  private emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;