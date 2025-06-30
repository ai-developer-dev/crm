import { useState, useEffect, useCallback, useRef } from 'react';
import { Device } from '@twilio/voice-sdk';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';

export interface IncomingCall {
  callSid: string;
  from: string;
  to: string;
  direction: 'inbound' | 'outbound';
  status: 'ringing' | 'answered' | 'ended';
  timestamp: Date;
}

export interface CallState {
  isConnected: boolean;
  activeCall: IncomingCall | null;
  incomingCall: IncomingCall | null;
  callHistory: IncomingCall[];
  deviceStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export function useTwilioDevice() {
  const { user } = useAuth();
  const { toast } = useToast();
  const deviceRef = useRef<Device | null>(null);
  
  const [callState, setCallState] = useState<CallState>({
    isConnected: false,
    activeCall: null,
    incomingCall: null,
    callHistory: [],
    deviceStatus: 'disconnected',
  });

  // Initialize Twilio Device
  const initializeDevice = useCallback(async () => {
    if (!user?.extension) {
      console.error('User extension not found');
      return;
    }

    try {
      setCallState(prev => ({ ...prev, deviceStatus: 'connecting' }));
      
      // Get access token from backend
      const response = await apiRequest('POST', '/api/twilio/token', { 
        identity: user.extension 
      });
      
      const tokenData = await response.json();
      const { token } = tokenData;
      
      // Initialize Twilio Device
      const device = new Device(token, {
        logLevel: 1,
      });

      // Set up event listeners
      device.on('registered', () => {
        console.log('Twilio Device registered');
        setCallState(prev => ({ 
          ...prev, 
          deviceStatus: 'connected',
          isConnected: true 
        }));
        toast({
          title: "VoIP Connected",
          description: "Ready to receive calls",
        });
      });

      device.on('error', (error) => {
        console.error('Twilio Device error:', error);
        setCallState(prev => ({ 
          ...prev, 
          deviceStatus: 'error',
          isConnected: false 
        }));
        toast({
          title: "VoIP Error",
          description: "Failed to connect to VoIP service",
          variant: "destructive",
        });
      });

      device.on('incoming', (call) => {
        currentCallRef.current = call;
        
        const incomingCallData: IncomingCall = {
          callSid: call.parameters.CallSid || 'unknown',
          from: call.parameters.From || 'Unknown',
          to: call.parameters.To || user.extension,
          direction: 'inbound',
          status: 'ringing',
          timestamp: new Date(),
        };

        setCallState(prev => ({ 
          ...prev, 
          incomingCall: incomingCallData,
          callHistory: [incomingCallData, ...prev.callHistory]
        }));

        // Set up call event listeners
        call.on('accept', async () => {
          setCallState(prev => ({ 
            ...prev, 
            activeCall: { ...incomingCallData, status: 'answered' },
            incomingCall: null 
          }));
          
          // Update user call status in database
          if (user?.id) {
            try {
              await apiRequest('PUT', `/api/users/${user.id}/call-status`, {
                callSid: incomingCallData.callSid,
                callerNumber: incomingCallData.from,
                direction: 'inbound',
                startTime: incomingCallData.timestamp.toISOString()
              });
            } catch (error) {
              console.error('Failed to update call status:', error);
            }
          }
          
          toast({
            title: "Call Answered",
            description: `Connected to ${incomingCallData.from}`,
          });
        });

        call.on('disconnect', async () => {
          currentCallRef.current = null;
          setCallState(prev => ({ 
            ...prev, 
            activeCall: null,
            incomingCall: null 
          }));
          
          // Clear user call status in database
          if (user?.id) {
            try {
              await apiRequest('PUT', `/api/users/${user.id}/call-status`, {
                endCall: true
              });
            } catch (error) {
              console.error('Failed to clear call status:', error);
            }
          }
          
          toast({
            title: "Call Ended",
            description: "Call has been disconnected",
          });
        });

        call.on('reject', () => {
          currentCallRef.current = null;
          setCallState(prev => ({ 
            ...prev, 
            incomingCall: null 
          }));
          toast({
            title: "Call Rejected",
            description: `Rejected call from ${incomingCallData.from}`,
          });
        });
      });

      device.on('disconnect', () => {
        setCallState(prev => ({ 
          ...prev, 
          deviceStatus: 'disconnected',
          isConnected: false,
          activeCall: null,
          incomingCall: null 
        }));
      });

      // Register the device
      await device.register();
      deviceRef.current = device;

    } catch (error) {
      console.error('Failed to initialize Twilio Device:', error);
      setCallState(prev => ({ 
        ...prev, 
        deviceStatus: 'error',
        isConnected: false 
      }));
      toast({
        title: "VoIP Setup Error",
        description: "Failed to initialize VoIP connection",
        variant: "destructive",
      });
    }
  }, [user?.extension, toast]);

  // Store current call connection
  const currentCallRef = useRef<any>(null);

  // Answer incoming call
  const answerCall = useCallback(() => {
    if (currentCallRef.current) {
      currentCallRef.current.accept();
    }
  }, []);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    if (currentCallRef.current) {
      currentCallRef.current.reject();
    }
  }, []);

  // Hang up active call
  const hangUpCall = useCallback(() => {
    if (currentCallRef.current) {
      currentCallRef.current.disconnect();
    }
  }, []);

  // Make outbound call
  const makeCall = useCallback(async (phoneNumber: string) => {
    if (!deviceRef.current || !phoneNumber) return;

    try {
      const call = await deviceRef.current.connect({
        params: { To: phoneNumber }
      });

      currentCallRef.current = call;

      const outboundCallData: IncomingCall = {
        callSid: call.parameters?.CallSid || 'unknown',
        from: user?.extension || 'Unknown',
        to: phoneNumber,
        direction: 'outbound',
        status: 'ringing',
        timestamp: new Date(),
      };

      setCallState(prev => ({ 
        ...prev, 
        activeCall: outboundCallData,
        callHistory: [outboundCallData, ...prev.callHistory]
      }));

      // Set up call event listeners for outbound calls
      call.on('accept', () => {
        setCallState(prev => ({ 
          ...prev, 
          activeCall: { ...outboundCallData, status: 'answered' }
        }));
      });

      call.on('disconnect', () => {
        currentCallRef.current = null;
        setCallState(prev => ({ 
          ...prev, 
          activeCall: null
        }));
      });

    } catch (error) {
      console.error('Failed to make outbound call:', error);
      toast({
        title: "Call Failed",
        description: "Failed to connect outbound call",
        variant: "destructive",
      });
    }
  }, [user?.extension, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (deviceRef.current) {
        deviceRef.current.destroy();
        deviceRef.current = null;
      }
    };
  }, []);

  // Auto-initialize device when user is available
  useEffect(() => {
    if (user?.extension && callState.deviceStatus === 'disconnected') {
      initializeDevice();
    }
  }, [user?.extension, callState.deviceStatus, initializeDevice]);

  return {
    callState,
    answerCall,
    rejectCall,
    hangUpCall,
    makeCall,
    initializeDevice,
  };
}