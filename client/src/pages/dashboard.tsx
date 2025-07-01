import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Phone, User, Shield, Wifi, WifiOff, PhoneOff } from "lucide-react";
import { useTwilioDevice } from "@/hooks/use-twilio-device";
import { IncomingCallPopup } from "@/components/incoming-call-popup";
import { useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface DashboardUser {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  extension: string;
  userType: 'admin' | 'manager' | 'user';
  isActive: boolean;
  createdAt: string;
  currentCallSid?: string | null;
  currentCallerNumber?: string | null;
  currentCallDirection?: 'inbound' | 'outbound' | null;
  currentCallStartTime?: string | null;
}

export default function Dashboard() {
  const { data: users = [], isLoading } = useQuery<DashboardUser[]>({
    queryKey: ['/api/users'],
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  // Initialize VoIP functionality
  const { callState, answerCall, rejectCall, hangUpCall } = useTwilioDevice();
  
  // Initialize WebSocket for real-time updates
  const { lastMessage, isConnected } = useWebSocket();

  // Handle keyboard shortcuts for call management
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (callState.incomingCall) {
        if (event.key === 'Enter') {
          event.preventDefault();
          answerCall();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          rejectCall();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [callState.incomingCall, answerCall, rejectCall]);

  // Handle WebSocket call events
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'user_call_started':
          // Refresh user list to show call status
          queryClient.invalidateQueries({ queryKey: ['/api/users'] });
          toast({
            title: "Call Started",
            description: lastMessage.message,
          });
          break;
        
        case 'user_call_ended':
          // Refresh user list to clear call status
          queryClient.invalidateQueries({ queryKey: ['/api/users'] });
          toast({
            title: "Call Ended",
            description: lastMessage.message,
          });
          break;
          
        case 'call_answered':
          // Another user answered the call - dismiss incoming call popup
          if (callState.incomingCall && 
              callState.incomingCall.callSid === lastMessage.callSid &&
              lastMessage.answeredByUserId !== currentUser?.id) {
            console.log(`Call answered by ${lastMessage.answeredByName}, dismissing incoming call popup`);
            rejectCall(); // Dismiss the popup since another user answered
            
            toast({
              title: "Call Answered",
              description: `${lastMessage.answeredByName} answered the call`,
            });
          }
          // Refresh user list to show call status
          queryClient.invalidateQueries({ queryKey: ['/api/users'] });
          break;
      }
    }
  }, [lastMessage, queryClient, toast, callState.incomingCall, currentUser?.id, rejectCall]);

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'admin':
        return Crown;
      case 'manager':
        return Shield;
      case 'user':
        return User;
      default:
        return User;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format phone number for display
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/^\+1/, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Calculate call duration
  const getCallDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const duration = Math.floor((now.getTime() - start.getTime()) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Sort users by ID to maintain consistent card positions
  const sortedUsers = [...users].sort((a, b) => a.id - b.id);

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
              <p className="text-slate-600">Welcome back! Here's your team overview.</p>
            </div>
            <div className="flex items-center space-x-2">
              {callState.isConnected ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <Wifi className="h-4 w-4" />
                  <span className="text-sm">VoIP Connected</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-gray-400">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-sm">VoIP Offline</span>
                </div>
              )}
            </div>
          </div>
        </div>



        {/* User Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              System Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No users found</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedUsers.map((user) => {
                  const IconComponent = getUserTypeIcon(user.userType);
                  return (
                    <Card key={user.id} className="border-2 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center">
                            <span className="text-slate-600 text-sm font-medium">
                              {getInitials(user.fullName)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-slate-800 truncate">
                              {user.fullName}
                            </h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge className={getUserTypeColor(user.userType)}>
                                <IconComponent className="h-3 w-3 mr-1" />
                                {user.userType.charAt(0).toUpperCase() + user.userType.slice(1)}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                              <div className="flex items-center text-sm text-slate-500">
                                <Phone className="h-3 w-3 mr-1" />
                                Ext: {user.extension}
                              </div>
                              <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            
                            {/* Call Status Display */}
                            {user.currentCallSid && user.currentCallerNumber && user.currentCallStartTime && (
                              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm font-medium text-green-800">
                                      On call with {formatPhoneNumber(user.currentCallerNumber)}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Badge className="bg-green-100 text-green-800 text-xs">
                                      {getCallDuration(user.currentCallStartTime)}
                                    </Badge>
                                    {/* Show hangup button only for current user's own card */}
                                    {currentUser?.id === user.id && (
                                      <button
                                        onClick={() => hangUpCall()}
                                        className="flex items-center justify-center w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors duration-200"
                                        title="Hang up call"
                                      >
                                        <PhoneOff className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs text-green-600 mt-1">
                                  {user.currentCallDirection === 'inbound' ? 'Incoming' : 'Outgoing'} call
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* VoIP Call Components */}
      {callState.incomingCall && (
        <IncomingCallPopup
          call={callState.incomingCall}
          onAnswer={answerCall}
          onReject={rejectCall}
        />
      )}


    </DashboardLayout>
  );
}
