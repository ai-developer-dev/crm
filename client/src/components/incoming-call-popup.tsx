import { useState, useEffect } from 'react';
import { Phone, PhoneOff, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { IncomingCall } from '@/hooks/use-twilio-device';

interface IncomingCallPopupProps {
  call: IncomingCall;
  onAnswer: () => void;
  onReject: () => void;
}

export function IncomingCallPopup({ call, onAnswer, onReject }: IncomingCallPopupProps) {
  const [isRinging, setIsRinging] = useState(true);
  
  // Create a pulsing animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRinging(prev => !prev);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Format phone number for display
  const formatPhoneNumber = (phone: string) => {
    // Remove +1 country code if present
    const cleaned = phone.replace(/^\+1/, '');
    
    // Format as (XXX) XXX-XXXX
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    return phone;
  };

  // Get initials for avatar
  const getInitials = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.slice(-2);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className={`w-full max-w-md mx-auto transition-all duration-300 ${
        isRinging ? 'scale-105 shadow-2xl' : 'scale-100 shadow-xl'
      }`}>
        <CardContent className="p-8 text-center space-y-6">
          {/* Caller Avatar */}
          <div className="flex justify-center">
            <Avatar className={`h-24 w-24 transition-all duration-300 ${
              isRinging ? 'ring-4 ring-green-500 ring-opacity-75' : ''
            }`}>
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">
                <User className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Call Status */}
          <div className="space-y-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Incoming Call
            </Badge>
            <h2 className="text-2xl font-bold text-gray-900">
              {formatPhoneNumber(call.from)}
            </h2>
            <p className="text-gray-600">
              Calling your extension: {call.to}
            </p>
          </div>

          {/* Call Time */}
          <div className="text-sm text-gray-500">
            {call.timestamp.toLocaleTimeString()}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-6 pt-4">
            {/* Reject Button */}
            <Button
              variant="destructive"
              size="lg"
              className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg"
              onClick={onReject}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>

            {/* Answer Button */}
            <Button
              size="lg"
              className={`h-16 w-16 rounded-full shadow-lg transition-all duration-300 ${
                isRinging 
                  ? 'bg-green-500 hover:bg-green-600 scale-110' 
                  : 'bg-green-600 hover:bg-green-700 scale-100'
              }`}
              onClick={onAnswer}
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>

          {/* Keyboard Shortcuts Hint */}
          <div className="text-xs text-gray-400 border-t pt-4">
            Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> to answer 
            or <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Esc</kbd> to reject
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Active call display component
interface ActiveCallDisplayProps {
  call: IncomingCall;
  onHangUp: () => void;
}

export function ActiveCallDisplay({ call, onHangUp }: ActiveCallDisplayProps) {
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - call.timestamp.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [call.timestamp]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/^\+1/, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return (
    <div className="fixed top-4 right-4 z-40">
      <Card className="w-80 shadow-lg border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-green-500 text-white">
                  <Phone className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium text-gray-900">
                  {call.direction === 'inbound' ? formatPhoneNumber(call.from) : formatPhoneNumber(call.to)}
                </div>
                <div className="text-sm text-green-600 flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Connected - {formatDuration(callDuration)}</span>
                </div>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 w-8 rounded-full"
              onClick={onHangUp}
            >
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}